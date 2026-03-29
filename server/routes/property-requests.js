const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get broker's property requests
router.get('/broker/:brokerId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, 
             p.title as property_title, 
             p.location as property_location, 
             p.price as property_price,
             p.main_image as property_image,
             owner.name as owner_name
      FROM property_requests pr
      JOIN properties p ON pr.property_id = p.id
      LEFT JOIN users owner ON pr.owner_id = owner.id
      WHERE pr.broker_id = ?
      ORDER BY pr.created_at DESC
    `, [req.params.brokerId]);

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get owner's property requests
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT pr.*, 
             p.title as property_title, 
             p.location as property_location, 
             p.price as property_price,
             broker.name as broker_name,
             broker.email as broker_email
      FROM property_requests pr
      JOIN properties p ON pr.property_id = p.id
      JOIN users broker ON pr.broker_id = broker.id
      WHERE pr.owner_id = ? AND pr.status = 'pending'
      ORDER BY pr.created_at DESC
    `, [req.params.ownerId]);

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create property request
router.post('/', async (req, res) => {
  try {
    const { property_id, broker_id, request_type, request_message } = req.body;

    // Get property owner
    const [properties] = await db.query(
      'SELECT owner_id FROM properties WHERE id = ?',
      [property_id]
    );

    if (properties.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const ownerId = properties[0].owner_id;

    // Check if request already exists
    const [existing] = await db.query(
      'SELECT * FROM property_requests WHERE property_id = ? AND broker_id = ? AND status = "pending"',
      [property_id, broker_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You already have a pending request for this property' });
    }

    const [result] = await db.query(
      `INSERT INTO property_requests (property_id, broker_id, owner_id, request_type, request_message, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [property_id, broker_id, ownerId, request_type, request_message]
    );

    // Create notification for owner
    if (ownerId) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, related_id)
         VALUES (?, 'New Property Request', 'A broker has sent you a property request', 'info', ?)`,
        [ownerId, result.insertId]
      );
    }

    res.status(201).json({
      message: 'Property request sent successfully',
      requestId: result.insertId
    });
  } catch (error) {
    console.error('Create property request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Respond to property request
router.put('/:id/respond', async (req, res) => {
  try {
    const { status, response_message } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Get request details
    const [requests] = await db.query(
      'SELECT * FROM property_requests WHERE id = ?',
      [req.params.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: 'Request not found' });
    }

    const request = requests[0];

    // Update request
    await db.query(
      `UPDATE property_requests 
       SET status = ?, response_message = ?, responded_at = NOW()
       WHERE id = ?`,
      [status, response_message, req.params.id]
    );

    // Create notification for broker
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Property Request ${status === 'accepted' ? 'Accepted' : 'Rejected'}', ?, '${status === 'accepted' ? 'success' : 'error'}')`,
      [request.broker_id, response_message || `Your property request has been ${status}`]
    );

    res.json({ message: `Request ${status} successfully` });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
