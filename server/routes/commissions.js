const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get commissions for a broker
router.get('/broker/:brokerId', async (req, res) => {
  try {
    const [commissions] = await db.query(`
      SELECT ct.*, p.title as property_title, p.price
      FROM commission_tracking ct
      JOIN properties p ON ct.property_id = p.id
      WHERE ct.broker_id = ?
      ORDER BY ct.created_at DESC
    `, [req.params.brokerId]);
    
    res.json(commissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get commission summary for a broker
router.get('/broker/:brokerId/summary', async (req, res) => {
  try {
    const [summary] = await db.query(`
      SELECT 
        COUNT(*) as total_commissions,
        SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END) as total_pending,
        SUM(commission_amount) as total_amount
      FROM commission_tracking
      WHERE broker_id = ?
    `, [req.params.brokerId]);
    
    res.json(summary[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create commission record
router.post('/', async (req, res) => {
  try {
    const { broker_id, property_id, transaction_id, commission_amount, commission_rate } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO commission_tracking (broker_id, property_id, transaction_id, commission_amount, commission_rate) VALUES (?, ?, ?, ?, ?)',
      [broker_id, property_id, transaction_id, commission_amount, commission_rate]
    );
    
    res.json({ id: result.insertId, message: 'Commission recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update commission status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, payment_date } = req.body;
    
    await db.query(
      'UPDATE commission_tracking SET status = ?, payment_date = ? WHERE id = ?',
      [status, payment_date, req.params.id]
    );
    
    res.json({ message: 'Commission status updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
