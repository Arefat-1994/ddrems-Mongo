const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [req.params.userId]
    );
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all as read for user
router.put('/read-all/:userId', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.params.userId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const { user_id, title, message, type, link } = req.body;
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
      [user_id, title, message, type, link]
    );
    res.status(201).json({ id: result.insertId, message: 'Notification created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
