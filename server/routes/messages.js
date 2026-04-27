const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendEmail, templates } = require('../services/emailService');
const socket = require('../socket');

// Middleware: Verify user authentication
const verifyUser = (req, res, next) => {
  // Check multiple sources for userId: query params, body, headers, route params
  const userId = req.query.userId || req.body.sender_id || req.headers['x-user-id'] || req.params.userId;
  if (!userId) {
    return res.status(401).json({ 
      message: 'Unauthorized - User ID required', 
      success: false,
      code: 'AUTH_REQUIRED'
    });
  }
  req.userId = parseInt(userId);
  if (isNaN(req.userId)) {
    return res.status(400).json({ 
      message: 'Invalid user ID format', 
      success: false,
      code: 'INVALID_USER_ID'
    });
  }
  next();
};

// Middleware: Check if user has permission to send messages
const checkSendPermission = async (req, res, next) => {
  try {
    const [user] = await db.query('SELECT role, status FROM users WHERE id = ?', [req.userId]);
    if (user.length === 0) {
      return res.status(401).json({ 
        message: 'User not found', 
        success: false,
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if user account is active
    if (user[0].status !== 'active') {
      return res.status(403).json({ 
        message: 'Account is not active', 
        success: false,
        code: 'ACCOUNT_INACTIVE'
      });
    }
    
    const allowedRoles = ['admin', 'system_admin', 'property_admin', 'broker', 'owner', 'user'];
    if (!allowedRoles.includes(user[0].role)) {
      return res.status(403).json({ 
        message: 'User role not allowed to send messages', 
        success: false,
        code: 'ROLE_NOT_PERMITTED'
      });
    }
    
    req.userRole = user[0].role;
    next();
  } catch (error) {
    console.error('Error checking send permission:', error);
    res.status(500).json({ 
      message: 'Server error during permission check', 
      error: error.message,
      success: false,
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

// Get messages for a specific user (inbox) - Enhanced with proper table usage
router.get('/user/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    // Validate user ID
    if (isNaN(userIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid user ID format', 
        success: false,
        code: 'INVALID_USER_ID'
      });
    }
    
    // Verify user can only see their own messages (except system admin)
    if (req.userId !== userIdInt && req.userRole !== 'system_admin') {
      return res.status(403).json({ 
        message: 'Access denied - Can only view own messages', 
        success: false,
        code: 'ACCESS_DENIED'
      });
    }

    // Get user role and verify user exists
    const [userRole] = await db.query('SELECT role, status FROM users WHERE id = ?', [userIdInt]);
    if (userRole.length === 0) {
      return res.status(404).json({ 
        message: 'User not found', 
        success: false,
        code: 'USER_NOT_FOUND'
      });
    }

    const role = userRole[0].role;
    const userStatus = userRole[0].status;
    
    // Check if user account is active
    if (userStatus !== 'active') {
      return res.status(403).json({ 
        message: 'Account is not active', 
        success: false,
        code: 'ACCOUNT_INACTIVE'
      });
    }

    let query = '';
    let params = [];

    // Enhanced role-based message filtering using proper table structure
    if (role === 'system_admin') {
      // System admin sees all messages they sent or received + all group messages
      query = `
        SELECT DISTINCT m.*, 
               sender.name as sender_name, 
               sender.role as sender_role,
               receiver.name as receiver_name,
               CASE 
                 WHEN m.is_group = true THEN (
                   SELECT CASE WHEN mr.is_read IS NULL THEN false ELSE mr.is_read END
                   FROM message_recipients mr 
                   WHERE mr.message_id = m.id AND mr.user_id = ?
                 )
                 ELSE m.is_read
               END as is_read_status,
               CASE 
                 WHEN m.is_group = true THEN (
                   SELECT COUNT(*) FROM message_recipients mr WHERE mr.message_id = m.id
                 )
                 ELSE 1
               END as recipient_count
        FROM messages m
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON m.receiver_id = receiver.id
        LEFT JOIN message_recipients mr ON m.id = mr.message_id
        WHERE m.sender_id = ? 
           OR m.receiver_id = ? 
           OR (m.is_group = true AND (mr.user_id = ? OR m.sender_id = ?))
        ORDER BY m.created_at DESC
        LIMIT 100
      `;
      params = [userIdInt, userIdInt, userIdInt, userIdInt, userIdInt];
    } else if (role === 'property_admin') {
      // Property admin sees their messages + system admin messages
      query = `
        SELECT DISTINCT m.*, 
               sender.name as sender_name, 
               sender.role as sender_role,
               receiver.name as receiver_name,
               CASE 
                 WHEN m.is_group = true THEN (
                   SELECT CASE WHEN mr.is_read IS NULL THEN false ELSE mr.is_read END
                   FROM message_recipients mr 
                   WHERE mr.message_id = m.id AND mr.user_id = ?
                 )
                 ELSE m.is_read
               END as is_read_status,
               CASE 
                 WHEN m.is_group = true THEN (
                   SELECT COUNT(*) FROM message_recipients mr WHERE mr.message_id = m.id
                 )
                 ELSE 1
               END as recipient_count
        FROM messages m
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON m.receiver_id = receiver.id
        LEFT JOIN message_recipients mr ON m.id = mr.message_id
        WHERE m.sender_id = ? 
           OR (m.receiver_id = ? AND sender.role = 'system_admin')
           OR (m.is_group = true AND sender.role = 'system_admin' AND mr.user_id = ?)
        ORDER BY m.created_at DESC
        LIMIT 100
      `;
      params = [userIdInt, userIdInt, userIdInt, userIdInt];
    } else {
      // Regular users see:
      // 1. Messages sent directly to them (receiver_id = userId AND is_group = 0)
      // 2. Group messages they're in (message_recipients table)
      // 3. Messages from admin/property_admin that are directed TO this user
      query = `
        SELECT m.*, 
               sender.name as sender_name, 
               sender.role as sender_role,
               receiver.name as receiver_name,
               CASE 
                 WHEN m.is_group = true THEN (
                   SELECT COALESCE(mr.is_read, false)
                   FROM message_recipients mr 
                   WHERE mr.message_id = m.id AND mr.user_id = ?
                   LIMIT 1
                 )
                 ELSE m.is_read
               END as is_read_status,
               CASE 
                 WHEN m.is_group = true THEN (
                   SELECT COUNT(*) FROM message_recipients mr WHERE mr.message_id = m.id
                 )
                 ELSE 1
               END as recipient_count
        FROM messages m
        LEFT JOIN users sender ON m.sender_id = sender.id
        LEFT JOIN users receiver ON m.receiver_id = receiver.id
        WHERE 
          -- Direct messages to this user (from anyone)
          (m.receiver_id = ? AND m.is_group = false)
          -- Group messages this user is a recipient of
          OR (m.is_group = true AND EXISTS (
            SELECT 1 FROM message_recipients mr 
            WHERE mr.message_id = m.id AND mr.user_id = ?
          ))
          -- Admin/property_admin messages directed to this user specifically
          OR (sender.role IN ('system_admin', 'property_admin') AND m.receiver_id = ?)
        ORDER BY m.created_at DESC
        LIMIT 100
      `;
      params = [userIdInt, userIdInt, userIdInt, userIdInt];
    }

    const [messages] = await db.query(query, params);
    
    // Process messages to ensure proper read status
    const processedMessages = messages.map(msg => ({
      ...msg,
      is_read: msg.is_read_status !== null ? msg.is_read_status : msg.is_read
    }));

    res.json({
      messages: processedMessages,
      count: processedMessages.length,
      user_role: role,
      success: true
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ 
      message: 'Server error while fetching messages', 
      error: error.message,
      success: false,
      code: 'FETCH_ERROR'
    });
  }
});

// NEW: Get message history for admins (all sent and received messages)
router.get('/admin/history/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    // Verify user is admin
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userIdInt]);
    if (user.length === 0 || !['system_admin', 'property_admin'].includes(user[0].role)) {
      return res.status(403).json({ 
        message: 'Access denied - Admin only', 
        success: false 
      });
    }

    // Get all messages sent by this admin
    const [sentMessages] = await db.query(`
      SELECT m.*, 
             sender.name as sender_name,
             sender.role as sender_role,
             receiver.name as receiver_name,
             receiver.role as receiver_role,
             'sent' as message_type,
             COUNT(mr.id) as reply_count
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN message_replies mr ON m.id = mr.message_id
      WHERE m.sender_id = ?
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [userIdInt]);

    // Get all messages received by this admin
    const [receivedMessages] = await db.query(`
      SELECT m.*, 
             sender.name as sender_name,
             sender.role as sender_role,
             receiver.name as receiver_name,
             receiver.role as receiver_role,
             'received' as message_type,
             COUNT(mr.id) as reply_count
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN message_replies mr ON m.id = mr.message_id
      WHERE m.receiver_id = ?
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `, [userIdInt]);

    // Get all replies to messages sent by this admin
    const [replies] = await db.query(`
      SELECT mr.*, 
             m.subject as original_subject,
             m.sender_id as original_sender_id,
             sender.name as reply_sender_name,
             sender.role as reply_sender_role,
             original_sender.name as original_sender_name
      FROM message_replies mr
      INNER JOIN messages m ON mr.message_id = m.id
      LEFT JOIN users sender ON mr.sender_id = sender.id
      LEFT JOIN users original_sender ON m.sender_id = original_sender.id
      WHERE m.sender_id = ?
      ORDER BY mr.created_at DESC
    `, [userIdInt]);

    // Combine and sort all messages
    const allMessages = [
      ...sentMessages.map(m => ({ ...m, direction: 'sent' })),
      ...receivedMessages.map(m => ({ ...m, direction: 'received' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      sent_messages: sentMessages,
      received_messages: receivedMessages,
      replies_to_sent: replies,
      all_messages: allMessages,
      total_sent: sentMessages.length,
      total_received: receivedMessages.length,
      total_replies: replies.length
    });
  } catch (error) {
    console.error('Error fetching admin message history:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      success: false 
    });
  }
});

// NEW: Get all conversations for admin dashboard
router.get('/admin/conversations/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    // Verify user is admin
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userIdInt]);
    if (user.length === 0 || !['system_admin', 'property_admin'].includes(user[0].role)) {
      return res.status(403).json({ 
        message: 'Access denied - Admin only', 
        success: false 
      });
    }

    // Get all unique conversations (with other users)
    const [conversations] = await db.query(`
      SELECT DISTINCT
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END as other_user_id,
        u.name as other_user_name,
        u.role as other_user_role,
        u.email as other_user_email,
        MAX(m.created_at) as last_message_time,
        COUNT(m.id) as message_count,
        SUM(CASE WHEN m.receiver_id = ? AND m.is_read = false THEN 1 ELSE 0 END) as unread_count
      FROM messages m
      LEFT JOIN users u ON (
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id
        END = u.id
      )
      WHERE m.sender_id = ? OR m.receiver_id = ?
      GROUP BY other_user_id, u.name, u.role, u.email
      ORDER BY last_message_time DESC
    `, [userIdInt, userIdInt, userIdInt, userIdInt, userIdInt]);

    res.json({
      success: true,
      conversations,
      total_conversations: conversations.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      success: false 
    });
  }
});

// NEW: Get conversation thread between two users
router.get('/admin/conversation/:userId/:otherUserId', verifyUser, async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const userIdInt = parseInt(userId);
    const otherUserIdInt = parseInt(otherUserId);

    // Verify user is admin
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userIdInt]);
    if (user.length === 0 || !['system_admin', 'property_admin'].includes(user[0].role)) {
      return res.status(403).json({ 
        message: 'Access denied - Admin only', 
        success: false 
      });
    }

    // Get all messages between these two users
    const [messages] = await db.query(`
      SELECT m.*, 
             sender.name as sender_name,
             sender.role as sender_role,
             receiver.name as receiver_name,
             receiver.role as receiver_role,
             (SELECT COUNT(*) FROM message_replies WHERE message_id = m.id) as reply_count
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [userIdInt, otherUserIdInt, otherUserIdInt, userIdInt]);

    // Get all replies for these messages
    const messageIds = messages.map(m => m.id);
    let replies = [];
    if (messageIds.length > 0) {
      const placeholders = messageIds.map(() => '?').join(',');
      [replies] = await db.query(`
        SELECT mr.*, 
               sender.name as sender_name,
               sender.role as sender_role
        FROM message_replies mr
        LEFT JOIN users sender ON mr.sender_id = sender.id
        WHERE mr.message_id IN (${placeholders})
        ORDER BY mr.created_at ASC
      `, messageIds);
    }

    res.json({
      success: true,
      messages,
      replies,
      total_messages: messages.length,
      total_replies: replies.length
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      success: false 
    });
  }
});

