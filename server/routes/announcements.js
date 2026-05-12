const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Announcements, Users } = require('../models');

router.get('/', async (req, res) => {
  try {
    const announcements = await Announcements.aggregate([
      { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'creator' } },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', created_by_name: '$creator.name' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Not found' });
    const ann = await Announcements.findById(req.params.id).lean();
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ ...ann, id: ann._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, content, priority, created_by } = req.body;
    const ann = await Announcements.create({ title, content, priority, created_by: created_by || null });
    res.status(201).json({ id: ann._id, message: 'Announcement created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    await Announcements.findByIdAndUpdate(req.params.id, { title, content, priority });
    res.json({ message: 'Announcement updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Announcements.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
