const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get verification status for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [verification] = await db.query(`
      SELECT pv.*, u.name as verified_by_name
      FROM property_verification pv
      LEFT JOIN users u ON pv.verified_by = u.id
      WHERE pv.property_id = ?
      ORDER BY pv.created_at DESC
      LIMIT 1
    `, [req.params.propertyId]);
    
    res.json(verification[0] || null);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all pending verifications
router.get('/pending', async (req, res) => {
  try {
    const [verifications] = await db.query(`
      SELECT pv.*, p.title as property_title, p.location, u.name as owner_name
      FROM property_verification pv
      JOIN properties p ON pv.property_id = p.id
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE pv.verification_status = 'pending'
      ORDER BY pv.created_at DESC
    `);
    
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create verification record
router.post('/', async (req, res) => {
  try {
    const { property_id } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO property_verification (property_id) VALUES (?)',
      [property_id]
    );
    
    res.json({ id: result.insertId, message: 'Verification record created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update verification status (Approve/Reject/Suspend)
router.put('/:id', async (req, res) => {
  try {
    const { verification_status, verification_notes, verified_by } = req.body;
    
    await db.query(
      'UPDATE property_verification SET verification_status = ?, verification_notes = ?, verified_by = ?, verified_at = NOW() WHERE id = ?',
      [verification_status, verification_notes, verified_by, req.params.id]
    );
    
    // Update property status based on verification
    const [verification] = await db.query('SELECT property_id FROM property_verification WHERE id = ?', [req.params.id]);
    
    if (verification.length > 0) {
      let propertyStatus = 'active';
      if (verification_status === 'rejected') propertyStatus = 'inactive';
      if (verification_status === 'suspended') propertyStatus = 'suspended';
      
      await db.query(
        'UPDATE properties SET status = ? WHERE id = ?',
        [propertyStatus, verification[0].property_id]
      );
    }
    
    res.json({ message: `Property ${verification_status} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
