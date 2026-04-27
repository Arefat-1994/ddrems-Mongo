const express = require("express");
const router = express.Router();
const db = require("../config/db");
const crypto = require("crypto");

// --- CUSTOMER ENDPOINTS ---

// Create a new request (Key or Agreement)
router.post("/", async (req, res) => {
  try {
    const { property_id, customer_id, request_message } = req.body;

    // Get owner_id from property
    const [properties] = await db.query(
      "SELECT owner_id, title FROM properties WHERE id = ?",
      [property_id],
    );
    if (properties.length === 0)
      return res.status(404).json({ message: "Property not found" });

    const owner_id = properties[0].owner_id;

    // Check for existing pending request of same type
    const [existing] = await db.query(
      "SELECT id FROM agreement_requests WHERE property_id = ? AND customer_id = ? AND status = 'pending'",
      [property_id, customer_id],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message:
          "You already have a pending agreement request for this property.",
      });
    }

    const [result] = await db.query(
      "INSERT INTO agreement_requests (property_id, customer_id, owner_id, customer_notes) VALUES (?, ?, ?, ?)",
      [property_id, customer_id, owner_id, request_message],
    );

    res
      .status(201)
      .json({ id: result.insertId, message: "Agreement request submitted!" });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get customer's requests
router.get("/customer/:userId", async (req, res) => {
  try {
    const [requests] = await db.query(
      `
      SELECT ar.*, p.title as property_title, p.location as property_location, 'agreement' as request_type
      FROM agreement_requests ar
      JOIN properties p ON ar.property_id = p.id
      WHERE ar.customer_id = ?
      ORDER BY ar.created_at DESC
    `,
      [req.params.userId],
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// --- ADMIN ENDPOINTS ---

// Get all pending requests for admin
router.get("/admin/pending", async (req, res) => {
  try {
    let propertyAdminId = req.query.admin_id;
    
    // If not in query, try to get from authenticated user object
    if (!propertyAdminId && req.user && req.user.id) {
      propertyAdminId = req.user.id;
    }
    
    let query = `
      SELECT ar.*, p.title as property_title, u.name as customer_name, u.email as customer_email, 'agreement' as request_type
      FROM agreement_requests ar
      JOIN properties p ON ar.property_id = p.id
      JOIN users u ON ar.customer_id = u.id
      WHERE ar.status IN ('pending', 'pending_admin_review') AND ar.forwarded_to_owner_date IS NULL
    `;
    
    const params = [];
    
    if (propertyAdminId && propertyAdminId !== 'undefined' && propertyAdminId !== 'null') {
      query += ` AND (p.property_admin_id = ? OR p.property_admin_id IS NULL)`;
      params.push(propertyAdminId);
    }
    
    query += ` ORDER BY ar.created_at DESC`;
    
    const [requests] = await db.query(query, params);
    res.json(requests);
  } catch (error) {
    console.error("Fetch admin pending agreement requests error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Preview key before sending
router.get("/:id/preview-key", async (req, res) => {
  try {
    const [requests] = await db.query(
      "SELECT property_id FROM agreement_requests WHERE id = ?",
      [req.params.id],
    );
    if (requests.length === 0)
      return res.status(404).json({ message: "Request not found" });

    const [docs] = await db.query(
      "SELECT access_key FROM property_documents WHERE property_id = ? LIMIT 1",
      [requests[0].property_id],
    );

    // If no key exists in documents, suggest a new one
    const key_code =
      docs.length > 0
        ? docs[0].access_key
        : crypto.randomBytes(4).toString("hex").toUpperCase();

    res.json({ key_code, is_new: docs.length === 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get recent history for admin (both types)
router.get("/admin/history", async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT ar.*, p.title as property_title, u.name as customer_name, 'agreement' as request_type
      FROM agreement_requests ar
      JOIN properties p ON ar.property_id = p.id
      JOIN users u ON ar.customer_id = u.id
      WHERE ar.status IN ('owner_accepted', 'owner_rejected', 'completed', 'suspended', 'forwarded')
         OR ar.forwarded_to_owner_date IS NOT NULL
      ORDER BY ar.updated_at DESC LIMIT 50
    `);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Respond to agreement request (This is usually handled by Owner/Broker, but Admin can also respond if needed)
router.put("/:id/respond-admin", async (req, res) => {
  try {
    const { status, response_message, admin_id } = req.body;
    await db.query(
      "UPDATE agreement_requests SET status = ?, response_message = ?, admin_id = ?, responded_at = NOW() WHERE id = ?",
      [status, response_message, admin_id, req.params.id],
    );
    res.json({ message: "Agreement response successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Forward agreement request to owner
router.put("/:id/forward", async (req, res) => {
  try {
    const { admin_id, response_message } = req.body;

    const [requests] = await db.query(
      "SELECT ar.*, p.title as property_title FROM agreement_requests ar JOIN properties p ON ar.property_id = p.id WHERE ar.id = ?",
      [req.params.id],
    );

    if (requests.length === 0)
      return res.status(404).json({ message: "Request not found" });
    const request = requests[0];

    await db.query(
      "UPDATE agreement_requests SET admin_action = ?, admin_action_date = NOW(), admin_notes = ?, forwarded_to_owner_date = NOW(), updated_at = NOW() WHERE id = ?",
      [
        admin_id,
        response_message || "Forwarded for owner approval",
        req.params.id,
      ],
    );

    if (request.owner_id) {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)",
        [
          request.owner_id,
          "Forwarded Agreement",
          `A new agreement request for ${request.property_title} needs your review.`,
          "info",
          req.params.id,
        ],
      );
    }

    res.json({ message: "Agreement forwarded to owner" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// --- OWNER & BROKER ENDPOINTS ---

// Get owner's requests
router.get("/owner/:ownerId", async (req, res) => {
  try {
    const [requests] = await db.query(
      `
      SELECT ar.*, p.title as property_title, p.listing_type as property_listing_type, u.name as customer_name, 'agreement' as request_type
      FROM agreement_requests ar
      JOIN properties p ON ar.property_id = p.id
      JOIN users u ON ar.customer_id = u.id
      WHERE ar.owner_id = ? AND ar.status IN ('pending_admin_review', 'forwarded', 'pending')
      ORDER BY ar.created_at DESC
    `,
      [req.params.ownerId],
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get broker's requests
router.get("/broker/:brokerId", async (req, res) => {
  try {
    const [requests] = await db.query(
      `
      SELECT ar.*, p.title as property_title, u.name as customer_name, 'agreement' as request_type
      FROM agreement_requests ar
      JOIN properties p ON ar.property_id = p.id
      JOIN users u ON ar.customer_id = u.id
      WHERE p.broker_id = ?
      ORDER BY ar.created_at DESC
    `,
      [req.params.brokerId],
    );
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update final status (Owner/Broker)
router.put("/:id/respond", async (req, res) => {
  try {
    const { status, response_message, responded_by } = req.body; // accepted, rejected
    const [requestRows] = await db.query(
      "SELECT * FROM agreement_requests WHERE id = ?",
      [req.params.id],
    );
    if (requestRows.length === 0)
      return res.status(404).json({ message: "Agreement request not found" });

    const request = requestRows[0];

    await db.query(
      "UPDATE agreement_requests SET status = ?, response_message = ?, responded_by = ?, updated_at = NOW(), responded_at = NOW() WHERE id = ?",
      [status, response_message, responded_by || null, req.params.id],
    );

    // If accepted, create master agreement entry and generate document
    if (status === "accepted") {
      // Prevent duplicates
      const [existing] = await db.query(
        `SELECT id FROM agreements WHERE property_id = ? AND (customer_id = ? OR user_id = ?) AND owner_id = ? AND status IN ('pending', 'active') LIMIT 1`,
        [
          request.property_id,
          request.customer_id,
          request.customer_id,
          request.owner_id,
        ],
      );

      let agreementId;
      if (existing.length === 0) {
        const [insertResult] = await db.query(
          "INSERT INTO agreements (property_id, owner_id, customer_id, user_id, broker_id, agreement_text, status, agreement_type, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            request.property_id,
            request.owner_id,
            request.customer_id,
            request.customer_id,
            request.broker_id || responded_by || null,
            response_message || request.request_message || "Agreement accepted",
            "pending",
            "sale",
            0,
          ],
        );
        agreementId = insertResult.insertId;
      } else {
        agreementId = existing[0].id;
      }

      // Generate the agreement document automatically
      try {
        const [agreements] = await db.query(
          `
          SELECT a.*, p.title, p.location, p.price, p.type, p.area, p.status as property_status, p.id as prop_id
          FROM agreements a JOIN properties p ON a.property_id = p.id WHERE a.id = ?
        `,
          [agreementId],
        );

        if (agreements.length > 0) {
          const agr = agreements[0];

          // Fetch the final agreed price from agreement_requests
          const [agrReq] = await db.query(
            "SELECT proposed_price, property_price FROM agreement_requests WHERE id = ?",
            [request.id],
          );
          const finalPrice =
            agrReq.length > 0
              ? agrReq[0].proposed_price ||
                agrReq[0].property_price ||
                agr.price
              : agr.price;

          const [owners] = await db.query(
            "SELECT name, email, phone FROM users WHERE id = ?",
            [agr.owner_id],
          );
          const [customers] = await db.query(
            "SELECT name, email, phone FROM users WHERE id = ?",
            [agr.customer_id || agr.user_id],
          );
          const [ownerDocs] = await db.query(
            "SELECT document_name, document_type FROM property_documents WHERE property_id = ?",
            [agr.prop_id],
          );

          let customerDocs = [];
          try {
            const [cp] = await db.query(
              "SELECT id_document FROM customer_profiles WHERE user_id = ?",
              [agr.customer_id || agr.user_id],
            );
            if (cp.length > 0 && cp[0].id_document)
              customerDocs.push({
                document_name: "ID Document",
                document_type: "identification",
              });
          } catch (e) {}

          const owner = owners[0] || {
            name: "N/A",
            email: "N/A",
            phone: "N/A",
          };
          const customer = customers[0] || {
            name: "N/A",
            email: "N/A",
            phone: "N/A",
          };
          const property = {
            title: agr.title,
            location: agr.location,
            price: finalPrice,
            type: agr.type,
            area: agr.area,
            status: agr.property_status,
          };

          const today = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const html = `<div class="agreement-doc"><h2>DDREMS Property Agreement #${agreementId}</h2><p>Date: ${today}</p><h3>Property: ${property.title} - ${property.location}</h3><p><strong>Agreed Price: ${Number(property.price || 0).toLocaleString()} ETB</strong></p><h3>Owner: ${owner.name} (${owner.email})</h3><h3>Customer: ${customer.name} (${customer.email})</h3><p>Terms: ${agr.agreement_text || "To be specified"}</p></div>`;

          await db.query(
            "UPDATE agreements SET agreement_html = ?, updated_at = NOW() WHERE id = ?",
            [html, agreementId],
          );
        }
      } catch (docErr) {
        console.error("Auto-generate document warning:", docErr.message);
        // Non-critical: agreement is still created even if doc generation fails
      }

      // Notify customer about acceptance with agreement link
      if (request.customer_id) {
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)",
          [
            request.customer_id,
            "Agreement Request Accepted! 🎉",
            response_message
              ? `Your agreement request has been accepted! ${response_message}. The agreement document is now available for review and signing.`
              : "Your agreement request has been accepted! The agreement document is now available for you to review, fill in required fields, and sign.",
            "success",
            agreementId,
          ],
        );
      }

      // Notify owner/broker of the created agreement
      const notifyTo = [request.owner_id, request.broker_id].filter(
        (id, idx, arr) =>
          id && arr.indexOf(id) === idx && id !== request.customer_id,
      );
      for (const recipientId of notifyTo) {
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type, related_id) VALUES (?, ?, ?, ?, ?)",
          [
            recipientId,
            "Agreement Created",
            `Agreement #${agreementId} has been created and sent to the customer for review and signing.`,
            "info",
            agreementId,
          ],
        );
      }
    } else if (status === "counter_offer") {
      // Counter offer — notify customer
      if (request.customer_id) {
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
          [
            request.customer_id,
            "Counter Offer Received 🔄",
            response_message ||
              "The owner has sent a counter offer for your agreement request.",
            "info",
          ],
        );
      }
    } else {
      // Rejected — notify customer
      if (request.customer_id) {
        await db.query(
          "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
          [
            request.customer_id,
            "Agreement Request Rejected",
            response_message || "Your agreement request has been rejected.",
            "error",
          ],
        );
      }
    }

    res.json({ message: `Request ${status} successfully` });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Send agreement to recipient
router.post("/:id/send-agreement", async (req, res) => {
  try {
    const { admin_id, recipient_id } = req.body;
    const [rows] = await db.query(
      "SELECT * FROM agreement_requests WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Agreement not found" });

    // Update status to forwarded
    await db.query(
      "UPDATE agreement_requests SET status = 'forwarded', forwarded_to_owner_date = NOW(), updated_at = NOW() WHERE id = ?",
      [req.params.id],
    );

    // Notify recipient if provided
    if (recipient_id) {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [
          recipient_id,
          "Agreement Sent",
          "An agreement has been sent to you for review.",
          "info",
        ],
      );
    }

    const [recipient] = recipient_id
      ? await db.query("SELECT name FROM users WHERE id = ?", [recipient_id])
      : [[]];

    res.json({
      success: true,
      message: `Agreement sent to ${recipient[0]?.name || "recipient"} successfully`,
    });
  } catch (error) {
    console.error("Send agreement error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Notify parties about agreement
router.post("/:id/notify", async (req, res) => {
  try {
    const { user_id, notification_message } = req.body;
    const [rows] = await db.query(
      "SELECT * FROM agreement_requests WHERE id = ?",
      [req.params.id],
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Agreement not found" });

    if (user_id) {
      await db.query(
        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
        [
          user_id,
          "Agreement Update",
          notification_message || "Your agreement has been updated.",
          "info",
        ],
      );
    }

    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
