const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Properties } = require('../models');

router.get('/map-data', async (req, res) => {
  try {
    const properties = await Properties.find({
      latitude: { $ne: null },
      longitude: { $ne: null },
      status: 'active'
    }).select('title location price type latitude longitude main_image').lean();
    res.json(properties.map(p => ({ ...p, id: p._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/location-analysis', async (req, res) => {
  try {
    const locations = await Properties.aggregate([
      { $match: { location: { $ne: null }, status: 'active' } },
      { $group: { _id: '$location', count: { $sum: 1 }, avg_price: { $avg: '$price' } } },
      { $sort: { count: -1 } }
    ]);
    res.json(locations);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const property = await Properties.findById(req.params.id).select('title latitude longitude location').lean();
    if (!property) return res.status(404).json({ message: 'Not found' });
    res.json({ ...property, id: property._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/add-with-location', async (req, res) => {
  try {
    const property = await Properties.create({ ...req.body, created_at: new Date() });
    res.json({ message: 'Success', success: true, id: property._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/location', async (req, res) => {
  try {
    const { latitude, longitude, location, address } = req.body;
    await Properties.findByIdAndUpdate(req.params.id, {
      latitude, longitude, location, address, updated_at: new Date()
    });
    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
