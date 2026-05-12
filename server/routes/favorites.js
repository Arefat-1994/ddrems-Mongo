const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Favorites, Properties, PropertyImages } = require('../models');

router.get('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const favorites = await Favorites.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title', property_location: '$property.location', property_price: '$property.price', property_type: '$property.type', main_image: '$property.main_image' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(favorites);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/broker/:brokerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.brokerId)) return res.json([]);
    const favorites = await Favorites.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.params.brokerId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title', property_location: '$property.location', property_price: '$property.price', property_type: '$property.type', main_image: '$property.main_image' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(favorites);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, property_id, broker_id } = req.body;
    const userId = user_id || broker_id;
    if (!userId || !property_id) return res.status(400).json({ message: 'user_id and property_id required' });
    await Favorites.create({ user_id: userId, property_id });
    res.status(201).json({ message: 'Added to favorites' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:propertyId', async (req, res) => {
  try {
    const { user_id, broker_id } = req.body;
    const userId = user_id || broker_id;
    if (!userId) return res.status(400).json({ message: 'user_id required' });
    await Favorites.deleteOne({ user_id: userId, property_id: req.params.propertyId });
    res.json({ message: 'Removed from favorites' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.delete('/:userId/:propertyId', async (req, res) => {
  try {
    await Favorites.deleteOne({ user_id: req.params.userId, property_id: req.params.propertyId });
    res.json({ message: 'Removed from favorites' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
