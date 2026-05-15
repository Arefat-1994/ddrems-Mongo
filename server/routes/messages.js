const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Messages, MessageRecipients, Users, Notifications } = require('../models');
const { sendEmail, templates } = require('../services/emailService');

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
    
    // Find IDs of messages sent to this user via MessageRecipients
    const groupRecipients = await MessageRecipients.find({ user_id: oid }).select('message_id');
    const groupMessageIds = groupRecipients.map(r => r.message_id);

    const messages = await Messages.aggregate([
      { 
        $match: { 
          $or: [
            { sender_id: oid }, 
            { receiver_id: oid },
            { _id: { $in: groupMessageIds } }
          ] 
        } 
      },
      {
        $lookup: {
          from: 'messagerecipients',
          let: { msgId: '$_id', userId: oid },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$message_id', '$$msgId'] }, { $eq: ['$user_id', '$$userId'] }] } } }
          ],
          as: 'user_recipient_status'
        }
      },
      { $unwind: { path: '$user_recipient_status', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'sender_id', foreignField: '_id', as: 'sender' } },
      { $lookup: { from: 'users', localField: 'receiver_id', foreignField: '_id', as: 'receiver' } },
      { $unwind: { path: '$sender', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$receiver', preserveNullAndEmptyArrays: true } },
      { 
        $addFields: { 
          id: '$_id', 
          sender_name: '$sender.name', 
          sender_role: '$sender.role', 
          receiver_name: '$receiver.name',
          // If this is a group message where the user is a recipient, use the per-user is_read status
          is_read: { $ifNull: ['$user_recipient_status.is_read', '$is_read'] },
          // Ensure created_at always has a valid date (fallback to Mongoose's auto createdAt)
          created_at: { $ifNull: ['$created_at', '$createdAt', new Date()] }
        } 
      },
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
    // Ensure all messages have a valid created_at date
    const fixDate = (msg) => ({ ...msg, id: msg._id, created_at: msg.created_at || msg.createdAt || new Date() });
    const allSent = sentMessages.map(fixDate);
    const allReceived = receivedMessages.map(fixDate);
    res.json({ success: true, sent_messages: allSent, received_messages: allReceived, all_messages: [...allSent, ...allReceived], total_sent: allSent.length, total_received: allReceived.length, replies_to_sent: [], total_replies: 0 });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Admin conversations
router.get('/admin/conversations/:userId', verifyUser, async (req, res) => {
  try {
    const oid = new mongoose.Types.ObjectId(req.params.userId);
    
    // Find unique users this admin has messaged with
    const sentTo = await Messages.distinct('receiver_id', { sender_id: oid });
    const receivedFrom = await Messages.distinct('sender_id', { receiver_id: oid });
    
    // Also check group message recipients if this admin sent any
    const groupMsgs = await Messages.find({ sender_id: oid, is_group: true }).select('_id');
    const groupMsgIds = groupMsgs.map(m => m._id);
    const groupRecipients = await MessageRecipients.distinct('user_id', { message_id: { $in: groupMsgIds } });

    const allOtherUserIds = [...new Set([...sentTo, ...receivedFrom, ...groupRecipients])].filter(id => id && id.toString() !== req.params.userId);
    
    const conversations = await Promise.all(allOtherUserIds.map(async (ouid) => {
      const otherUser = await Users.findById(ouid).select('name email role');
      if (!otherUser) return null;
      
      const lastMsg = await Messages.findOne({
        $or: [
          { sender_id: oid, receiver_id: ouid },
          { sender_id: ouid, receiver_id: oid }
        ]
      }).sort({ created_at: -1 }).lean();

      const unreadCount = await Messages.countDocuments({ sender_id: ouid, receiver_id: oid, is_read: false });

      return {
        other_user_id: ouid,
        other_user_name: otherUser.name,
        other_user_role: otherUser.role,
        other_user_email: otherUser.email,
        message_count: await Messages.countDocuments({ $or: [{ sender_id: oid, receiver_id: ouid }, { sender_id: ouid, receiver_id: oid }] }),
        unread_count: unreadCount,
        last_message_time: lastMsg ? (lastMsg.created_at || lastMsg.createdAt || new Date()) : null
      };
    }));

    res.json({ success: true, conversations: conversations.filter(c => c !== null), total_conversations: conversations.length });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Admin conversation thread
router.get('/admin/conversation/:userId/:otherUserId', verifyUser, async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.params.userId);
    const oid = new mongoose.Types.ObjectId(req.params.otherUserId);
    const messages = await Messages.find({ $or: [{ sender_id: uid, receiver_id: oid }, { sender_id: oid, receiver_id: uid }] }).sort({ created_at: 1 }).lean();
    // Ensure all messages have valid dates
    const fixedMessages = messages.map(m => ({ ...m, id: m._id, created_at: m.created_at || m.createdAt || new Date() }));
    res.json({ success: true, messages: fixedMessages, replies: [], total_messages: fixedMessages.length, total_replies: 0 });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

// Unread count
router.get('/unread/:userId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.userId)) return res.json({ count: 0, success: true });
    const oid = new mongoose.Types.ObjectId(req.params.userId);
    const unreadDirect = await Messages.countDocuments({ receiver_id: oid, is_read: false });
    const unreadGroup = await MessageRecipients.countDocuments({ user_id: oid, is_read: false });
    const totalUnread = unreadDirect + unreadGroup;
    
    const notifCount = await Notifications.countDocuments({ user_id: oid, is_read: false });
    res.json({ count: totalUnread, single_messages: unreadDirect, group_messages: unreadGroup, notifications: notifCount, success: true });
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

      const msg = await Messages.create({ sender_id: senderId, receiver_id, subject: subject.trim(), message: message.trim(), message_type: message_type || 'general', is_read: false, is_group: false, created_at: new Date() });
      const sender = await Users.findById(senderId);
      try { await Notifications.create({ user_id: receiver_id, title: `New message from ${sender.name}`, message: subject.trim(), type: 'info', is_read: false, link: `/messages/${msg._id}` }); } catch(e) {}

      return res.json({ id: msg._id, message: 'Message sent successfully', receiver: receiver.name, success: true });
    }

    // Group message
    const validIds = (receiver_ids || []).filter(id => isValid(id) && id !== senderId);
    if (validIds.length === 0) return res.status(400).json({ message: 'No valid recipients', success: false });

    const msg = await Messages.create({ sender_id: senderId, subject: subject.trim(), message: message.trim(), message_type: message_type || 'general', is_read: false, is_group: true, created_at: new Date() });
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
    const mid = new mongoose.Types.ObjectId(req.params.messageId);
    const uid = new mongoose.Types.ObjectId(req.userId);
    
    await Messages.findByIdAndUpdate(mid, { is_read: true });
    await MessageRecipients.updateMany({ message_id: mid, user_id: uid }, { is_read: true, read_at: new Date() });
    
    res.json({ message: 'Marked as read', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// Mark all as read
router.put('/read-all/:userId', verifyUser, async (req, res) => {
  try {
    if (!isValid(req.params.userId)) return res.status(400).json({ message: 'Invalid ID', success: false });
    const uid = new mongoose.Types.ObjectId(req.params.userId);
    
    await Messages.updateMany({ receiver_id: uid }, { is_read: true });
    await MessageRecipients.updateMany({ user_id: uid }, { is_read: true, read_at: new Date() });
    
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

    const msg = await Messages.create({ sender_id: req.userId, subject, message, message_type: message_type || 'general', is_read: false, is_group: true, created_at: new Date() });
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
    // Fix dates
    const fixDate = (m) => ({ ...m, id: m._id, created_at: m.created_at || m.createdAt || new Date() });
    res.json({ main_message: fixDate(mainMsg), replies: replies.map(fixDate), reply_count: replies.length, success: true });
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
    const reply = await Messages.create({ sender_id: req.userId, receiver_id: receiverId, subject: subject.trim(), message: message.trim(), message_type: 'general', is_read: false, is_group: false, parent_id: req.params.messageId, created_at: new Date() });

    const sender = await Users.findById(req.userId);
    try { await Notifications.create({ user_id: receiverId, title: `Reply from ${sender ? sender.name : 'User'}`, message: subject.trim(), type: 'info', is_read: false }); } catch(e) {}

    res.json({ id: reply._id, message: 'Reply sent', parent_id: req.params.messageId, success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

module.exports = router;
