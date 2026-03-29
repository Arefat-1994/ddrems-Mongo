const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get feedback for a property
router.get('/property/:propertyId', async (req, res) => {
    try {
        const [feedback] = await db.query(`
      SELECT f.*, u.name as user_name
      FROM feedback f
      JOIN users u ON f.user_id = u.id
      WHERE f.property_id = ?
      ORDER BY f.created_at DESC
    `, [req.params.propertyId]);
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Submit feedback
router.post('/', async (req, res) => {
    try {
        const { user_id, property_id, rating, comment } = req.body;
        const [result] = await db.query(
            'INSERT INTO feedback (user_id, property_id, rating, comment) VALUES (?, ?, ?, ?)',
            [user_id, property_id, rating, comment]
        );
        res.status(201).json({ id: result.insertId, message: 'Feedback submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
