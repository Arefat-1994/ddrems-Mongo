const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Record a property view
router.post('/', async (req, res) => {
  try {
    const { user_id, property_id } = req.body;
    await db.query(
      'INSERT INTO property_views (user_id, property_id) VALUES (?, ?)',
      [user_id, property_id]
    );
    res.json({ message: 'View recorded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent views for a customer
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [views] = await db.query(`
      SELECT v.*, p.title as property_title, p.location as property_location, p.price as property_price, (
        SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1
      ) as main_image
      FROM property_views v
      JOIN properties p ON v.property_id = p.id
      WHERE v.user_id = ?
      ORDER BY v.viewed_at DESC
      LIMIT 10
    `, [userId]);
    res.json(views);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get most viewed properties (recommendations)
router.get('/recommendations', async (req, res) => {
  try {
    const [recommendations] = await db.query(`
      SELECT p.*, COUNT(v.id) as view_count, (
        SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1
      ) as main_image
      FROM properties p
      LEFT JOIN property_views v ON p.id = v.property_id
      WHERE p.status = 'active'
      GROUP BY p.id
      ORDER BY view_count DESC
      LIMIT 8
    `);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
