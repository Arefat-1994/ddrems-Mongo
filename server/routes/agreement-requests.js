const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const { AgreementRequests, Properties, Users, Notifications, Agreements, PropertyDocuments } = require("../models");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// --- CUSTOMER ENDPOINTS ---

// Create a new request (Key or Agreement)
router.post("/", async (req, res) => {
  try {
    const { property_id, customer_id, request_message } = req.body;

    if (!isValidId(property_id)) return res.status(400).json({ message: "Invalid property ID" });

    const property = await Properties.findById(property_id).select("owner_id title");
    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check for existing pending request
    const existing = await AgreementRequests.findOne({
      property_id, customer_id, status: "pending"
    });
    if (existing) {
      return res.status(400).json({ message: "You already have a pending agreement request for this property." });
    }

    const newReq = await AgreementRequests.create({
      property_id,
      customer_id: isValidId(customer_id) ? customer_id : null,
      owner_id: property.owner_id,
      customer_notes: request_message,
      status: "pending",
      request_date: new Date()
    });

    res.status(201).json({ id: newReq._id, message: "Agreement request submitted!" });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get customer's requests
router.get("/customer/:userId", async (req, res) => {
  try {
    if (!isValidId(req.params.userId)) return res.json([]);

    const requests = await AgreementRequests.aggregate([
      { $match: { customer_id: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: "properties", localField: "property_id", foreignField: "_id", as: "property" } },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: "$_id",
        property_title: "$property.title",
        property_location: "$property.location",
        request_type: "agreement"
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// --- ADMIN ENDPOINTS ---

// Get all pending requests for admin
router.get("/admin/pending", async (req, res) => {
  try {
    const matchQuery = {
      status: { $in: ["pending", "pending_admin_review"] },
      forwarded_to_owner_date: { $eq: null }
    };

    const requests = await AgreementRequests.aggregate([
      { $match: matchQuery },
      { $lookup: { from: "properties", localField: "property_id", foreignField: "_id", as: "property" } },
      { $lookup: { from: "users", localField: "customer_id", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: "$_id",
        property_title: "$property.title",
        customer_name: "$customer.name",
        customer_email: "$customer.email",
        request_type: "agreement"
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) {
    console.error("Fetch admin pending agreement requests error:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Preview key before sending
router.get("/:id/preview-key", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });
    
    const request = await AgreementRequests.findById(req.params.id).select("property_id");
    if (!request) return res.status(404).json({ message: "Request not found" });

    const doc = await PropertyDocuments.findOne({ property_id: request.property_id }).select("access_key");
    const key_code = doc?.access_key || crypto.randomBytes(4).toString("hex").toUpperCase();

    res.json({ key_code, is_new: !doc?.access_key });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get recent history for admin
router.get("/admin/history", async (req, res) => {
  try {
    const history = await AgreementRequests.aggregate([
      { $match: {
        $or: [
          { status: { $in: ["owner_accepted", "owner_rejected", "completed", "suspended", "forwarded"] } },
          { forwarded_to_owner_date: { $ne: null } }
        ]
      }},
      { $lookup: { from: "properties", localField: "property_id", foreignField: "_id", as: "property" } },
      { $lookup: { from: "users", localField: "customer_id", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: "$_id",
        property_title: "$property.title",
        customer_name: "$customer.name",
        request_type: "agreement"
      }},
      { $sort: { updated_at: -1 } },
      { $limit: 50 }
    ]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Respond to agreement request (admin)
router.put("/:id/respond-admin", async (req, res) => {
  try {
    const { status, response_message, admin_id } = req.body;
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    await AgreementRequests.findByIdAndUpdate(req.params.id, {
      status, response_message,
      admin_action: admin_id,
      responded_at: new Date(),
      updated_at: new Date()
    });
    res.json({ message: "Agreement response successful" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Forward agreement request to owner
router.put("/:id/forward", async (req, res) => {
  try {
    const { admin_id, response_message } = req.body;
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const request = await AgreementRequests.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    const property = await Properties.findById(request.property_id).select("title");

    await AgreementRequests.findByIdAndUpdate(req.params.id, {
      admin_action: admin_id,
      admin_action_date: new Date(),
      admin_notes: response_message || "Forwarded for owner approval",
      forwarded_to_owner_date: new Date(),
      updated_at: new Date()
    });

    if (request.owner_id) {
      await Notifications.create({
        user_id: request.owner_id,
        title: "Forwarded Agreement",
        message: `A new agreement request for ${property?.title || 'a property'} needs your review.`,
        type: "info",
        related_id: req.params.id
      });
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
    if (!isValidId(req.params.ownerId)) return res.json([]);

    const requests = await AgreementRequests.aggregate([
      { $match: {
        owner_id: new mongoose.Types.ObjectId(req.params.ownerId),
        status: { $in: ["pending_admin_review", "forwarded", "pending"] }
      }},
      { $lookup: { from: "properties", localField: "property_id", foreignField: "_id", as: "property" } },
      { $lookup: { from: "users", localField: "customer_id", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: "$_id",
        property_title: "$property.title",
        property_listing_type: "$property.listing_type",
        customer_name: "$customer.name",
        request_type: "agreement"
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get broker's requests
router.get("/broker/:brokerId", async (req, res) => {
  try {
    if (!isValidId(req.params.brokerId)) return res.json([]);

    const requests = await AgreementRequests.aggregate([
      { $lookup: { from: "properties", localField: "property_id", foreignField: "_id", as: "property" } },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      { $match: { "property.broker_id": new mongoose.Types.ObjectId(req.params.brokerId) } },
      { $lookup: { from: "users", localField: "customer_id", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: "$_id",
        property_title: "$property.title",
        customer_name: "$customer.name",
        request_type: "agreement"
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update final status (Owner/Broker respond)
router.put("/:id/respond", async (req, res) => {
  try {
    const { status, response_message, responded_by } = req.body;
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const request = await AgreementRequests.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Agreement request not found" });

    await AgreementRequests.findByIdAndUpdate(req.params.id, {
      status, response_message,
      responded_by: isValidId(responded_by) ? responded_by : null,
      updated_at: new Date(),
      responded_at: new Date()
    });

    // Notify customer based on status
    if (status === "accepted" && request.customer_id) {
      await Notifications.create({
        user_id: request.customer_id,
        title: "Agreement Request Accepted! 🎉",
        message: response_message
          ? `Your agreement request has been accepted! ${response_message}`
          : "Your agreement request has been accepted!",
        type: "success"
      });
    } else if (status === "counter_offer" && request.customer_id) {
      await Notifications.create({
        user_id: request.customer_id,
        title: "Counter Offer Received 🔄",
        message: response_message || "The owner has sent a counter offer for your agreement request.",
        type: "info"
      });
    } else if (request.customer_id) {
      await Notifications.create({
        user_id: request.customer_id,
        title: "Agreement Request Rejected",
        message: response_message || "Your agreement request has been rejected.",
        type: "error"
      });
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
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const request = await AgreementRequests.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Agreement not found" });

    await AgreementRequests.findByIdAndUpdate(req.params.id, {
      status: "forwarded",
      forwarded_to_owner_date: new Date(),
      updated_at: new Date()
    });

    if (recipient_id && isValidId(recipient_id)) {
      await Notifications.create({
        user_id: recipient_id,
        title: "Agreement Sent",
        message: "An agreement has been sent to you for review.",
        type: "info"
      });
    }

    const recipient = recipient_id && isValidId(recipient_id) ? await Users.findById(recipient_id).select("name") : null;

    res.json({
      success: true,
      message: `Agreement sent to ${recipient?.name || "recipient"} successfully`
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
    if (!isValidId(req.params.id)) return res.status(400).json({ message: "Invalid ID" });

    const request = await AgreementRequests.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Agreement not found" });

    if (user_id && isValidId(user_id)) {
      await Notifications.create({
        user_id,
        title: "Agreement Update",
        message: notification_message || "Your agreement has been updated.",
        type: "info"
      });
    }

    res.json({ success: true, message: "Notification sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
