const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ============================================================================
// POST /api/complaints
// Submit a new complaint
// ============================================================================
router.post('/', async (req, res) => {
  try {
    const { user_id, subject, description, category, priority } = req.body;

    if (!user_id || !subject || !description) {
      return res.status(400).json({ message: 'User ID, subject, and description are required', success: false });
    }

    // Validate category
    const validCategories = ['technical', 'billing', 'property', 'broker', 'service', 'other'];
    const validCategory = validCategories.includes(category) ? category : 'other';

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validPriority = validPriorities.includes(priority) ? priority : 'medium';

    // Verify user exists
    const [user] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [user_id]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found', success: false });
    }

    const [result] = await db.query(
      `INSERT INTO complaints (user_id, subject, description, category, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', NOW(), NOW())`,
      [user_id, subject.trim(), description.trim(), validCategory, validPriority]
    );

    // Create notification for system admins
    const [admins] = await db.query("SELECT id FROM users WHERE role IN ('system_admin', 'admin')");
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'warning', false, NOW())`,
        [admin.id, `New Complaint: ${subject.trim()}`, `${user[0].name} (${user[0].role}) submitted a ${validPriority} priority complaint.`]
      );
    }

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Complaint submitted successfully. Our admin team will review it shortly.'
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// GET /api/complaints/user/:userId
// Get complaints for a specific user
// ============================================================================
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [complaints] = await db.query(`
      SELECT c.*, 
             u.name AS user_name, 
             u.email AS user_email, 
             u.role AS user_role,
             resolver.name AS resolved_by_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users resolver ON c.resolved_by = resolver.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [userId]);

    res.json({ success: true, complaints });
  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// GET /api/complaints/admin/all
// Get all complaints (admin only)
// ============================================================================
router.get('/admin/all', async (req, res) => {
  try {
    const { status, priority, category } = req.query;

    let query = `
      SELECT c.*, 
             u.name AS user_name, 
             u.email AS user_email, 
             u.role AS user_role,
             u.phone AS user_phone,
             resolver.name AS resolved_by_name
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN users resolver ON c.resolved_by = resolver.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' AND c.status = ?';
      params.push(status);
    }
    if (priority && priority !== 'all') {
      query += ' AND c.priority = ?';
      params.push(priority);
    }
    if (category && category !== 'all') {
      query += ' AND c.category = ?';
      params.push(category);
    }

    query += ' ORDER BY CASE c.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 WHEN \'low\' THEN 4 END, c.created_at DESC';

    const [complaints] = await db.query(query, params);

    res.json({ success: true, complaints });
  } catch (error) {
    console.error('Error fetching all complaints:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// GET /api/complaints/admin/stats
// Get complaint statistics
// ============================================================================
router.get('/admin/stats', async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) AS count FROM complaints');
    const [open] = await db.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'open'");
    const [inProgress] = await db.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'in_progress'");
    const [resolved] = await db.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'resolved'");
    const [closed] = await db.query("SELECT COUNT(*) AS count FROM complaints WHERE status = 'closed'");

    const [byCategory] = await db.query(`
      SELECT category, COUNT(*) AS count 
      FROM complaints 
      GROUP BY category 
      ORDER BY count DESC
    `);

    const [byPriority] = await db.query(`
      SELECT priority, COUNT(*) AS count 
      FROM complaints 
      GROUP BY priority
    `);

    const [byRole] = await db.query(`
      SELECT u.role, COUNT(c.id) AS count 
      FROM complaints c
      LEFT JOIN users u ON c.user_id = u.id
      GROUP BY u.role
    `);

    const [urgent] = await db.query("SELECT COUNT(*) AS count FROM complaints WHERE priority = 'urgent' AND status IN ('open', 'in_progress')");

    res.json({
      success: true,
      total: total[0].count,
      open: open[0].count,
      in_progress: inProgress[0].count,
      resolved: resolved[0].count,
      closed: closed[0].count,
      urgent: urgent[0].count,
      byCategory,
      byPriority,
      byRole
    });
  } catch (error) {
    console.error('Error fetching complaint stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// PUT /api/complaints/:id/respond
// Admin respond to a complaint
// ============================================================================
router.put('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_response, admin_id, status } = req.body;

    if (!admin_response || !admin_id) {
      return res.status(400).json({ message: 'Admin response and admin ID are required', success: false });
    }

    const newStatus = status || 'in_progress';

    const updateFields = [
      'admin_response = ?',
      'status = ?',
      'updated_at = NOW()'
    ];
    const params = [admin_response.trim(), newStatus];

    if (newStatus === 'resolved' || newStatus === 'closed') {
      updateFields.push('resolved_by = ?');
      updateFields.push('resolved_at = NOW()');
      params.push(admin_id);
    }

    params.push(id);
    await db.query(`UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Notify the complainant
    const [complaint] = await db.query('SELECT user_id, subject FROM complaints WHERE id = ?', [id]);
    if (complaint.length > 0) {
      const [admin] = await db.query('SELECT name FROM users WHERE id = ?', [admin_id]);
      const adminName = admin.length > 0 ? admin[0].name : 'System Admin';

      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'info', false, NOW())`,
        [
          complaint[0].user_id,
          `Complaint Update: ${complaint[0].subject}`,
          `${adminName} has responded to your complaint. Status: ${newStatus.replace('_', ' ')}`
        ]
      );
    }

    res.json({ success: true, message: 'Response sent successfully' });
  } catch (error) {
    console.error('Error responding to complaint:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

// ============================================================================
// PUT /api/complaints/:id/status
// Update complaint status
// ============================================================================
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_id } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status', success: false });
    }

    const updateFields = ['status = ?', 'updated_at = NOW()'];
    const params = [status];

    if (status === 'resolved' || status === 'closed') {
      updateFields.push('resolved_by = ?');
      updateFields.push('resolved_at = NOW()');
      params.push(admin_id);
    }

    params.push(id);
    await db.query(`UPDATE complaints SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Notify the complainant
    const [complaint] = await db.query('SELECT user_id, subject FROM complaints WHERE id = ?', [id]);
    if (complaint.length > 0) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, 'info', false, NOW())`,
        [
          complaint[0].user_id,
          `Complaint Status Updated`,
          `Your complaint "${complaint[0].subject}" status has been changed to: ${status.replace('_', ' ')}`
        ]
      );
    }

    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ message: 'Server error', error: error.message, success: false });
  }
});

module.exports = router;
