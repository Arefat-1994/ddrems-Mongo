const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');

// Request document access
router.post('/request', async (req, res) => {
  try {
    const { property_id, user_id } = req.body;
    
    // Check if request already exists
    const [existing] = await db.query(
      'SELECT * FROM document_access WHERE property_id = ? AND user_id = ? AND status = "pending"',
      [property_id, user_id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Access request already pending' });
    }
    
    const [result] = await db.query(
      'INSERT INTO document_access (property_id, user_id, status) VALUES (?, ?, "pending")',
      [property_id, user_id]
    );
    
    res.json({ id: result.insertId, message: 'Access request submitted successfully' });
  } catch (error) {
    console.error('Document access request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get access requests for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT da.*, u.name as user_name, u.email as user_email
      FROM document_access da
      JOIN users u ON da.user_id = u.id
      WHERE da.property_id = ?
      ORDER BY da.requested_at DESC
    `, [req.params.propertyId]);
    
    res.json(requests);
  } catch (error) {
    console.error('Get property access requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's access requests
router.get('/user/:userId', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT da.*, p.title as property_title, p.location as property_location
      FROM document_access da
      JOIN properties p ON da.property_id = p.id
      WHERE da.user_id = ?
      ORDER BY da.requested_at DESC
    `, [req.params.userId]);
    
    res.json(requests);
  } catch (error) {
    console.error('Get user access requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve/Reject access request
router.put('/:id/respond', async (req, res) => {
  try {
    const { status, response_message } = req.body; // 'approved' or 'rejected'
    
    await db.query(
      'UPDATE document_access SET status = ?, response_message = ?, responded_at = NOW() WHERE id = ?',
      [status, response_message || null, req.params.id]
    );
    
    res.json({ 
      message: `Access request ${status} successfully`
    });
  } catch (error) {
    console.error('Respond to access request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
