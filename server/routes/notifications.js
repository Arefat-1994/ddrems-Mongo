const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Notifications } = require('../models');

// Get user notifications
router.get('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const notifications = await Notifications.find({ user_id: req.params.userId }).sort({ created_at: -1, createdAt: -1 }).limit(50).lean();
    res.json(notifications.map(n => ({ ...n, id: n._id })));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Notifications.findByIdAndUpdate(req.params.id, { is_read: true });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all as read for user
router.put('/read-all/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid ID' });
    await Notifications.updateMany({ user_id: req.params.userId }, { is_read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create notification — also emits real-time socket event
router.post('/', async (req, res) => {
  try {
    const { user_id, title, message, type, link, notification_type, icon } = req.body;

    if (!user_id || !mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: 'Valid user_id is required' });
    }

    const notif = await Notifications.create({
      user_id, title, message, type, link, notification_type, icon,
      is_read: false, created_at: new Date()
    });

    // Emit real-time socket event so the user sees it instantly
    try {
      const socketModule = require('../socket');
      socketModule.emitToUser(user_id, 'new_notification', {
        id: notif._id,
        _id: notif._id,
        user_id,
        title,
        message,
        type,
        link,
        is_read: false,
        created_at: notif.created_at || notif.createdAt
      });
    } catch (socketErr) {
      console.warn('[NOTIFICATIONS] Socket emit failed (non-critical):', socketErr.message);
    }

    res.status(201).json({ id: notif._id, message: 'Notification created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Notifications.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
