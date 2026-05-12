const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PropertyImages, Properties } = require('../models');
const { upload } = require('../middleware/upload');

// Get images for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const { propertyId } = req.params;
    if (mongoose.Types.ObjectId.isValid(propertyId)) {
      const images = await PropertyImages.find({ property_id: propertyId }).sort({ image_type: 1, createdAt: 1 });
      return res.json(images);
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload property image file directly to Cloudinary
// Wrapping multer middleware to properly catch upload errors
router.post('/upload', (req, res) => {
  upload.single('image')(req, res, async (multerErr) => {
    try {
      // Handle multer/cloudinary upload errors
      if (multerErr) {
        console.error('Multer/Cloudinary upload error:', multerErr.message || multerErr);
        return res.status(500).json({ 
          message: 'Image upload to cloud failed: ' + (multerErr.message || 'Unknown upload error'),
          error: multerErr.message || String(multerErr)
        });
      }

      const { property_id, image_type, uploaded_by } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'No image file provided' });
      }

      if (!property_id || !mongoose.Types.ObjectId.isValid(property_id)) {
        return res.status(400).json({ message: 'Valid Property ID is required' });
      }

      // req.file.path contains the secure Cloudinary URL
      const imageUrl = req.file.path;
      const type = image_type || 'gallery';

      const newImage = await PropertyImages.create({
        property_id,
        image_url: imageUrl,
        image_type: type,
        uploaded_by: (uploaded_by && mongoose.Types.ObjectId.isValid(uploaded_by)) ? uploaded_by : null,
      });

      // Update main image on the property
      if (type === 'main') {
        await Properties.findByIdAndUpdate(property_id, { main_image: imageUrl });
      } else {
        const property = await Properties.findById(property_id).select('main_image');
        if (property && (!property.main_image || property.main_image === '')) {
          await Properties.findByIdAndUpdate(property_id, { main_image: imageUrl });
        }
      }

      res.json({ id: newImage._id, image_url: imageUrl, message: 'Image successfully uploaded to Cloudinary!' });
    } catch (error) {
      console.error('Cloudinary Image upload error:', error.message || error);
      res.status(500).json({ message: 'Server error', error: error.message || String(error) });
    }
  });
});

// Backward compatibility: Save property image if URL already provided
router.post('/', async (req, res) => {
  try {
    const { property_id, image_url, image_type, uploaded_by } = req.body;
    
    if (!property_id || !image_url) {
      return res.status(400).json({ message: 'Property ID and image URL are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(property_id)) {
      return res.status(400).json({ message: 'Invalid Property ID for MongoDB' });
    }
    
    const type = image_type || 'gallery';

    const newImage = await PropertyImages.create({
      property_id,
      image_url,
      image_type: type,
      uploaded_by: (uploaded_by && mongoose.Types.ObjectId.isValid(uploaded_by)) ? uploaded_by : null,
    });
    
    if (type === 'main') {
      await Properties.findByIdAndUpdate(property_id, { main_image: image_url });
    } else {
      const property = await Properties.findById(property_id).select('main_image');
      if (property && (!property.main_image || property.main_image === '')) {
        await Properties.findByIdAndUpdate(property_id, { main_image: image_url });
      }
    }
    
    res.json({ id: newImage._id, message: 'Image reference saved successfully' });
  } catch (error) {
    console.error('Image upload error:', error.message || error);
    res.status(500).json({ message: 'Server error', error: error.message || String(error) });
  }
});

// Delete property image
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid Image ID' });
    }
    await PropertyImages.findByIdAndDelete(id);
    res.json({ message: 'Image deleted successfully from database' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
