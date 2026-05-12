const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { UserPreferences } = require('../models');

router.get('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid User ID' });
    let preferences = await UserPreferences.findOne({ user_id: req.params.userId }).lean();
    if (!preferences) {
      preferences = await UserPreferences.create({
        user_id: req.params.userId,
        theme: 'light',
        language: 'en',
        notifications_enabled: true,
        created_at: new Date()
      });
    }
    res.json({ ...preferences, id: preferences._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid User ID' });
    const preferences = await UserPreferences.findOneAndUpdate(
      { user_id: req.params.userId },
      { ...req.body, updated_at: new Date() },
      { new: true, upsert: true }
    );
    res.json({ message: 'Success', success: true, preferences });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:userId/theme', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid User ID' });
    const preferences = await UserPreferences.findOne({ user_id: req.params.userId }).select('theme').lean();
    res.json({ theme: preferences?.theme || 'light' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
