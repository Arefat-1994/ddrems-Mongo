const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PropertyViews, Properties } = require('../models');

router.post('/', async (req, res) => {
  try {
    const { user_id, property_id } = req.body;
    await PropertyViews.create({ user_id, property_id });
    res.json({ message: 'View recorded' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const views = await PropertyViews.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: '$property' },
      { $addFields: { id: '$_id', property_title: '$property.title', property_location: '$property.location', property_price: '$property.price', main_image: '$property.main_image' } },
      { $sort: { viewed_at: -1 } },
      { $limit: 10 }
    ]);
    res.json(views);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await Properties.aggregate([
      { $match: { status: 'active' } },
      { $addFields: { id: '$_id' } },
      { $sort: { views: -1 } },
      { $limit: 8 }
    ]);
    res.json(recommendations);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