// Get unread message count - Enhanced with proper group message handling
router.get('/unread/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    // Validate user ID
    if (isNaN(userIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid user ID format', 
        success: false,
        code: 'INVALID_USER_ID'
      });
    }
    
    if (req.userId !== userIdInt) {
      return res.status(403).json({ 
        message: 'Access denied - Can only view own unread count', 
        success: false,
        code: 'ACCESS_DENIED'
      });
    }

    // Get unread count for single messages
    const [singleMessages] = await db.query(`
      SELECT COUNT(*) as count
      FROM messages m
      WHERE m.receiver_id = ? AND m.is_read = false AND m.is_group = false
    `, [userIdInt]);

    // Get unread count for group messages
    const [groupMessages] = await db.query(`
      SELECT COUNT(*) as count
      FROM messages m
      INNER JOIN message_recipients mr ON m.id = mr.message_id
      WHERE mr.user_id = ? AND mr.is_read = false AND m.is_group = true
    `, [userIdInt]);

    // Get unread notifications count
    const [notifications] = await db.query(`
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND is_read = false
    `, [userIdInt]);

    const totalUnread = singleMessages[0].count + groupMessages[0].count;

    res.json({ 
      count: totalUnread,
      single_messages: singleMessages[0].count,
      group_messages: groupMessages[0].count,
      notifications: notifications[0].count,
      success: true
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ 
      message: 'Server error while fetching unread count', 
      error: error.message,
      success: false,
      code: 'UNREAD_COUNT_ERROR'
    });
  }
});

