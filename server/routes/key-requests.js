const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');

// --- CUSTOMER ENDPOINTS ---

// Create a new key request
router.post('/', async (req, res) => {
  try {
    const { property_id, customer_id, request_message } = req.body;

    // Get owner_id from property
    const [properties] = await db.query('SELECT owner_id, title FROM properties WHERE id = ?', [property_id]);
    if (properties.length === 0) return res.status(404).json({ message: 'Property not found' });
    
    const owner_id = properties[0].owner_id;

    // Check for existing pending request
    const [existing] = await db.query(
      'SELECT id FROM request_key WHERE property_id = ? AND customer_id = ? AND status = "pending"',
      [property_id, customer_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You already have a pending key request for this property.' });
    }

    const [result] = await db.query(
      'INSERT INTO request_key (property_id, customer_id, owner_id, request_message) VALUES (?, ?, ?, ?)',
      [property_id, customer_id, owner_id, request_message]
    );

    // Notify Admins
    const [admins] = await db.query('SELECT id FROM users WHERE role = "property_admin"');
    for (const admin of admins) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [admin.id, 'New Key Request', `A new key request for ${properties[0].title}`, 'info']
      );
    }

    res.status(201).json({ id: result.insertId, message: 'Key request submitted successfully!' });
  } catch (error) {
    console.error('Create key request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get customer's key requests
router.get('/customer/:userId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT rk.*, p.title as property_title, p.location as property_location, 'key' as request_type
      FROM request_key rk
      JOIN properties p ON rk.property_id = p.id
      WHERE rk.customer_id = ?
      ORDER BY rk.created_at DESC
    `, [req.params.userId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- ADMIN ENDPOINTS ---

// Get all pending key requests for admin
router.get('/admin/pending', async (req, res) => {
  try {
    // Get the property admin ID from query params, header, or use the requesting user's ID
    let propertyAdminId = req.query.admin_id || req.headers['x-admin-id'];
    
    // If no admin_id provided, use the current user's ID (for single admin setup)
    if (!propertyAdminId && req.user && req.user.id) {
      propertyAdminId = req.user.id;
    }
    
    let query = `
      SELECT rk.*, p.title as property_title, u.name as customer_name, u.email as customer_email, 'key' as request_type
      FROM request_key rk
      JOIN properties p ON rk.property_id = p.id
      JOIN users u ON rk.customer_id = u.id
      WHERE rk.status = 'pending'
    `;
    
    const params = [];
    
    // If property_admin_id is provided, filter by it
    if (propertyAdminId) {
      query += ` AND p.property_admin_id = ?`;
      params.push(propertyAdminId);
    }
    
    query += ` ORDER BY rk.created_at DESC`;
    
    const [requests] = await db.query(query, params);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Preview key before sending
router.get('/:id/preview-key', async (req, res) => {
  try {
    const [requests] = await db.query('SELECT property_id FROM request_key WHERE id = ?', [req.params.id]);
    if (requests.length === 0) return res.status(404).json({ message: 'Request not found' });
    
    const [docs] = await db.query('SELECT access_key FROM property_documents WHERE property_id = ? LIMIT 1', [requests[0].property_id]);
    const key_code = docs.length > 0 ? docs[0].access_key : crypto.randomBytes(4).toString('hex').toUpperCase();
    
    res.json({ key_code, is_new: docs.length === 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Respond to key request
router.put('/:id/respond-key', async (req, res) => {
  try {
    const { status, response_message, admin_id, key_code: provided_key } = req.body;
    const requestId = req.params.id;

    const [requests] = await db.query('SELECT property_id, customer_id FROM request_key WHERE id = ?', [requestId]);
    if (requests.length === 0) return res.status(404).json({ message: 'Request not found' });
    
    const request = requests[0];
    let final_key = provided_key;

    if (status === 'accepted' && !final_key) {
      const [docs] = await db.query('SELECT access_key FROM property_documents WHERE property_id = ? LIMIT 1', [request.property_id]);
      final_key = docs.length > 0 ? docs[0].access_key : crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    await db.query(
      'UPDATE request_key SET status = ?, key_code = ?, response_message = ?, admin_id = ?, responded_at = NOW() WHERE id = ?',
      [status, final_key, response_message, admin_id, requestId]
    );

    // Notify customer
    await db.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [request.customer_id, `Key Request ${status === 'accepted' ? 'Approved' : 'Rejected'}`, 
       status === 'accepted' ? `Your key is: ${final_key}` : response_message,
       status === 'accepted' ? 'success' : 'error', 'request']
    );

    res.json({ message: 'Key request processed', key_code: final_key });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get key request history for admin
router.get('/admin/history', async (req, res) => {
  try {
    // Get the property admin ID from query params, header, or use the requesting user's ID
    let propertyAdminId = req.query.admin_id || req.headers['x-admin-id'];
    
    // If no admin_id provided, use the current user's ID (for single admin setup)
    if (!propertyAdminId && req.user && req.user.id) {
      propertyAdminId = req.user.id;
    }
    
    let query = `
      SELECT rk.*, p.title as property_title, u.name as customer_name, 'key' as request_type
      FROM request_key rk
      JOIN properties p ON rk.property_id = p.id
      JOIN users u ON rk.customer_id = u.id
      WHERE rk.status IN ('accepted', 'rejected', 'cancelled')
    `;
    
    const params = [];
    
    // If property_admin_id is provided, filter by it
    if (propertyAdminId) {
      query += ` AND p.property_admin_id = ?`;
      params.push(propertyAdminId);
    }
    
    query += ` ORDER BY rk.responded_at DESC LIMIT 50`;
    
    const [history] = await db.query(query, params);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker's key requests
router.get('/broker/:brokerId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT rk.*, p.title as property_title, u.name as customer_name, 'key' as request_type
      FROM request_key rk
      JOIN properties p ON rk.property_id = p.id
      JOIN users u ON rk.customer_id = u.id
      WHERE p.broker_id = ?
      ORDER BY rk.created_at DESC
    `, [req.params.brokerId]);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
