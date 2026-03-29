const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all announcements
router.get('/', async (req, res) => {
  try {
    const [announcements] = await db.query(`
      SELECT a.*, u.name as created_by 
      FROM announcements a 
      LEFT JOIN users u ON a.created_by = u.id 
      ORDER BY a.created_at DESC
    `);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get announcement by ID
router.get('/:id', async (req, res) => {
  try {
    const [announcement] = await db.query('SELECT * FROM announcements WHERE id = ?', [req.params.id]);
    if (announcement.length === 0) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    res.json(announcement[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create announcement
router.post('/', async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    const [result] = await db.query(
      'INSERT INTO announcements (title, content, priority, created_by) VALUES (?, ?, ?, ?)',
      [title, content, priority, 1] // Default to admin user
    );
    res.status(201).json({ id: result.insertId, message: 'Announcement created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update announcement
router.put('/:id', async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    await db.query(
      'UPDATE announcements SET title = ?, content = ?, priority = ? WHERE id = ?',
      [title, content, priority, req.params.id]
    );
    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete announcement
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM announcements WHERE id = ?', [req.params.id]);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