// Get notifications for dashboard
router.get('/notifications/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    if (req.userId !== userIdInt) {
      return res.status(403).json({ 
        message: 'Access denied', 
        success: false,
        code: 'ACCESS_DENIED'
      });
    }

    const [notifications] = await db.query(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [userIdInt]);

    res.json({
      notifications,
      count: notifications.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      message: 'Server error while fetching notifications', 
      error: error.message,
      success: false,
      code: 'NOTIFICATIONS_ERROR'
    });
  }
});

// Send a message (single or group) - Enhanced with comprehensive validation
router.post('/', verifyUser, checkSendPermission, async (req, res) => {
  try {
    const { receiver_id, receiver_ids, subject, message, message_type, is_group } = req.body;
    const senderIdInt = req.userId;
    
    // Comprehensive input validation
    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Subject is required and cannot be empty',
        success: false,
        code: 'SUBJECT_REQUIRED'
      });
    }
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Message content is required and cannot be empty',
        success: false,
        code: 'MESSAGE_REQUIRED'
      });
    }

    // Validate subject and message length
    if (subject.length > 255) {
      return res.status(400).json({ 
        message: 'Subject cannot exceed 255 characters',
        success: false,
        code: 'SUBJECT_TOO_LONG'
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({ 
        message: 'Message cannot exceed 5000 characters',
        success: false,
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // Validate message type
    const validMessageTypes = ['general', 'property', 'announcement', 'alert', 'payment', 'verification'];
    const messageType = message_type || 'general';
    if (!validMessageTypes.includes(messageType)) {
      return res.status(400).json({ 
        message: 'Invalid message type',
        success: false,
        code: 'INVALID_MESSAGE_TYPE'
      });
    }

    // Determine if group or single message
    const isGroupMsg = is_group || (Array.isArray(receiver_ids) && receiver_ids.length > 0);
    
    if (!isGroupMsg && !receiver_id) {
      return res.status(400).json({ 
        message: 'Receiver ID required for single messages',
        success: false,
        code: 'RECEIVER_REQUIRED'
      });
    }

    // Single message handling
    if (!isGroupMsg) {
      const receiverIdInt = parseInt(receiver_id);
      
      if (isNaN(receiverIdInt)) {
        return res.status(400).json({ 
          message: 'Invalid receiver ID format', 
          success: false,
          code: 'INVALID_RECEIVER_ID'
        });
      }

      if (senderIdInt === receiverIdInt) {
        return res.status(400).json({ 
          message: 'Cannot send message to yourself', 
          success: false,
          code: 'SELF_MESSAGE_NOT_ALLOWED'
        });
      }

      // Verify receiver exists and is active
      const [receiver] = await db.query('SELECT id, name, status FROM users WHERE id = ?', [receiverIdInt]);
      if (receiver.length === 0) {
        return res.status(404).json({ 
          message: 'Receiver not found', 
          success: false,
          code: 'RECEIVER_NOT_FOUND'
        });
      }

      if (receiver[0].status !== 'active') {
        return res.status(400).json({ 
          message: 'Cannot send message to inactive user', 
          success: false,
          code: 'RECEIVER_INACTIVE'
        });
      }

      // Insert message
      const [result] = await db.query(`
        INSERT INTO messages (sender_id, receiver_id, subject, message, message_type, is_read, is_group, created_at)
        VALUES (?, ?, ?, ?, ?, false, false, NOW())
      `, [senderIdInt, receiverIdInt, subject.trim(), message.trim(), messageType]);
      
      // Create notification using proper notifications table structure
      const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [senderIdInt]);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          receiverIdInt, 
          `New message from ${sender[0].name}`, 
          subject.trim(), 
          'info', 
          false,
          `/messages/${result.insertId}`
        ]
      );

      // Notify receiver via email
      try {
        const emailData = templates.newMessage(receiver[0].name, sender[0].name);
        await sendEmail(receiver[0].email, emailData.subject, emailData.html);
      } catch (e) { console.warn('[Messaging] Email notification failed:', e.message); }

      // Emit real-time socket event
      socket.emitToUser(receiverIdInt, 'new_message', {
        messageId: result.insertId,
        senderId: senderIdInt,
        subject: subject.trim()
      });
      // Emit generic notification update
      socket.emitToUser(receiverIdInt, 'new_notification', {
        title: `New message from ${sender[0].name}`,
        message: subject.trim(),
        type: 'info'
      });

      return res.json({ 
        id: result.insertId, 
        message: 'Message sent successfully',
        receiver: receiver[0].name,
        success: true
      });
    }

    // Group message handling
    if (!Array.isArray(receiver_ids) || receiver_ids.length === 0) {
      return res.status(400).json({ 
        message: 'Invalid or empty receiver list for group message', 
        success: false,
        code: 'INVALID_RECEIVER_LIST'
      });
    }

    const receiverIdsInt = receiver_ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id !== senderIdInt);
    
    if (receiverIdsInt.length === 0) {
      return res.status(400).json({ 
        message: 'No valid recipients after filtering', 
        success: false,
        code: 'NO_VALID_RECIPIENTS'
      });
    }

    if (receiverIdsInt.length > 1000) {
      return res.status(400).json({ 
        message: 'Too many recipients (maximum 1000)', 
        success: false,
        code: 'TOO_MANY_RECIPIENTS'
      });
    }

    // Verify all receivers exist and are active
    const [receivers] = await db.query(
      `SELECT id, name, status FROM users WHERE id IN (${receiverIdsInt.map(() => '?').join(',')})`,
      receiverIdsInt
    );

    const activeReceivers = receivers.filter(r => r.status === 'active');
    if (activeReceivers.length === 0) {
      return res.status(400).json({ 
        message: 'No active recipients found', 
        success: false,
        code: 'NO_ACTIVE_RECIPIENTS'
      });
    }

    if (receivers.length !== receiverIdsInt.length) {
      const foundIds = receivers.map(r => r.id);
      const missingIds = receiverIdsInt.filter(id => !foundIds.includes(id));
      console.warn(`Missing receiver IDs: ${missingIds.join(', ')}`);
    }

    // Insert group message
    const [result] = await db.query(`
      INSERT INTO messages (sender_id, subject, message, message_type, is_read, is_group, created_at)
      VALUES (?, ?, ?, ?, false, true, NOW())
    `, [senderIdInt, subject.trim(), message.trim(), messageType]);

    // Create group message recipients (only for active users)
    const activeReceiverIds = activeReceivers.map(r => r.id);
    const recipientValues = activeReceiverIds.map(id => [result.insertId, id, false, null]); // message_id, user_id, is_read, read_at
    
    if (recipientValues.length > 0) {
      await db.query(`
        INSERT INTO message_recipients (message_id, user_id, is_read, read_at) VALUES ?
      `, [recipientValues]);
    }

    // Create notifications in batches for better performance
    const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [senderIdInt]);
    const notificationValues = activeReceiverIds.map(receiverId => [
      receiverId, 
      `New group message from ${sender[0].name}`, 
      subject.trim(), 
      'info', 
      false,
      `/messages/${result.insertId}`,
      new Date()
    ]);

    if (notificationValues.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < notificationValues.length; i += batchSize) {
        const batch = notificationValues.slice(i, i + batchSize);
        await db.query(`
          INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
          VALUES ?
        `, [batch]);
      }
    }

    // Emit real-time socket event to all active receivers
    activeReceiverIds.forEach(receiverId => {
      socket.emitToUser(receiverId, 'new_message', {
        messageId: result.insertId,
        senderId: senderIdInt,
        subject: subject.trim(),
        isGroup: true
      });
      socket.emitToUser(receiverId, 'new_notification', {
        title: `New group message from ${sender[0].name}`,
        message: subject.trim(),
        type: 'info'
      });
    });

    res.json({ 
      id: result.insertId, 
      message: `Group message sent to ${activeReceiverIds.length} recipients`,
      count: activeReceiverIds.length,
      total_requested: receiverIdsInt.length,
      active_recipients: activeReceiverIds.length,
      success: true
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      message: 'Failed to send message', 
      error: error.message,
      success: false,
      code: 'SEND_ERROR'
    });
  }
});

