const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get user favorites
router.get('/:userId', async (req, res) => {
  try {
    const [favorites] = await db.query(`
      SELECT f.*, p.title as property_title, p.location as property_location, 
             p.price as property_price, p.type as property_type,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
      FROM favorites f
      JOIN properties p ON f.property_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.params.userId]);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker favorites (alias for user favorites)
router.get('/broker/:brokerId', async (req, res) => {
  try {
    const [favorites] = await db.query(`
      SELECT f.*, p.title as property_title, p.location as property_location, 
             p.price as property_price, p.type as property_type,
             (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
      FROM favorites f
      JOIN properties p ON f.property_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `, [req.params.brokerId]);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add to favorites
router.post('/', async (req, res) => {
  try {
    const { user_id, property_id, broker_id } = req.body;
    const userId = user_id || broker_id;
    
    if (!userId || !property_id) {
      return res.status(400).json({ message: 'user_id/broker_id and property_id are required' });
    }
    
    await db.query('INSERT INTO favorites (user_id, property_id) VALUES (?, ?)', [userId, property_id]);
    res.status(201).json({ message: 'Added to favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove from favorites
router.delete('/:propertyId', async (req, res) => {
  try {
    const { user_id, broker_id } = req.body;
    const userId = user_id || broker_id;
    
    if (!userId) {
      return res.status(400).json({ message: 'user_id or broker_id is required' });
    }
    
    await db.query('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', 
      [userId, req.params.propertyId]);
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Legacy endpoint for backward compatibility
router.delete('/:userId/:propertyId', async (req, res) => {
  try {
    await db.query('DELETE FROM favorites WHERE user_id = ? AND property_id = ?', 
      [req.params.userId, req.params.propertyId]);
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
