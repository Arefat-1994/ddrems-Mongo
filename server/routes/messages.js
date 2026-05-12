const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Messages, MessageRecipients, Users, Notifications } = require('../models');
const { sendEmail, templates } = require('../services/emailService');
const socket = require('../socket');

const isValid = (id) => mongoose.Types.ObjectId.isValid(id);

const verifyUser = (req, res, next) => {
  const userId = req.query.userId || req.body.sender_id || req.headers['x-user-id'] || req.params.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized', success: false });
  req.userId = userId;
  next();
};

const checkSendPermission = async (req, res, next) => {
  try {
    if (!isValid(req.userId)) return res.status(400).json({ message: 'Invalid user ID', success: false });
    const user = await Users.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'User not found', success: false });
    if (user.status !== 'active') return res.status(403).json({ message: 'Account not active', success: false });
    req.userRole = user.role;
    next();
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
};

// Get messages for user
router.get('/user/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValid(userId)) return res.json({ messages: [], count: 0, success: true });
    const user = await Users.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found', success: false });

    const oid = new mongoose.Types.ObjectId(userId);
    const messages = await Messages.aggregate([
      { $match: { $or: [{ sender_id: oid }, { receiver_id: oid }] } },
      { $lookup: { from: 'users', localField: 'sender_id', foreignField: '_id', as: 'sender' } },
      { $lookup: { from: 'users', localField: 'receiver_id', foreignField: '_id', as: 'receiver' } },
      { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', sender_name: '$sender.name', sender_role: '$sender.role', receiver_name: '$receiver.name' } },
      { $sort: { created_at: -1 } },
      { $limit: 100 }
    ]);

    res.json({ messages, count: messages.length, user_role: user.role, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Admin message history
router.get('/admin/history/:userId', verifyUser, async (req, res) => {
  try {
    const oid = new mongoose.Types.ObjectId(req.params.userId);
    const sentMessages = await Messages.find({ sender_id: oid }).sort({ created_at: -1 }).lean();
    const receivedMessages = await Messages.find({ receiver_id: oid }).sort({ created_at: -1 }).lean();
    res.json({ success: true, sent_messages: sentMessages, received_messages: receivedMessages, all_messages: [...sentMessages, ...receivedMessages], total_sent: sentMessages.length, total_received: receivedMessages.length, replies_to_sent: [], total_replies: 0 });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Admin conversations
router.get('/admin/conversations/:userId', verifyUser, async (req, res) => {
  try {
    res.json({ success: true, conversations: [], total_conversations: 0 });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Admin conversation thread
router.get('/admin/conversation/:userId/:otherUserId', verifyUser, async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.params.userId);
    const oid = new mongoose.Types.ObjectId(req.params.otherUserId);
    const messages = await Messages.find({ $or: [{ sender_id: uid, receiver_id: oid }, { sender_id: oid, receiver_id: uid }] }).sort({ created_at: 1 }).lean();
    res.json({ success: true, messages, replies: [], total_messages: messages.length, total_replies: 0 });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Unread count
router.get('/unread/:userId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.userId)) return res.json({ count: 0, success: true });
    const oid = new mongoose.Types.ObjectId(req.params.userId);
    const unread = await Messages.countDocuments({ receiver_id: oid, is_read: false });
    const notifCount = await Notifications.countDocuments({ user_id: oid, is_read: false });
    res.json({ count: unread, single_messages: unread, group_messages: 0, notifications: notifCount, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Notifications
router.get('/notifications/:userId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.userId)) return res.json({ notifications: [], count: 0, success: true });
    const notifications = await Notifications.find({ user_id: req.params.userId }).sort({ created_at: -1 }).limit(10).lean();
    res.json({ notifications, count: notifications.length, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Send message
router.post('/', verifyUser, checkSendPermission, async (req, res) => {
  try {
    const { receiver_id, receiver_ids, subject, message, message_type, is_group } = req.body;
    const senderId = req.userId;

    if (!subject || !message) return res.status(400).json({ message: 'Subject and message required', success: false });

    const isGroupMsg = is_group || (Array.isArray(receiver_ids) && receiver_ids.length > 0);

    if (!isGroupMsg) {
      if (!receiver_id || !isValid(receiver_id)) return res.status(400).json({ message: 'Valid receiver required', success: false });
      const receiver = await Users.findById(receiver_id);
      if (!receiver) return res.status(404).json({ message: 'Receiver not found', success: false });

      const msg = await Messages.create({ sender_id: senderId, receiver_id, subject: subject.trim(), message: message.trim(), message_type: message_type || 'general', is_read: false, is_group: false });
      const sender = await Users.findById(senderId);
      try { await Notifications.create({ user_id: receiver_id, title: `New message from ${sender.name}`, message: subject.trim(), type: 'info', is_read: false, link: `/messages/${msg._id}` }); } catch(e) {}

      return res.json({ id: msg._id, message: 'Message sent successfully', receiver: receiver.name, success: true });
    }

    // Group message
    const validIds = (receiver_ids || []).filter(id => isValid(id) && id !== senderId);
    if (validIds.length === 0) return res.status(400).json({ message: 'No valid recipients', success: false });

    const msg = await Messages.create({ sender_id: senderId, subject: subject.trim(), message: message.trim(), message_type: message_type || 'general', is_read: false, is_group: true });
    for (const rid of validIds) {
      try { await MessageRecipients.create({ message_id: msg._id, user_id: rid, is_read: false }); } catch(e) {}
    }

    const sender = await Users.findById(senderId);
    for (const rid of validIds) {
      try { await Notifications.create({ user_id: rid, title: `New group message from ${sender.name}`, message: subject.trim(), type: 'info', is_read: false }); } catch(e) {}
    }

    res.json({ id: msg._id, message: `Group message sent to ${validIds.length} recipients`, count: validIds.length, success: true });
  } catch (error) { res.status(500).json({ message: 'Send error', error: error.message, success: false }); }
});

// Mark as read
router.put('/read/:messageId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.messageId)) return res.status(400).json({ message: 'Invalid ID', success: false });
    await Messages.findByIdAndUpdate(req.params.messageId, { is_read: true });
    res.json({ message: 'Marked as read', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// Mark all as read
router.put('/read-all/:userId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid ID', success: false });
    await Messages.updateMany({ receiver_id: req.params.userId }, { is_read: true });
    res.json({ message: 'All marked as read', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// Delete message
router.delete('/:messageId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.messageId)) return res.status(400).json({ message: 'Invalid ID', success: false });
    await Messages.findByIdAndDelete(req.params.messageId);
    await MessageRecipients.deleteMany({ message_id: req.params.messageId });
    res.json({ message: 'Deleted', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Edit message
router.put('/:messageId', verifyUser, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message required', success: false });
    await Messages.findByIdAndUpdate(req.params.messageId, { subject: subject.trim(), message: message.trim(), updated_at: new Date() });
    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Bulk send
router.post('/bulk', verifyUser, checkSendPermission, async (req, res) => {
  try {
    const { receiver_ids, subject, message, message_type, filter_role } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Required fields missing', success: false });

    let targetIds = [];
    if (Array.isArray(receiver_ids) && receiver_ids.length > 0) {
      targetIds = receiver_ids.filter(id => isValid(id) && id !== req.userId);
    } else if (filter_role) {
      const query = filter_role === 'all' ? { _id: { $ne: req.userId }, status: 'active' } : { role: filter_role, _id: { $ne: req.userId }, status: 'active' };
      const users = await Users.find(query).select('_id');
      targetIds = users.map(u => u._id.toString());
    }

    if (targetIds.length === 0) return res.status(400).json({ message: 'No recipients', success: false });

    const msg = await Messages.create({ sender_id: req.userId, subject, message, message_type: message_type || 'general', is_read: false, is_group: true });
    for (const rid of targetIds) {
      try { await MessageRecipients.create({ message_id: msg._id, user_id: rid }); } catch(e) {}
    }

    res.json({ id: msg._id, message: `Sent to ${targetIds.length} recipients`, count: targetIds.length, success: true });
  } catch (error) { res.status(500).json({ message: 'Send error', error: error.message, success: false }); }
});

// Thread
router.get('/:messageId/thread', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.messageId)) return res.status(400).json({ message: 'Invalid ID', success: false });
    const mainMsg = await Messages.findById(req.params.messageId).lean();
    if (!mainMsg) return res.status(404).json({ message: 'Not found', success: false });
    const replies = await Messages.find({ parent_id: req.params.messageId }).sort({ created_at: 1 }).lean();
    res.json({ main_message: { ...mainMsg, id: mainMsg._id }, replies, reply_count: replies.length, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Replies
router.get('/:messageId/replies', verifyUser, async (req, res) => {
  try {
    const replies = await Messages.find({ parent_id: req.params.messageId }).sort({ created_at: 1 }).lean();
    res.json({ replies, count: replies.length, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Reply to message
router.post('/:messageId/reply', verifyUser, checkSendPermission, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: 'Required', success: false });
    
    const original = await Messages.findById(req.params.messageId);
    if (!original) return res.status(404).json({ message: 'Not found', success: false });

    const receiverId = original.sender_id.toString() === req.userId ? original.receiver_id : original.sender_id;
    const reply = await Messages.create({ sender_id: req.userId, receiver_id: receiverId, subject: subject.trim(), message: message.trim(), message_type: 'general', is_read: false, is_group: false, parent_id: req.params.messageId });

    const sender = await Users.findById(req.userId);
    try { await Notifications.create({ user_id: receiverId, title: `Reply from ${sender ? sender.name : 'User'}`, message: subject.trim(), type: 'info', is_read: false }); } catch(e) {}

    res.json({ id: reply._id, message: 'Reply sent', parent_id: req.params.messageId, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

module.exports = router;
