const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all edit requests (Admin only)
router.get('/all', async (req, res) => {
  try {
    const query = `
      SELECT 
        per.id,
        per.user_id,
        per.profile_type,
        per.status,
        per.reason,
        per.requested_at,
        per.reviewed_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM profile_edit_requests per
      JOIN users u ON per.user_id = u.id
      ORDER BY per.requested_at DESC
    `;
    
    const [results] = await db.query(query);
    res.json(results);
  } catch (error) {
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ message: 'Error fetching edit requests', error: error.message });
  }
});

// Get edit requests for specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT 
        id,
        user_id,
        profile_type,
        status,
        reason,
        requested_changes,
        admin_notes,
        requested_at,
        reviewed_at,
        approved_at,
        rejected_at
      FROM profile_edit_requests
      WHERE user_id = ?
      ORDER BY requested_at DESC
    `;
    
    const [results] = await db.query(query, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching user edit requests:', error);
    res.status(500).json({ message: 'Error fetching edit requests', error: error.message });
  }
});

// Create edit request
router.post('/request', async (req, res) => {
  try {
    const { user_id, profile_type, profile_id, reason, requested_changes } = req.body;
    
    if (!user_id || !profile_type || !profile_id) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const query = `
      INSERT INTO profile_edit_requests 
      (user_id, profile_type, profile_id, reason, requested_changes, status, request_type)
      VALUES (?, ?, ?, ?, ?, 'pending', 'profile_edit')
    `;
    
    const [result] = await db.query(query, [user_id, profile_type, profile_id, reason, JSON.stringify(requested_changes || {})]);
    
    // Create notification for admin
    const notificationQuery = `
      INSERT INTO notifications 
      (user_id, type, title, message)
      SELECT 
        u.id,
        'info',
        'New Profile Edit Request',
        ?
      FROM users u
      WHERE u.role IN ('admin', 'system_admin')
    `;
    
    try {
      const messageStr = `User ${user_id} has requested to edit their ${profile_type} profile`;
      await db.query(notificationQuery, [messageStr]);
    } catch (notifErr) {
      console.error('Error creating notification:', notifErr);
    }
    
    res.status(201).json({ 
      message: 'Edit request created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating edit request:', error);
    res.status(500).json({ message: 'Error creating edit request', error: error.message });
  }
});

// Get edit request details
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const query = `
      SELECT 
        per.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        admin.name as admin_name
      FROM profile_edit_requests per
      JOIN users u ON per.user_id = u.id
      LEFT JOIN users admin ON per.reviewed_by = admin.id
      WHERE per.id = ?
    `;
    
    const [results] = await db.query(query, [requestId]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Edit request not found' });
    }
    
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching edit request:', error);
    res.status(500).json({ message: 'Error fetching edit request', error: error.message });
  }
});

// Approve edit request
router.put('/:requestId/approve', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { admin_id, admin_notes } = req.body;
    
    if (!admin_id) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }
    
    // Get edit request details
    const getQuery = `SELECT * FROM profile_edit_requests WHERE id = ?`;
    const [results] = await db.query(getQuery, [requestId]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Edit request not found' });
    }
    
    const editRequest = results[0];
    
    // Update edit request status
    const updateQuery = `
      UPDATE profile_edit_requests 
      SET status = 'approved', 
          reviewed_by = ?, 
          reviewed_at = NOW(),
          approved_at = NOW(),
          admin_notes = ?,
          user_notified = FALSE
      WHERE id = ?
    `;
    
    await db.query(updateQuery, [admin_id, admin_notes, requestId]);
    
    // Create notification for user
    const notificationQuery = `
      INSERT INTO notifications 
      (user_id, type, title, message)
      VALUES (?, 'success', 'Profile Edit Request Approved', 
              'Your request to edit your profile has been approved. You can now make changes.')
    `;
    
    try {
      await db.query(notificationQuery, [editRequest.user_id]);
    } catch (notifErr) {
      console.error('Error creating notification:', notifErr);
    }
    
    // Add to history
    const historyQuery = `
      INSERT INTO profile_edit_request_history 
      (edit_request_id, user_id, profile_type, action, admin_id, admin_notes)
      VALUES (?, ?, ?, 'approved', ?, ?)
    `;
    
    try {
      await db.query(historyQuery, [requestId, editRequest.user_id, editRequest.profile_type, admin_id, admin_notes]);
    } catch (histErr) {
      console.error('Error adding to history:', histErr);
    }
    
    res.json({ message: 'Edit request approved successfully' });
  } catch (error) {
    console.error('Error approving edit request:', error);
    res.status(500).json({ message: 'Error approving edit request', error: error.message });
  }
});

// Reject edit request
router.put('/:requestId/reject', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { admin_id, admin_notes } = req.body;
    
    if (!admin_id) {
      return res.status(400).json({ message: 'Admin ID is required' });
    }
    
    // Get edit request details
    const getQuery = `SELECT * FROM profile_edit_requests WHERE id = ?`;
    const [results] = await db.query(getQuery, [requestId]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Edit request not found' });
    }
    
    const editRequest = results[0];
    
    // Update edit request status
    const updateQuery = `
      UPDATE profile_edit_requests 
      SET status = 'rejected', 
          reviewed_by = ?, 
          reviewed_at = NOW(),
          rejected_at = NOW(),
          admin_notes = ?,
          user_notified = FALSE
      WHERE id = ?
    `;
    
    await db.query(updateQuery, [admin_id, admin_notes, requestId]);
    
    // Create notification for user
    const notificationQuery = `
      INSERT INTO notifications 
      (user_id, type, title, message)
      VALUES (?, 'error', 'Profile Edit Request Rejected', ?)
    `;
    
    try {
      const messageStr = `Your request to edit your profile has been rejected. Reason: ${admin_notes}`;
      await db.query(notificationQuery, [editRequest.user_id, messageStr]);
    } catch (notifErr) {
      console.error('Error creating notification:', notifErr);
    }
    
    // Add to history
    const historyQuery = `
      INSERT INTO profile_edit_request_history 
      (edit_request_id, user_id, profile_type, action, admin_id, admin_notes)
      VALUES (?, ?, ?, 'rejected', ?, ?)
    `;
    
    try {
      await db.query(historyQuery, [requestId, editRequest.user_id, editRequest.profile_type, admin_id, admin_notes]);
    } catch (histErr) {
      console.error('Error adding to history:', histErr);
    }
    
    res.json({ message: 'Edit request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting edit request:', error);
    res.status(500).json({ message: 'Error rejecting edit request', error: error.message });
  }
});

// Submit edited profile
router.post('/:requestId/submit', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { user_id, profile_type, updated_data } = req.body;
    
    if (!user_id || !profile_type || !updated_data) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Get edit request details
    const getQuery = `SELECT * FROM profile_edit_requests WHERE id = ?`;
    const [results] = await db.query(getQuery, [requestId]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Edit request not found' });
    }
    
    const editRequest = results[0];
    
    // Update the profile based on profile type
    let updateProfileQuery;
    const profileTable = `${profile_type}_profiles`;
    
    updateProfileQuery = `
      UPDATE ${profileTable}
      SET full_name = ?, phone_number = ?, address = ?
      WHERE user_id = ?
    `;
    
    try {
      await db.query(updateProfileQuery, [
        updated_data.full_name,
        updated_data.phone_number,
        updated_data.address,
        user_id
      ]);
    } catch (updateErr) {
      console.error('Error updating profile:', updateErr);
      return res.status(500).json({ message: 'Error updating profile', error: updateErr.message });
    }
    
    // Mark edit request as completed
    const completeQuery = `
      UPDATE profile_edit_requests
      SET status = 'completed'
      WHERE id = ?
    `;
    
    try {
      await db.query(completeQuery, [requestId]);
    } catch (completeErr) {
      console.error('Error completing edit request:', completeErr);
    }
    
    // Add to history
    const historyQuery = `
      INSERT INTO profile_edit_request_history 
      (edit_request_id, user_id, profile_type, action, new_values)
      VALUES (?, ?, ?, 'submitted', ?)
    `;
    
    try {
      await db.query(historyQuery, [requestId, user_id, profile_type, JSON.stringify(updated_data)]);
    } catch (histErr) {
      console.error('Error adding to history:', histErr);
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error submitting edited profile:', error);
    res.status(500).json({ message: 'Error submitting profile', error: error.message });
  }
});

// Get user notifications
router.get('/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const query = `
      SELECT 
        id,
        type,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    const [results] = await db.query(query, [userId]);
    res.json(results);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const query = `
      UPDATE notifications 
      SET is_read = TRUE
      WHERE id = ?
    `;
    
    await db.query(query, [notificationId]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

module.exports = router;
