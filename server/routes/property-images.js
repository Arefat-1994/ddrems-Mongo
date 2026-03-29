const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get images for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [images] = await db.query(
      'SELECT * FROM property_images WHERE property_id = ? ORDER BY image_type, created_at',
      [req.params.propertyId]
    );
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload property image
router.post('/', async (req, res) => {
  try {
    const { property_id, image_url, image_type, uploaded_by } = req.body;
    
    // Validate required fields
    if (!property_id || !image_url) {
      return res.status(400).json({ message: 'Property ID and image URL are required' });
    }
    
    // Insert the image
    const [result] = await db.query(
      'INSERT INTO property_images (property_id, image_url, image_type, uploaded_by) VALUES (?, ?, ?, ?)',
      [property_id, image_url, image_type || 'gallery', uploaded_by]
    );
    
    // If this is a main image, update the properties table
    if (image_type === 'main') {
      await db.query(
        'UPDATE properties SET main_image = ? WHERE id = ?',
        [image_url, property_id]
      );
    } else {
      // If no main image exists, set this as the main image
      const [existingMain] = await db.query(
        'SELECT main_image FROM properties WHERE id = ?',
        [property_id]
      );
      
      if (existingMain.length > 0 && (!existingMain[0].main_image || existingMain[0].main_image === '')) {
        await db.query(
          'UPDATE properties SET main_image = ? WHERE id = ?',
          [image_url, property_id]
        );
      }
    }
    
    res.json({ id: result.insertId, message: 'Image uploaded successfully' });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete property image
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM property_images WHERE id = ?', [req.params.id]);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
