const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const [transactions] = await db.query(`
      SELECT t.*, p.title as property_title, u.name as user_name 
      FROM transactions t 
      LEFT JOIN properties p ON t.property_id = p.id 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.created_at DESC
    `);
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