// Mark message as read
router.put('/read/:messageId', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageIdInt = parseInt(messageId);
    
    // Verify user has access to this message
    const [message] = await db.query(
      'SELECT receiver_id, is_group FROM messages WHERE id = ?',
      [messageIdInt]
    );
    
    if (message.length === 0) {
      return res.status(404).json({ message: 'Message not found', success: false });
    }

    if (!message[0].is_group && message[0].receiver_id !== req.userId) {
      return res.status(403).json({ message: 'Forbidden', success: false });
    }

    // For single messages, update messages table
    if (!message[0].is_group) {
      await db.query('UPDATE messages SET is_read = true WHERE id = ?', [messageIdInt]);
    } else {
      // For group messages, update message_recipients table
      await db.query(
        'UPDATE message_recipients SET is_read = true, read_at = NOW() WHERE message_id = ? AND user_id = ?',
        [messageIdInt, req.userId]
      );
    }

    res.json({ message: 'Message marked as read', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all messages as read for a user
router.put('/read-all/:userId', verifyUser, async (req, res) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    
    if (req.userId !== userIdInt) {
      return res.status(403).json({ message: 'Forbidden', success: false });
    }

    await db.query(`
      UPDATE messages SET is_read = true WHERE receiver_id = ? OR is_group = true
    `, [userIdInt]);
    res.json({ message: 'All messages marked as read', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a message - Enhanced to allow users to delete admin messages
router.delete('/:messageId', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageIdInt = parseInt(messageId);
    
    // Validate message ID
    if (isNaN(messageIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid message ID format',
        success: false,
        code: 'INVALID_MESSAGE_ID'
      });
    }

    // Get message details including sender role
    const [message] = await db.query(`
      SELECT m.sender_id, m.subject, u.role as sender_role 
      FROM messages m 
      LEFT JOIN users u ON m.sender_id = u.id 
      WHERE m.id = ?
    `, [messageIdInt]);
    
    if (message.length === 0) {
      return res.status(404).json({ 
        message: 'Message not found', 
        success: false,
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    const canDelete = (
      // System admin can delete any message
      req.userRole === 'system_admin' ||
      // Message sender can delete their own message
      message[0].sender_id === req.userId ||
      // Regular users can delete messages from admins/property admins
      (message[0].sender_role === 'system_admin' || message[0].sender_role === 'property_admin')
    );

    if (!canDelete) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete this message', 
        success: false,
        code: 'DELETE_NOT_PERMITTED'
      });
    }

    // Delete the message
    await db.query('DELETE FROM messages WHERE id = ?', [messageIdInt]);
    
    // Also delete from message_recipients if it's a group message
    await db.query('DELETE FROM message_recipients WHERE message_id = ?', [messageIdInt]);

    res.json({ 
      message: 'Message deleted successfully', 
      id: messageIdInt,
      success: true
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ 
      message: 'Server error while deleting message', 
      error: error.message,
      success: false,
      code: 'DELETE_ERROR'
    });
  }
});

// Edit a message (only sender can edit) - Enhanced with validation and history
router.put('/:messageId', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { subject, message } = req.body;
    const messageIdInt = parseInt(messageId);

    // Validate message ID
    if (isNaN(messageIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid message ID format',
        success: false,
        code: 'INVALID_MESSAGE_ID'
      });
    }

    // Validate input
    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Subject is required and cannot be empty',
        success: false,
        code: 'SUBJECT_REQUIRED'
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Message content is required and cannot be empty',
        success: false,
        code: 'MESSAGE_REQUIRED'
      });
    }

    // Validate length
    if (subject.length > 255) {
      return res.status(400).json({ 
        message: 'Subject cannot exceed 255 characters',
        success: false,
        code: 'SUBJECT_TOO_LONG'
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({ 
        message: 'Message cannot exceed 5000 characters',
        success: false,
        code: 'MESSAGE_TOO_LONG'
      });
    }

    // Verify message exists and user owns it
    const [msg] = await db.query(
      'SELECT sender_id, subject, message, created_at FROM messages WHERE id = ?',
      [messageIdInt]
    );
    
    if (msg.length === 0) {
      return res.status(404).json({ 
        message: 'Message not found', 
        success: false,
        code: 'MESSAGE_NOT_FOUND'
      });
    }

    // Check if user is the sender or system admin
    if (msg[0].sender_id !== req.userId && req.userRole !== 'system_admin') {
      return res.status(403).json({ 
        message: 'Only message sender or system admin can edit messages', 
        success: false,
        code: 'EDIT_NOT_PERMITTED'
      });
    }

    // Check if message is too old to edit (optional: 24 hours limit)
    const messageAge = Date.now() - new Date(msg[0].created_at).getTime();
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (messageAge > maxEditAge && req.userRole !== 'system_admin') {
      return res.status(403).json({ 
        message: 'Message is too old to edit (24 hour limit)', 
        success: false,
        code: 'MESSAGE_TOO_OLD'
      });
    }

    // Store original message in history (future enhancement)
    // For now, we'll just update the message
    
    // Update the message
    await db.query(
      'UPDATE messages SET subject = ?, message = ?, updated_at = NOW() WHERE id = ?',
      [subject.trim(), message.trim(), messageIdInt]
    );

    res.json({ 
      message: 'Message updated successfully', 
      id: messageIdInt,
      updated_at: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({ 
      message: 'Server error while updating message', 
      error: error.message,
      success: false,
      code: 'UPDATE_ERROR'
    });
  }
});

// Send bulk messages (Admin/PropertyAdmin to multiple users) - Fixed timing issue
router.post('/bulk', verifyUser, checkSendPermission, async (req, res) => {
  try {
    const { receiver_ids, subject, message, message_type, filter_role } = req.body;
    const senderIdInt = req.userId;
    
    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({ 
        message: 'Subject and message are required',
        success: false
      });
    }

    // Check sender permissions for bulk messaging
    if (!['admin', 'system_admin', 'property_admin'].includes(req.userRole)) {
      return res.status(403).json({ 
        message: 'Only admins and property admins can send bulk messages',
        success: false
      });
    }

    let receiverIdsInt = [];

    // If specific receivers provided
    if (Array.isArray(receiver_ids) && receiver_ids.length > 0) {
      receiverIdsInt = receiver_ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id !== senderIdInt);
    } 
    // If role filter provided
    else if (filter_role) {
      if (filter_role === 'all') {
        const [users] = await db.query(
          'SELECT id FROM users WHERE id != ? AND status = \'active\'',
          [senderIdInt]
        );
        receiverIdsInt = users.map(u => u.id);
      } else {
        const [users] = await db.query(
          'SELECT id FROM users WHERE role = ? AND id != ? AND status = \'active\'',
          [filter_role, senderIdInt]
        );
        receiverIdsInt = users.map(u => u.id);
      }
    }

    if (receiverIdsInt.length === 0) {
      return res.status(400).json({ message: 'No valid recipients', success: false });
    }

    // Verify all receivers exist and are active
    const [receivers] = await db.query(
      `SELECT id FROM users WHERE id IN (${receiverIdsInt.map(() => '?').join(',')}) AND status = 'active'`,
      receiverIdsInt
    );

    if (receivers.length !== receiverIdsInt.length) {
      return res.status(400).json({ message: 'Some receiver IDs do not exist', success: false });
    }

    // Insert group message
    const [result] = await db.query(`
      INSERT INTO messages (sender_id, subject, message, message_type, is_read, is_group, created_at)
      VALUES (?, ?, ?, ?, false, true, NOW())
    `, [senderIdInt, subject, message, message_type || 'general']);

    // Create group message recipients in batches to improve performance
    const batchSize = 100;
    const recipientValues = receiverIdsInt.map(id => [result.insertId, id]);
    
    for (let i = 0; i < recipientValues.length; i += batchSize) {
      const batch = recipientValues.slice(i, i + batchSize);
      await db.query(`
        INSERT INTO message_recipients (message_id, user_id) VALUES ?
      `, [batch]);
    }

    // Create notifications in batches to improve performance
    const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [senderIdInt]);
    const notificationValues = receiverIdsInt.map(receiverId => [
      receiverId, 
      `New message from ${sender[0].name}`, 
      subject, 
      'info', 
      `/messages/${result.insertId}`
    ]);

    for (let i = 0; i < notificationValues.length; i += batchSize) {
      const batch = notificationValues.slice(i, i + batchSize);
      await db.query(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES ?
      `, [batch]);
    }

    res.json({ 
      id: result.insertId, 
      message: `Message sent to ${receiverIdsInt.length} recipients`,
      count: receiverIdsInt.length,
      success: true
    });
  } catch (error) {
    console.error('Error sending bulk messages:', error);
    res.status(500).json({ 
      message: 'Failed to send messages', 
      error: error.message,
      success: false
    });
  }
});

// ============================================================================
// REPLY ENDPOINTS (PHASE 1)
// ============================================================================

// Get message thread (message + all replies)
router.get('/:messageId/thread', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageIdInt = parseInt(messageId);
    
    if (isNaN(messageIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid message ID format',
        success: false
      });
    }

    // Get the main message
    const [mainMessage] = await db.query(`
      SELECT m.*, 
             sender.name as sender_name, 
             sender.role as sender_role,
             receiver.name as receiver_name
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN users receiver ON m.receiver_id = receiver.id
      WHERE m.id = ?
    `, [messageIdInt]);

    if (mainMessage.length === 0) {
      return res.status(404).json({ 
        message: 'Message not found',
        success: false
      });
    }

    // Get all replies to this message
    const [replies] = await db.query(`
      SELECT m.*, 
             sender.name as sender_name, 
             sender.role as sender_role
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      WHERE m.parent_id = ?
      ORDER BY m.created_at ASC
    `, [messageIdInt]);

    res.json({
      main_message: mainMessage[0],
      replies: replies,
      reply_count: replies.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching message thread:', error);
    res.status(500).json({ 
      message: 'Server error while fetching thread', 
      error: error.message,
      success: false
    });
  }
});

// Get all replies to a message
router.get('/:messageId/replies', verifyUser, async (req, res) => {
  try {
    const { messageId } = req.params;
    const messageIdInt = parseInt(messageId);
    
    if (isNaN(messageIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid message ID format',
        success: false
      });
    }

    const [replies] = await db.query(`
      SELECT m.*, 
             sender.name as sender_name, 
             sender.role as sender_role
      FROM messages m
      LEFT JOIN users sender ON m.sender_id = sender.id
      WHERE m.parent_id = ?
      ORDER BY m.created_at ASC
    `, [messageIdInt]);

    res.json({
      replies: replies,
      count: replies.length,
      success: true
    });
  } catch (error) {
    console.error('Error fetching replies:', error);
    res.status(500).json({ 
      message: 'Server error while fetching replies', 
      error: error.message,
      success: false
    });
  }
});

// Send a reply to a message
router.post('/:messageId/reply', verifyUser, checkSendPermission, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { subject, message } = req.body;
    const senderIdInt = req.userId;
    const messageIdInt = parseInt(messageId);

    if (isNaN(messageIdInt)) {
      return res.status(400).json({ 
        message: 'Invalid message ID format',
        success: false
      });
    }

    // Validate input
    if (!subject || subject.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Subject is required',
        success: false
      });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Message content is required',
        success: false
      });
    }

    // Get the original message to find the receiver
    const [originalMsg] = await db.query(
      'SELECT sender_id, receiver_id FROM messages WHERE id = ?',
      [messageIdInt]
    );

    if (originalMsg.length === 0) {
      return res.status(404).json({ 
        message: 'Original message not found',
        success: false
      });
    }

    // Determine who to send the reply to
    const receiverId = originalMsg[0].sender_id === senderIdInt 
      ? originalMsg[0].receiver_id 
      : originalMsg[0].sender_id;

    if (!receiverId) {
      return res.status(400).json({ 
        message: 'Cannot determine reply recipient',
        success: false
      });
    }

    // Create the reply message
    const [result] = await db.query(`
      INSERT INTO messages (sender_id, receiver_id, subject, message, message_type, is_read, is_group, parent_id, created_at)
      VALUES (?, ?, ?, ?, ?, false, false, ?, NOW())
    `, [senderIdInt, receiverId, subject.trim(), message.trim(), 'general', messageIdInt]);

    // Update reply count on parent message
    await db.query(
      'UPDATE messages SET reply_count = reply_count + 1 WHERE id = ?',
      [messageIdInt]
    );

    // Create notification for the reply recipient
    const [sender] = await db.query('SELECT name FROM users WHERE id = ?', [senderIdInt]);
    const [receiver] = await db.query('SELECT name, email FROM users WHERE id = ?', [receiverId]);
    
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        receiverId, 
        `New reply from ${sender[0].name}`, 
        subject.trim(), 
        'info', 
        false,
        `/messages/${result.insertId}`
      ]
    );

    // Notify receiver via email
    try {
      if (receiver.length > 0) {
        const emailData = templates.newMessage(receiver[0].name, sender[0].name);
        await sendEmail(receiver[0].email, emailData.subject, emailData.html);
      }
    } catch (e) { console.warn('[Messaging-Reply] Email notification failed:', e.message); }

    res.json({ 
      id: result.insertId, 
      message: 'Reply sent successfully',
      parent_id: messageIdInt,
      success: true
    });
  } catch (error) {
    console.error('Error sending reply:', error);
    res.status(500).json({ 
      message: 'Failed to send reply', 
      error: error.message,
      success: false
    });
  }
});

module.exports = router;
