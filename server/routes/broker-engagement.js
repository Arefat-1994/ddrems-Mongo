const express = require("express");
const router = express.Router();
const db = require("../config/db");
const crypto = require("crypto");
const { generateRentalSchedule } = require("./rental-payments");

// ============================================================================
// HELPER: Log engagement history
// ============================================================================
async function logHistory(engagementId, action, userId, userRole, prevStatus, newStatus, notes, metadata) {
  await db.query(
    `INSERT INTO broker_engagement_history
       (engagement_id, action, action_by_id, action_by_role, previous_status, new_status, notes, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [engagementId, action, userId, userRole, prevStatus, newStatus, notes, metadata ? JSON.stringify(metadata) : null]
  );
}

// HELPER: Add system message to engagement thread
async function systemMessage(engagementId, message, metadata) {
  await db.query(
    `INSERT INTO broker_engagement_messages
       (engagement_id, sender_id, sender_role, message_type, message, metadata)
     VALUES (?, NULL, 'system', 'system', ?, ?)`,
    [engagementId, message, metadata ? JSON.stringify(metadata) : null]
  );
}

// HELPER: Add a private system message (hidden from opposing party)
async function systemMessagePrivate(engagementId, message, metadata) {
  await db.query(
    `INSERT INTO broker_engagement_messages
       (engagement_id, sender_id, sender_role, message_type, message, metadata)
     VALUES (?, NULL, 'system', 'advice', ?, ?)`,
    [engagementId, message, metadata ? JSON.stringify(metadata) : null]
  );
}

// HELPER: Notify user
async function notifyUser(userId, title, message, type) {
  await db.query(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [userId, title, message, type || "info"]
  );
}

// ============================================================================
// GET /api/broker-engagement/available-brokers
// Buyer fetches list of approved brokers
// ============================================================================
router.get("/available-brokers", async (req, res) => {
  try {
    const [brokers] = await db.query(`
      SELECT u.id, u.name, u.email, u.phone,
             bp.license_number, bp.profile_photo, bp.address,
             bp.profile_status
      FROM users u
      LEFT JOIN broker_profiles bp ON u.id = bp.user_id
      WHERE u.role = 'broker' AND u.status = 'active'
      ORDER BY u.name ASC
    `);
    res.json({ success: true, brokers });
  } catch (error) {
    console.error("Error fetching available brokers:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// POST /api/broker-engagement/hire
// Buyer hires a broker for a property
// ============================================================================
router.post("/hire", async (req, res) => {
  try {
    const { buyer_id, broker_id, property_id, starting_offer, buyer_message,
      engagement_type, rental_duration_months, payment_schedule, security_deposit,
      buyer_commission_offer, system_fee_payer
    } = req.body;

    if (!buyer_id || !broker_id || !property_id) {
      return res.status(400).json({ success: false, message: "Buyer ID, Broker ID, and Property ID are required" });
    }

    // Get property details (owner)
    const [property] = await db.query("SELECT owner_id, price, listing_type FROM properties WHERE id = ?", [property_id]);
    if (property.length === 0) {
      return res.status(404).json({ success: false, message: "Property not found" });
    }
    const owner_id = property[0].owner_id;
    if (!owner_id) {
      return res.status(400).json({ success: false, message: "Property has no owner assigned" });
    }
    
    // Resolve type
    const resolvedType = engagement_type || property[0].listing_type || 'sale';

    // Check for existing active engagement
    const [existing] = await db.query(
      `SELECT id FROM broker_engagements
       WHERE buyer_id = ? AND property_id = ? AND status NOT IN ('completed', 'cancelled', 'broker_declined')`,
      [buyer_id, property_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "You already have an active broker engagement for this property" });
    }

    // Create engagement with commission offer
    const offer = starting_offer || property[0].price;
    const commissionOffer = buyer_commission_offer || 2;
    const feePayer = system_fee_payer || 'buyer';
    const [result] = await db.query(
      `INSERT INTO broker_engagements
         (buyer_id, broker_id, property_id, owner_id, status, starting_offer, current_offer, buyer_message,
          engagement_type, rental_duration_months, payment_schedule, security_deposit,
          buyer_commission_offer, commission_negotiation_status, system_fee_payer)
       VALUES (?, ?, ?, ?, 'pending_broker_acceptance', ?, ?, ?, ?, ?, ?, ?, ?, 'buyer_offered', ?)`,
      [buyer_id, broker_id, property_id, owner_id, offer, offer, buyer_message || null,
       resolvedType,
       resolvedType === 'rent' ? (rental_duration_months || 12) : null,
       resolvedType === 'rent' ? (payment_schedule || 'monthly') : null,
       resolvedType === 'rent' ? (security_deposit || null) : null,
       commissionOffer, feePayer
      ]
    );

    const engId = result.insertId;

    // Log history
    await logHistory(engId, "engagement_created", buyer_id, "buyer", null, "pending_broker_acceptance",
      `Step 1/12: Buyer hired broker with ${commissionOffer}% commission offer`, { starting_offer: offer, commission_offer: commissionOffer });

    // System message (private to buyer/broker)
    await systemMessagePrivate(engId, `📋 Step 1/12: Buyer has requested broker representation.\n• Starting offer: ${Number(offer).toLocaleString()} ETB\n• Proposed broker commission: ${commissionOffer}%\n• System fee (5%) paid by: ${feePayer}`);

    // If buyer sent a message, record it (as advice so owner doesn't see it)
    if (buyer_message) {
      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message)
         VALUES (?, ?, 'buyer', 'advice', ?)`,
        [engId, buyer_id, buyer_message]
      );
    }

    // Notify broker
    const offerType = resolvedType === 'rent' ? 'Monthly Rent' : 'Offer Price';
    await notifyUser(broker_id, "🤝 Step 1/12: New Broker Engagement Request",
      `A buyer has requested you to represent them. ${offerType}: ${Number(offer).toLocaleString()} ETB. Commission offer: ${commissionOffer}%. Please review and accept/decline.`, "info");

    res.json({
      success: true,
      message: "Broker engagement request created successfully",
      engagement_id: engId,
      status: "pending_broker_acceptance"
    });
  } catch (error) {
    console.error("Error creating broker engagement:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/broker-accept
// Broker accepts or declines representation
// ============================================================================
router.put("/:id/broker-accept", async (req, res) => {
  try {
    const { id } = req.params;
    const { broker_id, decision, decline_reason } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "pending_broker_acceptance") {
      return res.status(400).json({ success: false, message: "Engagement is not pending broker acceptance" });
    }
    if (eng.broker_id !== broker_id) {
      return res.status(403).json({ success: false, message: "You are not the assigned broker" });
    }

    if (decision === "accept") {
      // Move to commission negotiation phase instead of directly to broker_negotiating
      await db.query(
        `UPDATE broker_engagements SET status = 'commission_negotiation', broker_accepted_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [id]
      );
      await logHistory(id, "broker_accepted", broker_id, "broker", "pending_broker_acceptance", "commission_negotiation", "Step 2/12: Broker accepted — commission negotiation starts");
      await systemMessage(id, "📋 Step 2/12: Broker has accepted the engagement. Commission negotiation is now in progress.");
      await notifyUser(eng.buyer_id, "✅ Step 2/12: Broker Accepted", `Your broker has accepted. Now negotiate the commission. Your offer: ${eng.buyer_commission_offer || 2}%. Next: Step 3 — Commission Agreement.`, "success");

      res.json({ success: true, message: "Engagement accepted. Commission negotiation started.", status: "commission_negotiation" });
    } else {
      await db.query(
        `UPDATE broker_engagements SET status = 'broker_declined', broker_decline_reason = ?, updated_at = NOW() WHERE id = ?`,
        [decline_reason || null, id]
      );
      await logHistory(id, "broker_declined", broker_id, "broker", "pending_broker_acceptance", "broker_declined",
        decline_reason || "Broker declined representation");
      await systemMessagePrivate(id, `Broker has declined the engagement.${decline_reason ? " Reason: " + decline_reason : ""}`);
      await notifyUser(eng.buyer_id, "❌ Step 2/12: Broker Declined", `Your broker has declined representation.${decline_reason ? " Reason: " + decline_reason : ""}`, "error");

      res.json({ success: true, message: "Engagement declined.", status: "broker_declined" });
    }
  } catch (error) {
    console.error("Error processing broker acceptance:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/commission-respond
// Buyer or Broker responds to commission negotiation
// ============================================================================
router.put("/:id/commission-respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, user_role, action, counter_commission, system_fee_payer } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "commission_negotiation") {
      return res.status(400).json({ success: false, message: "Not in commission negotiation phase. Current: " + eng.status });
    }

    // Validate the user is buyer or broker
    const isBuyerUser = eng.buyer_id === user_id;
    const isBrokerUser = eng.broker_id === user_id;
    if (!isBuyerUser && !isBrokerUser) {
      return res.status(403).json({ success: false, message: "You are not a party to this commission negotiation" });
    }

    if (!['accept_commission', 'reject_commission', 'counter_commission'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'accept_commission', 'reject_commission', or 'counter_commission'" });
    }

    const currentBuyerOffer = Number(eng.buyer_commission_offer || 2);
    const currentBrokerCounter = Number(eng.broker_commission_counter || 0);
    const commStatus = eng.commission_negotiation_status;

    if (action === 'accept_commission') {
      // Determine the agreed commission
      let agreedPct;
      if (isBrokerUser) {
        // Broker accepts buyer's offer
        agreedPct = currentBuyerOffer;
      } else {
        // Buyer accepts broker's counter
        agreedPct = currentBrokerCounter || currentBuyerOffer;
      }

      const feePayer = system_fee_payer || eng.system_fee_payer || 'buyer';

      await db.query(
        `UPDATE broker_engagements SET 
           agreed_commission_pct = ?, commission_negotiation_status = 'agreed',
           commission_percentage = ?, system_fee_payer = ?,
           status = 'broker_negotiating', updated_at = NOW()
         WHERE id = ?`,
        [agreedPct, agreedPct, feePayer, id]
      );

      const roleLabel = isBrokerUser ? 'Broker' : 'Buyer';
      await logHistory(id, "commission_agreed", user_id, user_role, "commission_negotiation", "broker_negotiating",
        `Step 3/12: Commission agreed at ${agreedPct}%. System fee (5%) paid by ${feePayer}.`,
        { agreed_commission_pct: agreedPct, system_fee_payer: feePayer });
      await systemMessage(id, `💰 Step 3/12: Commission Deal Agreed!\n• Broker Commission: ${agreedPct}%\n• System Fee: 5% (paid by ${feePayer})\n• ${roleLabel} accepted the offer. Proceeding to property negotiation.`);

      // Notify both parties
      await notifyUser(eng.buyer_id, "💰 Step 3/12: Commission Agreed!",
        `Commission agreed at ${agreedPct}%. System fee 5% paid by ${feePayer}. Next: Step 4 — Property Offer Negotiation.`, "success");
      await notifyUser(eng.broker_id, "💰 Step 3/12: Commission Agreed!",
        `Commission agreed at ${agreedPct}%. System fee 5% paid by ${feePayer}. You can now draft an offer for the property.`, "success");

      res.json({ success: true, message: `Commission agreed at ${agreedPct}%. Proceeding to property negotiation.`, status: "broker_negotiating", agreed_commission_pct: agreedPct });

    } else if (action === 'reject_commission') {
      await db.query(
        `UPDATE broker_engagements SET status = 'cancelled', commission_negotiation_status = 'rejected', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      const roleLabel = isBrokerUser ? 'Broker' : 'Buyer';
      await logHistory(id, "commission_rejected", user_id, user_role, "commission_negotiation", "cancelled",
        `${roleLabel} rejected the commission negotiation — engagement cancelled`);
      await systemMessage(id, `❌ ${roleLabel} has rejected the commission negotiation. The engagement has been cancelled.`);

      const otherParty = isBrokerUser ? eng.buyer_id : eng.broker_id;
      await notifyUser(otherParty, "❌ Commission Rejected",
        `The ${roleLabel.toLowerCase()} has rejected the commission negotiation. The engagement has been cancelled.`, "error");

      res.json({ success: true, message: "Commission rejected. Engagement cancelled.", status: "cancelled" });

    } else if (action === 'counter_commission') {
      if (!counter_commission || counter_commission <= 0) {
        return res.status(400).json({ success: false, message: "Counter commission percentage is required" });
      }

      if (isBrokerUser) {
        await db.query(
          `UPDATE broker_engagements SET broker_commission_counter = ?, commission_negotiation_status = 'broker_countered', updated_at = NOW() WHERE id = ?`,
          [counter_commission, id]
        );
        await logHistory(id, "broker_commission_counter", user_id, "broker", "commission_negotiation", "commission_negotiation",
          `Broker counter-offered commission at ${counter_commission}%`, { counter_commission });
        await systemMessagePrivate(id, `🔄 Broker proposed a counter commission of ${counter_commission}%. Awaiting buyer's response.`);
        await notifyUser(eng.buyer_id, "🔄 Step 3/12: Broker Commission Counter-Offer",
          `Your broker has counter-offered a commission of ${counter_commission}% (your offer was ${currentBuyerOffer}%). Please Accept, Reject, or Counter.`, "warning");
      } else {
        await db.query(
          `UPDATE broker_engagements SET buyer_commission_offer = ?, commission_negotiation_status = 'buyer_offered', updated_at = NOW() WHERE id = ?`,
          [counter_commission, id]
        );
        await logHistory(id, "buyer_commission_counter", user_id, "buyer", "commission_negotiation", "commission_negotiation",
          `Buyer counter-offered commission at ${counter_commission}%`, { counter_commission });
        await systemMessagePrivate(id, `🔄 Buyer proposed a counter commission of ${counter_commission}%. Awaiting broker's response.`);
        await notifyUser(eng.broker_id, "🔄 Step 3/12: Buyer Commission Counter-Offer",
          `The buyer has counter-offered a commission of ${counter_commission}% (your counter was ${currentBrokerCounter || 'N/A'}%). Please Accept, Reject, or Counter.`, "warning");
      }

      const feePayer = system_fee_payer || eng.system_fee_payer;
      if (feePayer && feePayer !== eng.system_fee_payer) {
        await db.query(`UPDATE broker_engagements SET system_fee_payer = ? WHERE id = ?`, [feePayer, id]);
      }

      res.json({ success: true, message: `Counter commission of ${counter_commission}% sent.`, status: "commission_negotiation" });
    }
  } catch (error) {
    console.error("Error processing commission response:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/:id/property-media
// Get property video, map coordinates, and documents
// ============================================================================
router.get("/:id/property-media", async (req, res) => {
  try {
    const { id } = req.params;

    const [engagement] = await db.query("SELECT * FROM v_broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];

    // Get property details for video and coordinates
    const [property] = await db.query(
      "SELECT id, title, location, latitude, longitude, video_url, images FROM properties WHERE id = ?",
      [eng.property_id]
    );

    // Get property documents
    const [documents] = await db.query(
      "SELECT id, document_type, document_name, document_path, access_key, uploaded_at FROM property_documents WHERE property_id = ?",
      [eng.property_id]
    );
    const prop = property[0] || {};
    let video_url = prop.video_url;
    if (video_url && video_url.startsWith('/uploads/')) {
      video_url = `http://${req.headers.host}${video_url}`;
    }

    const docs = (documents || []).map(doc => {
      if (doc.document_path && doc.document_path.startsWith('/uploads/')) {
        return { ...doc, document_path: `http://${req.headers.host}${doc.document_path}` };
      }
      return doc;
    });

    res.json({
      success: true,
      property: prop,
      documents: docs,
      video_url: video_url,
      latitude: prop.latitude || null,
      longitude: prop.longitude || null
    });
  } catch (error) {
    console.error("Error fetching property media:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/broker-negotiate
// Broker drafts an offer → requires Buyer approval before sending to Owner
// ============================================================================
router.put("/:id/broker-negotiate", async (req, res) => {
  try {
    const { id } = req.params;
    const { broker_id, offer_price, message, system_fee_payer } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (!["broker_negotiating"].includes(eng.status)) {
      return res.status(400).json({ success: false, message: "Cannot negotiate in current status: " + eng.status });
    }
    if (eng.broker_id !== broker_id) {
      return res.status(403).json({ success: false, message: "You are not the assigned broker" });
    }

    const price = offer_price || eng.current_offer;

    // Save draft offer price and set pending_buyer_approval
    await db.query(
      `UPDATE broker_engagements SET draft_offer_price = ?, system_fee_payer = ?, status = 'pending_buyer_approval', updated_at = NOW() WHERE id = ?`,
      [price, system_fee_payer || eng.system_fee_payer, id]
    );


    // Record draft message (private — advice type so owner can't see it)
    await db.query(
      `INSERT INTO broker_engagement_messages
         (engagement_id, sender_id, sender_role, message_type, message, metadata)
       VALUES (?, ?, 'broker', 'advice', ?, ?)`,
      [id, broker_id, message || `Broker drafted an offer of ${Number(price).toLocaleString()} ETB for buyer approval`, JSON.stringify({ draft_offer_price: price })]
    );

    await logHistory(id, "broker_drafted_offer", broker_id, "broker", "broker_negotiating", "pending_buyer_approval",
      `Step 4/12: Broker drafted offer of ${Number(price).toLocaleString()} ETB — awaiting buyer approval`, { draft_offer_price: price });

    await notifyUser(eng.buyer_id, "📋 Step 4/12: Review Broker's Draft Offer",
      `Your broker has drafted an offer of ${Number(price).toLocaleString()} ETB. Please review and approve or reject before it is sent to the owner.`, "warning");

    res.json({ success: true, message: "Draft offer sent to buyer for approval", status: "pending_buyer_approval" });
  } catch (error) {
    console.error("Error drafting broker offer:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/buyer-approve-draft
// Buyer approves or rejects the broker's draft offer
// ============================================================================
router.put("/:id/buyer-approve-draft", async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_id, decision, reject_reason } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "pending_buyer_approval") {
      return res.status(400).json({ success: false, message: "No draft pending approval. Current status: " + eng.status });
    }
    if (eng.buyer_id !== buyer_id) {
      return res.status(403).json({ success: false, message: "You are not the buyer" });
    }

    const draftPrice = eng.draft_offer_price;

    if (decision === "approve") {
      // Update current_offer and send to owner
      await db.query(
        `UPDATE broker_engagements SET current_offer = ?, draft_offer_price = NULL, status = 'broker_negotiating', updated_at = NOW() WHERE id = ?`,
        [draftPrice, id]
      );

      // Record the official negotiation message (visible to owner)
      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message, metadata)
         VALUES (?, ?, 'broker', 'negotiation', ?, ?)`,
        [id, eng.broker_id, `Offer of ${Number(draftPrice).toLocaleString()} ETB`, JSON.stringify({ offer_price: draftPrice })]
      );

      await logHistory(id, "buyer_approved_draft", buyer_id, "buyer", "pending_buyer_approval", "broker_negotiating",
        `Buyer approved draft offer of ${Number(draftPrice).toLocaleString()} ETB — offer sent to owner`, { offer_price: draftPrice });

      await systemMessage(id, `Buyer approved the draft offer. Offer of ${Number(draftPrice).toLocaleString()} ETB has been sent to the owner.`);

      // Notify owner
      await notifyUser(eng.owner_id, "📋 New Offer from Broker",
        `A broker has sent an offer of ${Number(draftPrice).toLocaleString()} ETB for your property. Please review and respond.`, "info");
      // Notify broker
      await notifyUser(eng.broker_id, "✅ Buyer Approved Your Offer",
        `The buyer approved your draft offer of ${Number(draftPrice).toLocaleString()} ETB. It has been sent to the owner.`, "success");

      res.json({ success: true, message: "Offer approved and sent to owner", status: "broker_negotiating" });
    } else {
      // Buyer rejected — revert to broker_negotiating
      await db.query(
        `UPDATE broker_engagements SET draft_offer_price = NULL, status = 'broker_negotiating', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      const reason = reject_reason || "No reason provided";

      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message, metadata)
         VALUES (?, ?, 'buyer', 'authorization', ?, ?)`,
        [id, buyer_id, `Buyer rejected draft offer of ${Number(draftPrice).toLocaleString()} ETB. Reason: ${reason}`, JSON.stringify({ rejected_price: draftPrice, reason })]
      );

      await logHistory(id, "buyer_rejected_draft", buyer_id, "buyer", "pending_buyer_approval", "broker_negotiating",
        `Buyer rejected draft offer of ${Number(draftPrice).toLocaleString()} ETB. Reason: ${reason}`, { rejected_price: draftPrice, reason });

      await systemMessagePrivate(id, `Buyer rejected the draft offer of ${Number(draftPrice).toLocaleString()} ETB. Reason: ${reason}. Broker should draft a new offer.`);

      // Notify broker
      await notifyUser(eng.broker_id, "❌ Buyer Rejected Draft Offer",
        `The buyer rejected your draft of ${Number(draftPrice).toLocaleString()} ETB. Reason: ${reason}. Please draft a revised offer.`, "warning");

      res.json({ success: true, message: "Draft rejected. Broker can draft a new offer.", status: "broker_negotiating" });
    }
  } catch (error) {
    console.error("Error processing buyer draft approval:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/owner-respond
// Owner accepts or sends counter-offer (goes to broker, NOT buyer)
// ============================================================================
router.put("/:id/owner-respond", async (req, res) => {
  try {
    const { id } = req.params;
    const { owner_id, decision, counter_price, message, system_fee_payer } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (!["broker_negotiating"].includes(eng.status)) {
      return res.status(400).json({ success: false, message: "Cannot respond in current status: " + eng.status });
    }
    if (eng.owner_id !== owner_id) {
      return res.status(403).json({ success: false, message: "You are not the property owner" });
    }

    if (decision === "accept") {
      // Owner accepted the broker's offer
      await db.query(
        `UPDATE broker_engagements SET
           status = 'broker_finalizing', agreed_price = ?, system_fee_payer = ?, owner_responded_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [eng.current_offer, system_fee_payer || eng.system_fee_payer, id]
      );


      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message, metadata)
         VALUES (?, ?, 'owner', 'negotiation', ?, ?)`,
        [id, owner_id, message || "Owner accepted the offer.", JSON.stringify({ decision: "accept", accepted_price: eng.current_offer })]
      );

      await logHistory(id, "owner_accepted", owner_id, "owner", eng.status, "broker_finalizing",
        `Owner accepted offer of ${Number(eng.current_offer).toLocaleString()} ETB`, { accepted_price: eng.current_offer });
      await systemMessage(id, `Owner has accepted the offer of ${Number(eng.current_offer).toLocaleString()} ETB.`);

      // Notify broker
      await notifyUser(eng.broker_id, "✅ Owner Accepted Offer",
        `The owner has accepted your offer of ${Number(eng.current_offer).toLocaleString()} ETB. Please finalize with the buyer.`, "success");
      // Notify buyer
      await notifyUser(eng.buyer_id, "✅ Offer Accepted!",
        `Great news! The owner has accepted the offer. Your broker will finalize the deal.`, "success");

      res.json({ success: true, message: "Offer accepted by owner", status: "broker_finalizing", agreed_price: eng.current_offer });

    } else if (decision === "counter") {
      // Owner sends counter-offer → goes to broker
      if (!counter_price) {
        return res.status(400).json({ success: false, message: "Counter price is required" });
      }

      await db.query(
        `UPDATE broker_engagements SET
           status = 'broker_reviewing_counter', owner_counter_price = ?, owner_counter_message = ?,
           system_fee_payer = ?, owner_responded_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [counter_price, message || null, system_fee_payer || eng.system_fee_payer, id]
      );


      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message, metadata)
         VALUES (?, ?, 'owner', 'counter_offer', ?, ?)`,
        [id, owner_id, message || `Counter offer: ${Number(counter_price).toLocaleString()} ETB`,
         JSON.stringify({ counter_price, original_offer: eng.current_offer })]
      );

      await logHistory(id, "owner_counter_offered", owner_id, "owner", eng.status, "broker_reviewing_counter",
        `Owner sent counter-offer of ${Number(counter_price).toLocaleString()} ETB`, { counter_price });
      await systemMessage(id, `Owner has sent a counter-offer of ${Number(counter_price).toLocaleString()} ETB.`);

      // Notify broker only (NOT buyer — broker reviews first)
      await notifyUser(eng.broker_id, "🔄 Owner Counter-Offer",
        `The owner has sent a counter-offer of ${Number(counter_price).toLocaleString()} ETB. Please review and advise the buyer.`, "info");

      res.json({ success: true, message: "Counter-offer sent to broker", status: "broker_reviewing_counter", counter_price });

    } else if (decision === "reject") {
      await db.query(
        `UPDATE broker_engagements SET status = 'cancelled', owner_responded_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [id]
      );

      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message)
         VALUES (?, ?, 'owner', 'negotiation', ?)`,
        [id, owner_id, message || "Owner rejected the offer."]
      );

      await logHistory(id, "owner_rejected", owner_id, "owner", eng.status, "cancelled", "Owner rejected the offer");
      await systemMessage(id, "Owner has rejected the offer. The engagement has been cancelled.");
      await notifyUser(eng.broker_id, "❌ Owner Rejected Offer", "The property owner has rejected the offer.", "error");
      await notifyUser(eng.buyer_id, "❌ Offer Rejected", "The property owner has rejected the offer.", "error");

      res.json({ success: true, message: "Offer rejected by owner", status: "cancelled" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid decision. Use 'accept', 'counter', or 'reject'." });
    }
  } catch (error) {
    console.error("Error processing owner response:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/broker-advise
// Broker reviews counter-offer and advises buyer
// ============================================================================
router.put("/:id/broker-advise", async (req, res) => {
  try {
    const { id } = req.params;
    const { broker_id, recommendation, advice_message } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "broker_reviewing_counter") {
      return res.status(400).json({ success: false, message: "No counter-offer to review in current status: " + eng.status });
    }
    if (eng.broker_id !== broker_id) {
      return res.status(403).json({ success: false, message: "You are not the assigned broker" });
    }
    if (!["accept", "counter", "walk_away"].includes(recommendation)) {
      return res.status(400).json({ success: false, message: "Recommendation must be 'accept', 'counter', or 'walk_away'" });
    }

    await db.query(
      `UPDATE broker_engagements SET
         status = 'awaiting_buyer_authorization', broker_advice = ?, broker_recommendation = ?,
         broker_advised_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [advice_message || null, recommendation, id]
    );

    // Record advice as message
    const recEmoji = recommendation === "accept" ? "✅" : recommendation === "counter" ? "🔄" : "🚫";
    const recLabel = recommendation === "accept" ? "Accept" : recommendation === "counter" ? "Counter" : "Walk Away";

    await db.query(
      `INSERT INTO broker_engagement_messages
         (engagement_id, sender_id, sender_role, message_type, message, metadata)
       VALUES (?, ?, 'broker', 'advice', ?, ?)`,
      [id, broker_id,
       `${recEmoji} Broker Recommendation: ${recLabel}\n\n${advice_message || "No additional comments."}`,
       JSON.stringify({
         recommendation,
         owner_counter_price: eng.owner_counter_price,
         current_offer: eng.current_offer
       })]
    );

    await logHistory(id, "broker_advised", broker_id, "broker", "broker_reviewing_counter", "awaiting_buyer_authorization",
      `Broker recommends: ${recLabel}`, { recommendation, owner_counter_price: eng.owner_counter_price });
    await systemMessage(id, `Broker has reviewed the counter-offer and recommends: ${recLabel}. Awaiting buyer authorization.`);

    // Notify buyer — they need to authorize
    await notifyUser(eng.buyer_id, `📬 Broker Advice: ${recEmoji} ${recLabel}`,
      `Your broker has reviewed the owner's counter-offer of ${Number(eng.owner_counter_price).toLocaleString()} ETB and recommends: ${recLabel}. Please review and authorize.`, "info");

    res.json({
      success: true,
      message: "Advice sent to buyer. Awaiting authorization.",
      status: "awaiting_buyer_authorization",
      recommendation
    });
  } catch (error) {
    console.error("Error sending broker advice:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/buyer-authorize
// Buyer authorizes acceptance, counter, or cancels
// ============================================================================
router.put("/:id/buyer-authorize", async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_id, authorization, counter_price, message, system_fee_payer } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "awaiting_buyer_authorization") {
      return res.status(400).json({ success: false, message: "Not awaiting buyer authorization. Current status: " + eng.status });
    }
    if (eng.buyer_id !== buyer_id) {
      return res.status(403).json({ success: false, message: "You are not the buyer" });
    }
    if (!["authorize_accept", "authorize_counter", "cancel"].includes(authorization)) {
      return res.status(400).json({ success: false, message: "Authorization must be 'authorize_accept', 'authorize_counter', or 'cancel'" });
    }

    if (authorization === "authorize_accept") {
      // Buyer accepts the owner's counter-offer price
      await db.query(
        `UPDATE broker_engagements SET
           status = 'broker_finalizing', buyer_authorization = 'authorize_accept',
           agreed_price = ?, current_offer = ?, system_fee_payer = ?,
           buyer_auth_message = ?, buyer_authorized_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [eng.owner_counter_price, eng.owner_counter_price, system_fee_payer || eng.system_fee_payer, message || null, id]
      );


      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message, metadata)
         VALUES (?, ?, 'buyer', 'authorization', ?, ?)`,
        [id, buyer_id, message || "Buyer authorized acceptance of the counter-offer.",
         JSON.stringify({ authorization: "authorize_accept", accepted_price: eng.owner_counter_price })]
      );

      await logHistory(id, "buyer_authorized_accept", buyer_id, "buyer", eng.status, "broker_finalizing",
        `Buyer authorized acceptance at ${Number(eng.owner_counter_price).toLocaleString()} ETB`,
        { accepted_price: eng.owner_counter_price });
      await systemMessage(id, `Buyer has authorized acceptance of the counter-offer at ${Number(eng.owner_counter_price).toLocaleString()} ETB. Broker can now finalize.`);

      await notifyUser(eng.broker_id, "✅ Buyer Authorized Acceptance",
        `The buyer has authorized acceptance of the counter-offer. Please finalize the deal.`, "success");

      res.json({ success: true, message: "Acceptance authorized. Broker will finalize.", status: "broker_finalizing" });

    } else if (authorization === "authorize_counter") {
      if (!counter_price) {
        return res.status(400).json({ success: false, message: "Counter price is required for authorize_counter" });
      }

      await db.query(
        `UPDATE broker_engagements SET
           status = 'broker_negotiating', buyer_authorization = 'authorize_counter',
           buyer_auth_counter_price = ?, current_offer = ?, system_fee_payer = ?,
           buyer_auth_message = ?, buyer_authorized_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [counter_price, counter_price, system_fee_payer || eng.system_fee_payer, message || null, id]
      );

      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message, metadata)
         VALUES (?, ?, 'buyer', 'authorization', ?, ?)`,
        [id, buyer_id, message || `Buyer authorized counter at ${Number(counter_price).toLocaleString()} ETB.`,
         JSON.stringify({ authorization: "authorize_counter", counter_price })]
      );

      await logHistory(id, "buyer_authorized_counter", buyer_id, "buyer", eng.status, "broker_negotiating",
        `Buyer authorized counter-offer at ${Number(counter_price).toLocaleString()} ETB`,
        { counter_price });
      await systemMessage(id, `Buyer has authorized a counter-offer of ${Number(counter_price).toLocaleString()} ETB. Broker returns to negotiation.`);

      await notifyUser(eng.broker_id, "🔄 Buyer Authorized Counter",
        `The buyer has authorized a counter-offer of ${Number(counter_price).toLocaleString()} ETB. Please negotiate with the owner.`, "info");

      res.json({ success: true, message: "Counter authorized. Broker will negotiate.", status: "broker_negotiating" });

    } else {
      // cancel
      await db.query(
        `UPDATE broker_engagements SET
           status = 'cancelled', buyer_authorization = 'cancel',
           buyer_auth_message = ?, buyer_authorized_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [message || null, id]
      );

      await db.query(
        `INSERT INTO broker_engagement_messages
           (engagement_id, sender_id, sender_role, message_type, message)
         VALUES (?, ?, 'buyer', 'authorization', ?)`,
        [id, buyer_id, message || "Buyer cancelled broker representation."]
      );

      await logHistory(id, "buyer_cancelled", buyer_id, "buyer", eng.status, "cancelled", "Buyer cancelled representation");
      await systemMessage(id, "Buyer has cancelled broker representation. The engagement is now closed.");

      await notifyUser(eng.broker_id, "❌ Buyer Cancelled Representation",
        "The buyer has cancelled broker representation.", "error");

      res.json({ success: true, message: "Representation cancelled.", status: "cancelled" });
    }
  } catch (error) {
    console.error("Error processing buyer authorization:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/broker-finalize
// Broker finalizes the accepted deal
// ============================================================================
router.put("/:id/broker-finalize", async (req, res) => {
  try {
    const { id } = req.params;
    const { broker_id } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "broker_finalizing") {
      return res.status(400).json({ success: false, message: "Cannot finalize in current status: " + eng.status });
    }
    if (eng.broker_id !== broker_id) {
      return res.status(403).json({ success: false, message: "You are not the assigned broker" });
    }

    await db.query(
      `UPDATE broker_engagements SET
         status = 'agreement_generated', finalized_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    await logHistory(id, "broker_finalized", broker_id, "broker", "broker_finalizing", "agreement_generated",
      `Broker finalized deal at ${Number(eng.agreed_price).toLocaleString()} ETB`);
    await systemMessage(id, `Broker has finalized the deal at ${Number(eng.agreed_price).toLocaleString()} ETB. Admin will generate the contract.`);

    // Notify admin
    const [admins] = await db.query("SELECT id FROM users WHERE role IN ('property_admin', 'system_admin') LIMIT 1");
    if (admins.length > 0) {
      await notifyUser(admins[0].id, "📄 Contract Ready for Generation",
        `Broker-assisted deal finalized at ${Number(eng.agreed_price).toLocaleString()} ETB. Please generate the PDF contract.`, "info");
    }

    await notifyUser(eng.buyer_id, "🎉 Deal Finalized!",
      `Your broker has finalized the deal at ${Number(eng.agreed_price).toLocaleString()} ETB. The admin will generate the contract for signing.`, "success");
    await notifyUser(eng.owner_id, "🎉 Deal Finalized!",
      `The deal has been finalized at ${Number(eng.agreed_price).toLocaleString()} ETB. A contract will be generated for signing.`, "success");

    res.json({ success: true, message: "Deal finalized. Admin will generate contract.", status: "agreement_generated" });
  } catch (error) {
    console.error("Error finalizing engagement:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// POST /api/broker-engagement/:id/generate-contract
// Admin generates professional HTML contract with agreed price
// ============================================================================
router.post("/:id/generate-contract", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    const [engagement] = await db.query("SELECT * FROM v_broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "agreement_generated") {
      return res.status(400).json({ success: false, message: "Deal must be finalized before generating contract. Status: " + eng.status });
    }

    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const agreedPrice = Number(eng.agreed_price || 0);
    const commPct = Number(eng.agreed_commission_pct || eng.commission_percentage || 2);
    const commissionAmount = Number((agreedPrice * commPct / 100).toFixed(2));
    const systemFee = Number((agreedPrice * 0.05).toFixed(2));
    const feePayer = eng.system_fee_payer || 'buyer';
    
    let buyerTotal = agreedPrice;
    let ownerPayout = agreedPrice;
    
    if (feePayer === 'buyer') {
      buyerTotal = agreedPrice + systemFee + commissionAmount;
      ownerPayout = agreedPrice;
    } else if (feePayer === 'owner') {
      buyerTotal = agreedPrice;
      ownerPayout = agreedPrice - systemFee - commissionAmount;
    } else if (feePayer === 'split') {
      buyerTotal = agreedPrice + (systemFee / 2) + (commissionAmount / 2);
      ownerPayout = agreedPrice - (systemFee / 2) - (commissionAmount / 2);
    }

    const isRental = eng.engagement_type === 'rent';
    const rentalMonths = eng.rental_duration_months || 12;
    const paymentSchedule = eng.payment_schedule || 'monthly';
    const securityDeposit = Number(eng.security_deposit || 0);

    const sharedStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', 'Georgia', 'Times New Roman', serif; color: #1a1a2e; background: #fff; padding: 50px; max-width: 900px; margin: 0 auto; line-height: 1.7; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 100px; color: rgba(59, 130, 246, 0.04); font-weight: 900; letter-spacing: 10px; pointer-events: none; z-index: 0; }
    .header { text-align: center; border-bottom: 4px double #16213e; padding-bottom: 24px; margin-bottom: 30px; position: relative; z-index: 1; }
    .header .logo { font-size: 32px; font-weight: 900; color: #16213e; letter-spacing: 4px; margin-bottom: 4px; }
    .header .subtitle { font-size: 18px; color: #0f3460; font-weight: 500; margin-bottom: 6px; }
    .header .tagline { font-size: 12px; color: #6b7280; font-style: italic; }
    .meta-row { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
    .section { margin-bottom: 28px; position: relative; z-index: 1; }
    .section-title { font-size: 15px; font-weight: 700; color: #16213e; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; margin-bottom: 14px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { padding: 10px 14px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6; }
    .info-item label { display: block; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 2px; }
    .info-item span { font-size: 14px; font-weight: 600; color: #1e293b; }
    .party-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .party-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #fafbfc; }
    .party-box h4 { color: #0f3460; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .party-box p { font-size: 12px; color: #374151; line-height: 1.6; }
    .price-highlight { text-align: center; border-radius: 10px; padding: 20px; margin: 16px 0; }
    .price-highlight .label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; margin-bottom: 4px; }
    .price-highlight .amount { font-size: 36px; font-weight: 900; letter-spacing: 1px; }
    .breakdown-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .breakdown-table th, .breakdown-table td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: left; }
    .breakdown-table th { background: #f1f5f9; color: #374151; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }
    .breakdown-table td.amount { text-align: right; font-weight: 600; }
    .breakdown-table tr.total td { border-top: 2px solid #16213e; font-weight: 800; font-size: 14px; }
    .terms-text { padding: 18px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; line-height: 1.9; }
    .terms-text ol { padding-left: 20px; }
    .terms-text li { margin-bottom: 8px; }
    .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 32px; padding-top: 24px; border-top: 3px double #e2e8f0; }
    .signature-box { text-align: center; }
    .signature-box h4 { font-size: 12px; color: #16213e; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; }
    .signature-line { border: 2px solid #e2e8f0; border-radius: 12px; height: 90px; margin-bottom: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-style: italic; font-size: 13px; background: #fff; overflow: hidden; transition: all 0.3s ease; }
    .signature-line.signed { font-family: 'Dancing Script', cursive; font-size: 28px; color: #1e3a8a; background: #f0f7ff; border: 2px solid #3b82f6; font-style: normal; }
    .signature-line img { max-height: 72px; max-width: 90%; }
    .signature-name { font-size: 14px; color: #1e293b; border-top: 2px solid #1e293b; padding-top: 6px; margin-top: 4px; font-weight: 600; }
    .signature-date { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 500; }
    .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #9ca3af; }
    .footer p { margin-bottom: 2px; }
    .stamp { display: inline-block; border: 2px solid #3b82f6; border-radius: 8px; padding: 4px 12px; font-size: 10px; color: #3b82f6; font-weight: 700; letter-spacing: 1px; margin-top: 8px; }
    @media print { body { padding: 20px; } .watermark { display: none; } }
    `;

    let contractHTML = "";

    if (isRental) {
      const scheduleLabel = paymentSchedule.charAt(0).toUpperCase() + paymentSchedule.slice(1);
      const totalRent = agreedPrice * rentalMonths;

      contractHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Broker-Assisted Lease Agreement - DDREMS #${eng.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${sharedStyles}
    .price-highlight { background: linear-gradient(135deg, #065f46, #064e3b); color: #fff; }
    .rental-badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-left: 8px; }
  </style>
</head>
<body>
  <div class="watermark">DDREMS</div>

  <div class="header">
    <div class="logo">DDREMS</div>
    <div class="subtitle">Residential Lease Agreement <span class="rental-badge">Rental</span></div>
    <div class="tagline">Broker-Assisted Transaction • Dire Dawa Real Estate Management System</div>
  </div>

  <div class="meta-row">
    <span>Agreement Reference: <strong>BALEASE-${String(eng.id).padStart(5, '0')}</strong></span>
    <span>Date: <strong>${today}</strong></span>
    <span>Status: <strong>Pending Signatures</strong></span>
  </div>

  <div class="section">
    <h3 class="section-title">🏠 Property Information</h3>
    <div class="info-grid">
      <div class="info-item"><label>Property Title</label><span>${eng.property_title || "N/A"}</span></div>
      <div class="info-item"><label>Location</label><span>${eng.property_location || "N/A"}</span></div>
      <div class="info-item"><label>Property Type</label><span>${(eng.property_type || "N/A").charAt(0).toUpperCase() + (eng.property_type || "").slice(1)}</span></div>
      <div class="info-item"><label>Listing Type</label><span>For Rent</span></div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">👥 Parties to this Agreement</h3>
    <div class="party-grid">
      <div class="party-box">
        <h4>🙋 Tenant (Lessee)</h4>
        <p><strong>${eng.buyer_name || "N/A"}</strong></p>
        <p>${eng.buyer_email || "N/A"}</p>
      </div>
      <div class="party-box">
        <h4>🤵 Broker (Representative)</h4>
        <p><strong>${eng.broker_name || "N/A"}</strong></p>
        <p>${eng.broker_email || "N/A"}</p>
      </div>
      <div class="party-box">
        <h4>🏢 Landlord (Lessor)</h4>
        <p><strong>${eng.owner_name || "N/A"}</strong></p>
        <p>${eng.owner_email || "N/A"}</p>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h3 class="section-title">📅 Lease Terms</h3>
    <div class="info-grid">
      <div class="info-item"><label>Lease Duration</label><span>${rentalMonths} Month${rentalMonths > 1 ? 's' : ''}</span></div>
      <div class="info-item"><label>Payment Schedule</label><span>${scheduleLabel}</span></div>
      <div class="info-item"><label>Security Deposit</label><span>${securityDeposit > 0 ? securityDeposit.toLocaleString() + ' ETB' : 'None'}</span></div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">💰 Rent Amount</h3>
    <div class="price-highlight">
      <div class="label">Agreed Monthly Rent</div>
      <div class="amount">${agreedPrice.toLocaleString()} ETB</div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">📊 Financial Summary</h3>
    <table class="breakdown-table">
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Monthly Rent</td><td class="amount">${agreedPrice.toLocaleString()} ETB</td></tr>
        <tr><td>Broker Commission (${commPct}%)</td><td class="amount">${feePayer === 'owner' ? '-' : feePayer === 'split' ? '-' : '+'} ${Number(feePayer === 'split' ? commissionAmount/2 : commissionAmount).toLocaleString()} ETB</td></tr>
        <tr><td>System Service Fee (5%)</td><td class="amount">${feePayer === 'owner' ? '-' : feePayer === 'split' ? '-' : '+'} ${Number(feePayer === 'split' ? systemFee/2 : systemFee).toLocaleString()} ETB</td></tr>
        <tr class="total"><td>Total Monthly Tenant Payment</td><td class="amount">${Number(buyerTotal).toLocaleString()} ETB</td></tr>
        <tr class="total" style="color: #059669; border-top: none;"><td>Net Monthly Landlord Payout</td><td class="amount">${Number(ownerPayout).toLocaleString()} ETB</td></tr>
      </tbody>
    </table>

  </div>

  <div class="section">
    <h3 class="section-title">📝 Lease Terms and Conditions</h3>
    <div class="terms-text">
      <ol>
        <li><strong>Lease Agreement:</strong> The Landlord agrees to lease the above-described property to the Tenant at the agreed monthly rent of <strong>${agreedPrice.toLocaleString()} ETB</strong>, for a duration of <strong>${rentalMonths} months</strong>.</li>
        <li><strong>Broker Representation:</strong> This transaction was facilitated by the named Broker, who shall receive a commission of <strong>${commPct}% (${Number(commissionAmount).toLocaleString()} ETB)</strong> deducted from the initial payment to the Landlord.</li>
        <li><strong>Rent Payments:</strong> Rent is payable via the DDREMS platform on the agreed schedule (${scheduleLabel}).</li>
        <li><strong>Security Deposit:</strong> ${securityDeposit > 0 ? `The Tenant shall pay a security deposit of <strong>${securityDeposit.toLocaleString()} ETB</strong> prior to move-in, refundable at the end of the term subject to property condition.` : 'No security deposit is required for this agreement.'}</li>
        <li><strong>Termination & Signatures:</strong> This lease agreement is legally binding once digitally signed by all parties through the DDREMS system.</li>
      </ol>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">✍️ Digital Signatures</h3>
    <div class="signature-section">
      <div class="signature-box">
        <h4>Tenant</h4>
        <div class="signature-line" id="sig-buyer">Awaiting Signature</div>
        <div class="signature-name">${eng.buyer_name}</div>
        <div class="signature-date" id="sig-buyer-date">Date: ___________</div>
      </div>
      <div class="signature-box">
        <h4>Broker</h4>
        <div class="signature-line" id="sig-broker">Awaiting Signature</div>
        <div class="signature-name">${eng.broker_name}</div>
        <div class="signature-date" id="sig-broker-date">Date: ___________</div>
      </div>
      <div class="signature-box">
        <h4>Landlord</h4>
        <div class="signature-line" id="sig-owner">Awaiting Signature</div>
        <div class="signature-name">${eng.owner_name}</div>
        <div class="signature-date" id="sig-owner-date">Date: ___________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This document was generated by the Dire Dawa Real Estate Management System (DDREMS)</p>
    <p>Agreement Reference: BALEASE-${String(eng.id).padStart(5, '0')} | Generated: ${today}</p>
    <div class="stamp">OFFICIAL DDREMS LEASE DOCUMENT</div>
  </div>
</body>
</html>`;
    } else {
      contractHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Broker-Assisted Purchase Agreement - DDREMS #${eng.id}</title>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${sharedStyles}
    .price-highlight { background: linear-gradient(135deg, #1e3a5f, #16213e); color: #fff; }
  </style>
</head>
<body>
  <div class="watermark">DDREMS</div>

  <div class="header">
    <div class="logo">DDREMS</div>
    <div class="subtitle">Property Purchase Agreement</div>
    <div class="tagline">Broker-Assisted Transaction • Dire Dawa Real Estate Management System</div>
  </div>

  <div class="meta-row">
    <span>Agreement Reference: <strong>BA-${String(eng.id).padStart(5, '0')}</strong></span>
    <span>Date: <strong>${today}</strong></span>
    <span>Status: <strong>Pending Signatures</strong></span>
  </div>

  <div class="section">
    <h3 class="section-title">🏠 Property Information</h3>
    <div class="info-grid">
      <div class="info-item"><label>Property Title</label><span>${eng.property_title || "N/A"}</span></div>
      <div class="info-item"><label>Location</label><span>${eng.property_location || "N/A"}</span></div>
      <div class="info-item"><label>Property Type</label><span>${(eng.property_type || "N/A").charAt(0).toUpperCase() + (eng.property_type || "").slice(1)}</span></div>
      <div class="info-item"><label>Listed Price</label><span>${Number(eng.property_price || 0).toLocaleString()} ETB</span></div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">👥 Parties to this Agreement</h3>
    <div class="party-grid">
      <div class="party-box">
        <h4>🙋 Buyer</h4>
        <p><strong>${eng.buyer_name || "N/A"}</strong></p>
        <p>${eng.buyer_email || "N/A"}</p>
      </div>
      <div class="party-box">
        <h4>🤵 Broker (Representative)</h4>
        <p><strong>${eng.broker_name || "N/A"}</strong></p>
        <p>${eng.broker_email || "N/A"}</p>
      </div>
      <div class="party-box">
        <h4>🏢 Property Owner</h4>
        <p><strong>${eng.owner_name || "N/A"}</strong></p>
        <p>${eng.owner_email || "N/A"}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">💰 Agreed Transaction Price</h3>
    <div class="price-highlight">
      <div class="label">Final Agreed Price</div>
      <div class="amount">${agreedPrice.toLocaleString()} ETB</div>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">📊 Financial Breakdown</h3>
    <table class="breakdown-table">
      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr><td>Agreed Purchase Price</td><td class="amount">${agreedPrice.toLocaleString()} ETB</td></tr>
        <tr><td>Broker Commission (${commPct}%)</td><td class="amount">${feePayer === 'owner' ? '-' : feePayer === 'split' ? '-' : '+'} ${Number(feePayer === 'split' ? commissionAmount/2 : commissionAmount).toLocaleString()} ETB</td></tr>
        <tr><td>System Service Fee (5%)</td><td class="amount">${feePayer === 'owner' ? '-' : feePayer === 'split' ? '-' : '+'} ${Number(feePayer === 'split' ? systemFee/2 : systemFee).toLocaleString()} ETB</td></tr>
        <tr class="total"><td>Total Buyer Payment</td><td class="amount">${Number(buyerTotal).toLocaleString()} ETB</td></tr>
        <tr class="total" style="color: #059669; border-top: none;"><td>Net Amount to Owner</td><td class="amount">${Number(ownerPayout).toLocaleString()} ETB</td></tr>
      </tbody>
    </table>

  </div>

  <div class="section">
    <h3 class="section-title">📝 Terms and Conditions</h3>
    <div class="terms-text">
      <ol>
        <li><strong>Sale Agreement:</strong> The Buyer agrees to purchase, and the Owner agrees to sell, the above-described property at the agreed price of <strong>${agreedPrice.toLocaleString()} ETB</strong>.</li>
        <li><strong>Broker Representation:</strong> This transaction was facilitated by the named Broker, who shall receive a commission of <strong>${commPct}% (${Number(commissionAmount).toLocaleString()} ETB)</strong> deducted from the final payout to the Owner.</li>
        <li><strong>System Fee:</strong> The transaction is subject to a 5% platform facilitation fee (${Number(systemFee).toLocaleString()} ETB) paid by the ${feePayer}.</li>
        <li><strong>Payment:</strong> The Buyer shall submit the full agreed amount via the DDREMS platform.</li>
        <li><strong>Property Handover:</strong> Upon payment verification, the Owner shall hand over the property to the Buyer within <strong>14 business days</strong> unless otherwise agreed upon.</li>
        <li><strong>Signatures:</strong> Digital signatures applied through DDREMS are legally binding.</li>
      </ol>
    </div>
  </div>

  <div class="section">
    <h3 class="section-title">✍️ Digital Signatures</h3>
    <div class="signature-section">
      <div class="signature-box">
        <h4>Buyer</h4>
        <div class="signature-line" id="sig-buyer">Awaiting Signature</div>
        <div class="signature-name">${eng.buyer_name}</div>
        <div class="signature-date" id="sig-buyer-date">Date: ___________</div>
      </div>
      <div class="signature-box">
        <h4>Broker</h4>
        <div class="signature-line" id="sig-broker">Awaiting Signature</div>
        <div class="signature-name">${eng.broker_name}</div>
        <div class="signature-date" id="sig-broker-date">Date: ___________</div>
      </div>
      <div class="signature-box">
        <h4>Property Owner</h4>
        <div class="signature-line" id="sig-owner">Awaiting Signature</div>
        <div class="signature-name">${eng.owner_name}</div>
        <div class="signature-date" id="sig-owner-date">Date: ___________</div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This document was generated by the Dire Dawa Real Estate Management System (DDREMS)</p>
    <p>Agreement Reference: BA-${String(eng.id).padStart(5, '0')} | Generated: ${today}</p>
    <div class="stamp">OFFICIAL DDREMS DOCUMENT</div>
  </div>
</body>
</html>`;
    }

    // Store in agreement_documents
    await db.query(
      `INSERT INTO agreement_documents
         (agreement_request_id, version, document_type, document_content, generated_by_id)
       VALUES (NULL, 1, 'broker_assisted', ?, ?)`,
      [contractHTML, admin_id]
    );

    // Link the document to the engagement
    const [docResult] = await db.query(
      `SELECT id FROM agreement_documents WHERE document_type = 'broker_assisted' AND (document_content LIKE ? OR document_content LIKE ?) ORDER BY id DESC LIMIT 1`,
      [`%BA-${String(eng.id).padStart(5, '0')}%`, `%BALEASE-${String(eng.id).padStart(5, '0')}%`]
    );
    const docId = docResult.length > 0 ? docResult[0].id : null;

    await db.query(
      `UPDATE broker_engagements SET
         status = 'pending_signatures', contract_generated_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    await logHistory(id, "contract_generated", admin_id, "admin", "agreement_generated", "pending_signatures",
      "Admin generated the agreement contract");
    await systemMessage(id, "📄 Contract has been generated. All three parties must now sign: Buyer → Broker → Owner.");

    await notifyUser(eng.buyer_id, "📄 Contract Ready to Sign",
      "The agreement contract has been generated. Please review and sign it.", "info");
    await notifyUser(eng.broker_id, "📄 Contract Generated",
      "The agreement contract has been generated. Buyer will sign first, then you.", "info");
    await notifyUser(eng.owner_id, "📄 Contract Generated",
      "The agreement contract has been generated. It will be sent to you for signing after the buyer and broker have signed.", "info");

    res.json({ success: true, message: "Contract generated. Awaiting signatures.", status: "pending_signatures", document_id: docId });
  } catch (error) {
    console.error("Error generating contract:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/:id/view-contract
// Get the generated HTML contract for preview/download
// ============================================================================
router.get("/:id/view-contract", async (req, res) => {
  try {
    const { id } = req.params;

    // Find the contract document for this engagement
    const [docs] = await db.query(
      `SELECT * FROM agreement_documents 
       WHERE document_type = 'broker_assisted' 
       AND (document_content LIKE ? OR document_content LIKE ?)
       ORDER BY id DESC LIMIT 1`,
      [`%BA-${String(id).padStart(5, '0')}%`, `%BALEASE-${String(id).padStart(5, '0')}%`]
    );

    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: "No contract found for this engagement" });
    }

    // Also get signatures to inject into the HTML
    const [signatures] = await db.query(
      `SELECT bes.*, u.name AS signer_name
       FROM broker_engagement_signatures bes
       JOIN users u ON bes.signer_id = u.id
       WHERE bes.engagement_id = ? ORDER BY bes.signed_at ASC`,
      [id]
    );

    let html = docs[0].document_content;

    // Inject signatures into the HTML
    for (const sig of signatures) {
      const role = sig.signer_role;
      const sigDate = new Date(sig.signed_at).toLocaleString("en-US", { 
        year: "numeric", 
        month: "short", 
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      
      const sigText = sig.signature_data.includes("digital_signature") ? "digital_signature" : "Signed Digitally";
      
      // Replace "Awaiting Signature" with actual signature style
      const sigLineRegex = new RegExp(`<div class="signature-line" id="sig-${role}">Awaiting Signature</div>`);
      html = html.replace(sigLineRegex, `<div class="signature-line signed" id="sig-${role}">${sigText}</div>`);
      
      // Replace date placeholder
      const dateRegex = new RegExp(`<div class="signature-date" id="sig-${role}-date">Date: ___________</div>`);
      html = html.replace(dateRegex, `<div class="signature-date" id="sig-${role}-date">Date: ${sigDate}</div>`);
    }

    res.json({ success: true, html, document_id: docs[0].id, signatures });
  } catch (error) {
    console.error("Error viewing contract:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/sign
// Triple digital signature: Buyer → Broker → Owner
// ============================================================================
router.put("/:id/sign", async (req, res) => {
  try {
    const { id } = req.params;
    const { signer_id, signer_role, signature_data } = req.body;

    if (!["buyer", "broker", "owner"].includes(signer_role)) {
      return res.status(400).json({ success: false, message: "Invalid signer role" });
    }

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (!["pending_signatures", "agreement_generated"].includes(eng.status)) {
      return res.status(400).json({ success: false, message: "Not in signing phase. Status: " + eng.status });
    }

    // Verify signer identity
    const expectedSignerId =
      signer_role === "buyer" ? eng.buyer_id :
      signer_role === "broker" ? eng.broker_id : eng.owner_id;
    if (signer_id !== expectedSignerId) {
      return res.status(403).json({ success: false, message: "You are not authorized to sign as " + signer_role });
    }

    // Check existing signatures to enforce order
    const [existingSigs] = await db.query(
      "SELECT signer_role FROM broker_engagement_signatures WHERE engagement_id = ? ORDER BY signed_at ASC",
      [id]
    );
    const signedRoles = existingSigs.map(s => s.signer_role);

    // Enforce order: buyer → broker → owner
    if (signer_role === "broker" && !signedRoles.includes("buyer")) {
      return res.status(400).json({ success: false, message: "Buyer must sign before broker" });
    }
    if (signer_role === "owner" && (!signedRoles.includes("buyer") || !signedRoles.includes("broker"))) {
      return res.status(400).json({ success: false, message: "Buyer and broker must sign before owner" });
    }
    if (signedRoles.includes(signer_role)) {
      return res.status(400).json({ success: false, message: signer_role + " has already signed" });
    }

    // Record signature
    await db.query(
      `INSERT INTO broker_engagement_signatures
         (engagement_id, signer_id, signer_role, signature_data)
       VALUES (?, ?, ?, ?)`,
      [id, signer_id, signer_role, signature_data || "digital_signature_" + Date.now()]
    );

    await logHistory(id, signer_role + "_signed", signer_id, signer_role, eng.status, eng.status,
      signer_role.charAt(0).toUpperCase() + signer_role.slice(1) + " signed the contract",
      { signer_role, signed_at: new Date().toISOString() });

    const roleLabel = signer_role.charAt(0).toUpperCase() + signer_role.slice(1);
    await systemMessage(id, `${roleLabel} has signed the contract.`);

    // Check if all three have signed
    const allSigned = [...signedRoles, signer_role];
    if (allSigned.includes("buyer") && allSigned.includes("broker") && allSigned.includes("owner")) {
      await db.query(
        `UPDATE broker_engagements SET status = 'fully_signed', completed_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [id]
      );
      await logHistory(id, "fully_signed", signer_id, signer_role, eng.status, "fully_signed",
        "All three parties have signed. Contract is legally binding.");
      await systemMessage(id, "🎉 All three parties have signed the contract. The agreement is now legally binding!");

      await notifyUser(eng.buyer_id, "🎉 Contract Fully Signed!", "All parties have signed. The contract is now legally binding.", "success");
      await notifyUser(eng.broker_id, "🎉 Contract Fully Signed!", "All parties have signed. The contract is now legally binding.", "success");
      await notifyUser(eng.owner_id, "🎉 Contract Fully Signed!", "All parties have signed. The contract is now legally binding.", "success");

      res.json({ success: true, message: "All parties signed. Contract is binding.", status: "fully_signed" });
    } else {
      // Notify next signer
      const nextRole = !allSigned.includes("buyer") ? "buyer" : !allSigned.includes("broker") ? "broker" : "owner";
      const nextId = nextRole === "buyer" ? eng.buyer_id : nextRole === "broker" ? eng.broker_id : eng.owner_id;
      await notifyUser(nextId, `✍️ Your Signature Needed`,
        `The ${roleLabel} has signed the contract. It's now your turn to sign.`, "info");

      res.json({ success: true, message: `${roleLabel} signature recorded. Awaiting ${nextRole} signature.`, status: "pending_signatures" });
    }
  } catch (error) {
    console.error("Error processing signature:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/:id
// Get engagement details
// ============================================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [engagement] = await db.query("SELECT * FROM v_broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    // Get signatures
    const [signatures] = await db.query(
      `SELECT bes.*, u.name AS signer_name
       FROM broker_engagement_signatures bes
       JOIN users u ON bes.signer_id = u.id
       WHERE bes.engagement_id = ? ORDER BY bes.signed_at ASC`,
      [id]
    );

    // Get history (filtered for Owner)
    const { role } = req.query;
    let historyFilter = "";
    if (role === "owner") {
      historyFilter = ` AND action NOT IN (
        'engagement_created', 
        'broker_drafted_offer', 
        'buyer_approved_draft', 
        'buyer_rejected_draft', 
        'broker_sent_advice',
        'broker_accepted',
        'broker_declined'
      ) `;
    }

    const [history] = await db.query(
      `SELECT beh.*, u.name AS action_by_name
       FROM broker_engagement_history beh
       LEFT JOIN users u ON beh.action_by_id = u.id
       WHERE beh.engagement_id = ? ${historyFilter}
       ORDER BY beh.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      engagement: engagement[0],
      signatures,
      history
    });
  } catch (error) {
    console.error("Error fetching engagement:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/:id/messages
// Get engagement message thread
// ============================================================================
router.get("/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.query;

    let filterClause = "";
    if (role === "owner") {
      filterClause = " AND bem.message_type NOT IN ('advice', 'authorization') ";
    }

    const [messages] = await db.query(
      `SELECT bem.*, u.name AS sender_name
       FROM broker_engagement_messages bem
       LEFT JOIN users u ON bem.sender_id = u.id
       WHERE bem.engagement_id = ? ${filterClause}
       ORDER BY bem.created_at ASC`,
      [id]
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// POST /api/broker-engagement/:id/messages
// Send a message in the engagement thread
// ============================================================================
router.post("/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { sender_id, sender_role, message, message_type } = req.body;

    if (!sender_id || !message) {
      return res.status(400).json({ success: false, message: "Sender ID and message are required" });
    }

    // Verify engagement exists
    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    // Verify sender is a party
    const eng = engagement[0];
    const isParty = [eng.buyer_id, eng.broker_id, eng.owner_id].includes(sender_id);
    if (!isParty) {
      // Check if admin
      const [user] = await db.query("SELECT role FROM users WHERE id = ?", [sender_id]);
      if (user.length === 0 || !["property_admin", "system_admin", "admin"].includes(user[0].role)) {
        return res.status(403).json({ success: false, message: "You are not a party to this engagement" });
      }
    }

    const [result] = await db.query(
      `INSERT INTO broker_engagement_messages
         (engagement_id, sender_id, sender_role, message_type, message)
       VALUES (?, ?, ?, ?, ?)`,
      [id, sender_id, sender_role || "buyer", message_type || "general", message]
    );

    res.json({ success: true, message: "Message sent", message_id: result.insertId });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/:id/history
// Get audit trail
// ============================================================================
router.get("/:id/history", async (req, res) => {
  try {
    const { id } = req.params;
    const [history] = await db.query(
      `SELECT beh.*, u.name AS action_by_name
       FROM broker_engagement_history beh
       LEFT JOIN users u ON beh.action_by_id = u.id
       WHERE beh.engagement_id = ? ORDER BY beh.created_at DESC`,
      [id]
    );
    res.json({ success: true, history });
  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/buyer/:buyerId
// Get buyer's engagements
// ============================================================================
router.get("/buyer/:buyerId", async (req, res) => {
  try {
    const [engagements] = await db.query(
      "SELECT * FROM v_broker_engagements WHERE buyer_id = ? ORDER BY created_at DESC",
      [req.params.buyerId]
    );
    res.json({ success: true, engagements });
  } catch (error) {
    console.error("Error fetching buyer engagements:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/broker/:brokerId
// Get broker's engagements
// ============================================================================
router.get("/broker/:brokerId", async (req, res) => {
  try {
    const [engagements] = await db.query(
      "SELECT * FROM v_broker_engagements WHERE broker_id = ? ORDER BY created_at DESC",
      [req.params.brokerId]
    );
    res.json({ success: true, engagements });
  } catch (error) {
    console.error("Error fetching broker engagements:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/owner/:ownerId
// Get owner's engagements
// ============================================================================
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const [engagements] = await db.query(
      "SELECT * FROM v_broker_engagements WHERE owner_id = ? ORDER BY created_at DESC",
      [req.params.ownerId]
    );
    res.json({ success: true, engagements });
  } catch (error) {
    console.error("Error fetching owner engagements:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/admin/all
// Get all engagements for admin dashboard
// ============================================================================
router.get("/admin/all", async (req, res) => {
  try {
    const [engagements] = await db.query(
      "SELECT * FROM v_broker_engagements ORDER BY created_at DESC"
    );
    res.json({ success: true, engagements });
  } catch (error) {
    console.error("Error fetching all engagements:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/release-media
// Admin releases the property media/documents key for the buyer
// ============================================================================
router.put("/:id/release-media", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "media_uploaded") {
      return res.status(400).json({ success: false, message: "Property media must be uploaded by the owner first. Current status: " + eng.status });
    }

    await db.query(
      `UPDATE broker_engagements SET status = 'media_released', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    await logHistory(id, "media_released", admin_id, "admin", eng.status, "media_released",
      "Admin released property media and document keys for buyer review.");
    await systemMessage(id, "🔑 Property media and documents have been unlocked by the admin. The buyer can now review them.");

    // Notify buyer
    await notifyUser(eng.buyer_id, "🔑 Media & Documents Unlocked",
      "The admin has released the property media and documents. Please review them before proceeding to payment.", "success");

    res.json({ success: true, message: "Media released successfully.", status: "media_released" });
  } catch (error) {
    console.error("Error releasing media:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/mark-media-viewed
// Buyer confirms they have viewed the media
// ============================================================================
router.put("/:id/mark-media-viewed", async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_id } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "media_released") {
      return res.status(400).json({ success: false, message: "Media has not been released yet." });
    }
    if (eng.buyer_id !== buyer_id) {
      return res.status(403).json({ success: false, message: "Only the buyer can mark media as viewed." });
    }

    await db.query(
      `UPDATE broker_engagements SET status = 'media_viewed', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    await logHistory(id, "media_viewed", buyer_id, "buyer", "media_released", "media_viewed",
      "Buyer confirmed review of property media and documents.");
    await systemMessage(id, "👁️ Buyer has reviewed the property media and documents. Payment can now be submitted.");

    res.json({ success: true, message: "Media marked as viewed.", status: "media_viewed" });
  } catch (error) {
    console.error("Error marking media viewed:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/owner-submit-media
// Owner submits property video and documents (Step 8-9 transition)
// ============================================================================
router.put("/:id/owner-submit-media", async (req, res) => {
  try {
    const { id } = req.params;
    const { owner_id, video_url, video_file, additional_docs } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "fully_signed") {
      return res.status(400).json({ success: false, message: "Contract must be fully signed before submitting media. Current status: " + eng.status });
    }
    if (eng.owner_id !== owner_id) {
      return res.status(403).json({ success: false, message: "You are not the property owner" });
    }

    // Update property video URL
    if (video_url || video_file) {
      await db.query(
        "UPDATE properties SET video_url = ?, updated_at = NOW() WHERE id = ?",
        [video_url || video_file, eng.property_id]
      );
    }

    // Process additional documents if any
    if (additional_docs && Array.isArray(additional_docs)) {
      for (const doc of additional_docs) {
         // Generate access key
         const access_key = crypto.randomBytes(4).toString('hex').toUpperCase();
         
         await db.query(
           "INSERT INTO property_documents (property_id, document_name, document_path, document_type, access_key, uploaded_by) VALUES (?, ?, ?, 'other', ?, ?)",
           [eng.property_id, doc.name || 'Additional Media', doc.content || doc, access_key, owner_id]
         );
      }
    }
    await db.query(
      `UPDATE broker_engagements SET status = 'media_uploaded', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    await logHistory(id, "media_uploaded", owner_id, "owner", "fully_signed", "media_uploaded",
      "Owner submitted property video and additional media for verification.");
    await systemMessage(id, "🎥 Property owner has uploaded the media and documents. Awaiting admin verification and release.");

    // Notify admins
    const [admins] = await db.query("SELECT id FROM users WHERE role IN ('property_admin', 'system_admin', 'admin') LIMIT 5");
    for (const admin of admins) {
      await notifyUser(admin.id, "🎥 Media Submitted for Review",
        `Owner of engagement #${id} has submitted property media. Please review and release it.`, "info");
    }

    res.json({ success: true, message: "Media submitted successfully. Awaiting admin release.", status: "media_uploaded" });
  } catch (error) {
    console.error("Error submitting owner media:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/submit-payment
// Buyer submits payment details (Step 7)
// ============================================================================
router.put("/:id/submit-payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_id, payment_method, payment_reference, payment_receipt } = req.body;

    if (!payment_method || !payment_reference) {
      return res.status(400).json({ success: false, message: "Payment method and reference are required" });
    }

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "media_viewed" && eng.status !== "payment_rejected") {
      return res.status(400).json({ success: false, message: "Contract must be fully signed and media reviewed before payment. Current status: " + eng.status });
    }
    if (eng.buyer_id !== buyer_id) {
      return res.status(403).json({ success: false, message: "You are not the buyer" });
    }

    await db.query(
      `UPDATE broker_engagements SET
         status = 'payment_submitted', payment_method = ?, payment_reference = ?,
         payment_receipt = ?, payment_submitted_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [payment_method, payment_reference, payment_receipt || null, id]
    );

    await logHistory(id, "payment_submitted", buyer_id, "buyer", "media_viewed", "payment_submitted",
      `Buyer submitted payment via ${payment_method} (Ref: ${payment_reference})`,
      { payment_method, payment_reference, agreed_price: eng.agreed_price });
    await systemMessage(id, `Buyer has submitted payment of ${Number(eng.agreed_price).toLocaleString()} ETB via ${payment_method}. Reference: ${payment_reference}. Awaiting admin verification.`);

    // Notify admin
    const [admins] = await db.query("SELECT id FROM users WHERE role IN ('property_admin', 'system_admin', 'admin') LIMIT 5");
    for (const admin of admins) {
      await notifyUser(admin.id, "💰 Payment Submitted for Verification",
        `Buyer has submitted payment of ${Number(eng.agreed_price).toLocaleString()} ETB for engagement #${id}. Please verify.`, "info");
    }
    // Notify broker
    await notifyUser(eng.broker_id, "💰 Buyer Payment Submitted",
      `Your buyer has submitted payment of ${Number(eng.agreed_price).toLocaleString()} ETB. Awaiting admin verification.`, "info");

    res.json({ success: true, message: "Payment submitted successfully. Awaiting admin verification.", status: "payment_submitted" });
  } catch (error) {
    console.error("Error submitting payment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/verify-payment
// Admin verifies payment (Step 8)
// ============================================================================
router.put("/:id/verify-payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "payment_submitted") {
      return res.status(400).json({ success: false, message: "No payment to verify. Current status: " + eng.status });
    }

    await db.query(
      `UPDATE broker_engagements SET
         status = 'payment_verified', payment_verified_at = NOW(), payment_verified_by = ?, updated_at = NOW()
       WHERE id = ?`,
      [admin_id, id]
    );

    await logHistory(id, "payment_verified", admin_id, "admin", "payment_submitted", "payment_verified",
      "Admin verified payment has been received");
    await systemMessage(id, "Payment has been verified by admin. Funds are secured. Buyer can now confirm property handover.");

    // Notify buyer
    await notifyUser(eng.buyer_id, "✅ Payment Verified!",
      "Your payment has been verified. After you receive the property keys, please confirm handover.", "success");
    // Notify broker
    await notifyUser(eng.broker_id, "✅ Payment Verified!",
      "The buyer's payment has been verified. Please coordinate the property handover.", "success");
    // Notify owner
    await notifyUser(eng.owner_id, "✅ Payment Received & Verified!",
      `The payment of ${Number(eng.agreed_price).toLocaleString()} ETB has been secured. Please proceed with handing over the property, keys, and any required documents to the buyer.`, "success");

    res.json({ success: true, message: "Payment verified. Awaiting buyer handover confirmation.", status: "payment_verified" });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/reject-payment
// Admin rejects payment (Step 8a)
// ============================================================================
router.put("/:id/reject-payment", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, reason } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "payment_submitted") {
      return res.status(400).json({ success: false, message: "No payment to reject. Current status: " + eng.status });
    }

    await db.query(
      `UPDATE broker_engagements SET
         status = 'payment_rejected', updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    const logMsg = reason ? `Payment rejected by admin. Reason: ${reason}` : "Payment rejected by admin. Please resubmit.";
    await logHistory(id, "payment_rejected", admin_id, "admin", "payment_submitted", "payment_rejected", logMsg);
    await systemMessage(id, `❌ Admin rejected the submitted payment. Reason: ${reason || "Invalid or unconfirmed payment"}. Buyer must submit payment again.`);

    // Notify buyer
    await notifyUser(eng.buyer_id, "❌ Payment Rejected",
      `Your payment for engagement #${id} could not be verified. Please review and resubmit.`, "warning");
    // Notify broker
    await notifyUser(eng.broker_id, "❌ Payment Rejected",
      `The buyer's payment was rejected. They need to resubmit.`, "warning");

    res.json({ success: true, message: "Payment rejected. Buyer must resubmit.", status: "payment_rejected" });
  } catch (error) {
    console.error("Error rejecting payment:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/confirm-handover
// Buyer or Owner confirms property handover (Step 9)
// ============================================================================
router.put("/:id/confirm-handover", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "payment_verified") {
      return res.status(400).json({ success: false, message: "Payment must be verified first. Current status: " + eng.status });
    }
    if (eng.buyer_id !== user_id && eng.owner_id !== user_id) {
      return res.status(403).json({ success: false, message: "You are not authorized to confirm handover" });
    }

    const isBuyer = eng.buyer_id === user_id;
    const roleStr = isBuyer ? "Buyer" : "Owner";

    if (isBuyer) {
      await db.query("UPDATE broker_engagements SET buyer_handover_confirmed = true, updated_at = NOW() WHERE id = ?", [id]);
    } else {
      await db.query("UPDATE broker_engagements SET owner_handover_confirmed = true, updated_at = NOW() WHERE id = ?", [id]);
    }

    // Refetch strictly to guarantee accurate state evaluation regardless of SQL driver casting
    const [checkEng] = await db.query("SELECT buyer_handover_confirmed, owner_handover_confirmed FROM broker_engagements WHERE id = ?", [id]);
    const bConfirmed = checkEng[0].buyer_handover_confirmed === true || checkEng[0].buyer_handover_confirmed === 1 || checkEng[0].buyer_handover_confirmed === 'true';
    const oConfirmed = checkEng[0].owner_handover_confirmed === true || checkEng[0].owner_handover_confirmed === 1 || checkEng[0].owner_handover_confirmed === 'true';
    const bothConfirmed = bConfirmed && oConfirmed;

    if (bothConfirmed) {
      await db.query("UPDATE broker_engagements SET status = 'handover_confirmed', handover_confirmed_at = NOW(), updated_at = NOW() WHERE id = ?", [id]);
    }

    await logHistory(id, "handover_confirmed_partial", user_id, isBuyer ? "buyer" : "owner", "payment_verified", 
      bothConfirmed ? "handover_confirmed" : "payment_verified",
      `${roleStr} confirmed property handover` + (bothConfirmed ? " — Both parties have now confirmed" : " — Awaiting other party"));
      
    await systemMessage(id, `${roleStr} has confirmed property handover.` + 
      (bothConfirmed ? " Both parties confirmed. Admin can now release funds." : ` Awaiting confirmation from the ${isBuyer ? "owner" : "buyer"}.`));

    if (bothConfirmed) {
      // Notify admin
      const [admins] = await db.query("SELECT id FROM users WHERE role IN ('property_admin', 'system_admin', 'admin') LIMIT 5");
      for (const admin of admins) {
        await notifyUser(admin.id, "🔑 Handover Completed",
          `Both Buyer and Owner have confirmed handover for engagement #${id}. You can now release funds.`, "info");
      }
      
      await notifyUser(eng.broker_id, "🔑 Handover Completed", `Both parties have confirmed property handover.`, "success");
      await notifyUser(eng.owner_id, "🔑 Handover Completed", `Handover complete. Funds will be released shortly.`, "success");
      await notifyUser(eng.buyer_id, "🔑 Handover Completed", `Handover complete.`, "success");

      res.json({ success: true, message: "Handover fully confirmed. Admin will release funds.", status: "handover_confirmed" });
    } else {
      // Notify the counterpart
      const otherId = isBuyer ? eng.owner_id : eng.buyer_id;
      await notifyUser(otherId, "🔑 Handover Confirmation Needed",
        `The ${roleStr.toLowerCase()} has confirmed the property handover. Please click 'Confirm Handover' to finalize the process.`, "warning");

      res.json({ success: true, message: `Handover confirmed by ${roleStr}. Awaiting other party.`, status: "payment_verified" });
    }
  } catch (error) {
    console.error("Error confirming handover:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// PUT /api/broker-engagement/:id/release-funds
// Admin releases funds — three-way split (Step 10)
// ============================================================================
router.put("/:id/release-funds", async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_id, system_commission_pct, broker_commission_pct } = req.body;

    const [engagement] = await db.query("SELECT * FROM broker_engagements WHERE id = ?", [id]);
    if (engagement.length === 0) return res.status(404).json({ success: false, message: "Engagement not found" });

    const eng = engagement[0];
    if (eng.status !== "handover_confirmed") {
      return res.status(400).json({ success: false, message: "Handover must be confirmed first. Current status: " + eng.status });
    }

    const agreedPrice = Number(eng.agreed_price);
    const sysPct = Number(system_commission_pct || eng.system_commission_pct || 5);
    let brkPct = Number(broker_commission_pct || eng.agreed_commission_pct || eng.broker_commission_pct || 2);

    // Dual-Hiring Check: If property owner also hired this broker, give 3%
    try {
      const [propRows] = await db.query('SELECT broker_id FROM properties WHERE id = ?', [eng.property_id]);
      if (propRows.length > 0 && propRows[0].broker_id === eng.broker_id) {
         brkPct = 3;
      }
    } catch (e) {
      console.warn('Property lookup failed during commission calculation', e.message);
    }

    const sysAmount = Math.round(agreedPrice * sysPct / 100 * 100) / 100;
    const brkAmount = Math.round(agreedPrice * brkPct / 100 * 100) / 100;
    const ownerPayout = Math.round((agreedPrice - sysAmount - brkAmount) * 100) / 100;

    // Update engagement
    await db.query(
      `UPDATE broker_engagements SET
         status = 'completed',
         system_commission_pct = ?, broker_commission_pct = ?,
         system_commission_amount = ?, broker_commission_amount = ?, owner_payout_amount = ?,
         funds_released_at = NOW(), funds_released_by = ?, completed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [sysPct, brkPct, sysAmount, brkAmount, ownerPayout, admin_id, id]
    );

    // Record standard broker commission in commission_tracking
    try {
      await db.query(
        `INSERT INTO commission_tracking
           (broker_engagement_id, broker_id, property_id, agreement_amount, 
            customer_commission_percentage, owner_commission_percentage,
            customer_commission, owner_commission, total_commission, status, commission_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'deal')`,
        [id, eng.broker_id, eng.property_id, agreedPrice, 
         sysPct, brkPct, sysAmount, brkAmount, sysAmount + brkAmount]
      );
    } catch (commErr) {
      console.error("Commission tracking insert error (non-fatal):", commErr.message);
    }

    // Process 5-Property Broker Bonus
    try {
      if (eng.broker_id) {
        const [profileRows] = await db.query('SELECT completed_properties_count, bonus_eligible_value, total_bonus_earned FROM broker_profiles WHERE user_id = ?', [eng.broker_id]);
        if (profileRows.length > 0) {
           let count = (profileRows[0].completed_properties_count || 0) + 1;
           let eligibleVal = Number(profileRows[0].bonus_eligible_value || 0) + agreedPrice;
           let totalBonus = Number(profileRows[0].total_bonus_earned || 0);

           if (count >= 5) {
              // Awared 2% bonus from total deal values
              const bonusAmount = Math.round(eligibleVal * 0.02 * 100) / 100;
              await db.query(
                `INSERT INTO commission_tracking (broker_id, agreement_amount, owner_commission, total_commission, status, commission_type) 
                 VALUES (?, ?, ?, ?, 'paid', 'bonus')`,
                [eng.broker_id, eligibleVal, bonusAmount, bonusAmount]
              );
              
              totalBonus += bonusAmount;
              count = 0;
              eligibleVal = 0;
              
              // Send system message directly to the broker
              await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'success')", 
                [eng.broker_id, "🎁 5-Property Bonus Earned!", `Congratulations! You've completed 5 properties and earned a bonus of ${bonusAmount.toLocaleString()} ETB!`]
              );
           }

           await db.query(
             'UPDATE broker_profiles SET completed_properties_count = ?, bonus_eligible_value = ?, total_bonus_earned = ? WHERE user_id = ?',
             [count, eligibleVal, totalBonus, eng.broker_id]
           );
        }
      }
    } catch (bErr) {
       console.error("Bonus tracking error:", bErr.message);
    }

    await logHistory(id, "funds_released", admin_id, "admin", "handover_confirmed", "completed",
      `Funds released: Owner gets ${ownerPayout.toLocaleString()} ETB, Broker earns ${brkAmount.toLocaleString()} ETB (${brkPct}%), System fee ${sysAmount.toLocaleString()} ETB (${sysPct}%)`,
      { agreed_price: agreedPrice, system_pct: sysPct, broker_pct: brkPct, system_amount: sysAmount, broker_amount: brkAmount, owner_payout: ownerPayout });
    await systemMessage(id, `🎉 Funds released! Owner payout: ${ownerPayout.toLocaleString()} ETB | Broker commission: ${brkAmount.toLocaleString()} ETB (${brkPct}%) | System fee: ${sysAmount.toLocaleString()} ETB (${sysPct}%). Transaction complete!`);


    // Check if this is a rental engagement
    const isRental = eng.engagement_type === 'rent';

    if (isRental) {
      // Mark property as rented (not sold)
      try {
        await db.query("UPDATE properties SET status = 'rented' WHERE id = ?", [eng.property_id]);
      } catch (propErr) {
        console.error("Property status update error (non-fatal):", propErr.message);
      }

      // Auto-generate rental payment schedule for months 2+
      try {
        const rentalMonths = Number(eng.rental_duration_months) || 12;
        const scheduleCount = await generateRentalSchedule({
          brokerEngagementId: eng.id,
          tenantId: eng.buyer_id,
          ownerId: eng.owner_id,
          propertyId: eng.property_id,
          monthlyRent: agreedPrice,
          leaseDurationMonths: rentalMonths,
          paymentSchedule: eng.payment_schedule || 'monthly',
          brokerCommissionPct: brkPct,
          systemFeePct: sysPct,
          brokerId: eng.broker_id
        });
        console.log(`📅 Generated ${scheduleCount} rental payment installments for engagement #${id}`);
        await systemMessage(id, `📅 Rental payment schedule created with ${scheduleCount} upcoming installments (months 2-${rentalMonths}).`);
      } catch (schedErr) {
        console.error("Rental schedule generation error (non-fatal):", schedErr.message);
      }

      // Notify all parties (rental wording)
      await notifyUser(eng.buyer_id, "🎉 Lease Active!",
        `Your lease is now active. First month's rent processed. ${Number(eng.rental_duration_months || 12) - 1} future payments scheduled. Check your Rent Payments tab.`, "success");
      await notifyUser(eng.broker_id, "🎉 Commission Earned!",
        `Rental deal complete! You earned ${brkAmount.toLocaleString()} ETB (${brkPct}%) commission from the first month's rent.`, "success");
      await notifyUser(eng.owner_id, "🎉 Lease Finalized!",
        `Your rental property lease is active. First payout: ${ownerPayout.toLocaleString()} ETB. Future rent payments will be collected automatically.`, "success");
    } else {
      // Mark property as sold
      try {
        await db.query("UPDATE properties SET status = 'sold' WHERE id = ?", [eng.property_id]);
      } catch (propErr) {
        console.error("Property status update error (non-fatal):", propErr.message);
      }

      // Notify all parties (sale wording)
      await notifyUser(eng.buyer_id, "🎉 Purchase Complete!",
        `Congratulations! Your property purchase is complete. Total paid: ${agreedPrice.toLocaleString()} ETB.`, "success");
      await notifyUser(eng.broker_id, "🎉 Commission Earned!",
        `Deal complete! You earned ${brkAmount.toLocaleString()} ETB (${brkPct}%) commission.`, "success");
      await notifyUser(eng.owner_id, "🎉 Funds Released!",
        `Your payout of ${ownerPayout.toLocaleString()} ETB has been released. System fee: ${sysAmount.toLocaleString()} ETB, Broker commission: ${brkAmount.toLocaleString()} ETB.`, "success");
    }

    res.json({
      success: true,
      message: "Funds released. Transaction complete! 🎉",
      status: "completed",
      breakdown: {
        agreed_price: agreedPrice,
        system_commission: { percentage: sysPct, amount: sysAmount },
        broker_commission: { percentage: brkPct, amount: brkAmount },
        owner_payout: ownerPayout
      }
    });
  } catch (error) {
    console.error("Error releasing funds:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// ============================================================================
// GET /api/broker-engagement/broker/:brokerId/customers
// Get unique customers (buyers) for a broker
// ============================================================================
router.get("/broker/:brokerId/customers", async (req, res) => {
  try {
    const { brokerId } = req.params;
    const [customers] = await db.query(`
      SELECT DISTINCT u.id, u.name, u.email, u.phone,
             (SELECT COUNT(*) FROM broker_engagements WHERE broker_id = ? AND buyer_id = u.id) as engagement_count,
             (SELECT status FROM broker_engagements WHERE broker_id = ? AND buyer_id = u.id ORDER BY updated_at DESC LIMIT 1) as latest_status
      FROM users u
      JOIN broker_engagements be ON u.id = be.buyer_id
      WHERE be.broker_id = ?
      ORDER BY u.name ASC
    `, [brokerId, brokerId, brokerId]);
    
    res.json({ success: true, customers });
  } catch (error) {
    console.error("Error fetching broker customers:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
