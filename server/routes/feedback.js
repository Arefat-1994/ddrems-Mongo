const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Feedback } = require('../models');

router.get('/property/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const feedback = await Feedback.aggregate([
      { $match: { property_id: new mongoose.Types.ObjectId(req.params.propertyId) } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(feedback);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, property_id, rating, comment } = req.body;
    const fb = await Feedback.create({ user_id, property_id, rating, comment });
    res.status(201).json({ id: fb._id, message: 'Feedback submitted successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
