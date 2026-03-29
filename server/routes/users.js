const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, status, profile_approved, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search users by name or email
router.get('/search', async (req, res) => {
  try {
    const { q, role } = req.query;
    let query = 'SELECT id, name, email, role FROM users WHERE 1=1';
    const params = [];

    if (q) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (role && role !== 'all') {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY name ASC LIMIT 50';
    const [users] = await db.query(query, params);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get users by role
router.get('/role/:role', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role FROM users WHERE role = ? ORDER BY name ASC',
      [req.params.role]
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user (General) - Explicit route
router.put('/update/:id', async (req, res) => {
  try {
    const { name, email, role, status, profile_approved } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (profile_approved !== undefined) { updates.push('profile_approved = ?'); params.push(profile_approved ? 1 : 0); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(req.params.id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    console.log(`[USER-API] Executing update on /update/${req.params.id}:`, { sql, params });

    await db.query(sql, params);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('[USER-API] Update failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Legacy/Rest update for compatibility
router.put('/:id', async (req, res) => {
  try {
    const { name, email, role, status, profile_approved } = req.body;
    const userId = req.params.id;

    console.log(`[USER-API] Legacy PUT received for ID: ${userId}`, req.body);

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (profile_approved !== undefined) { updates.push('profile_approved = ?'); params.push(profile_approved ? 1 : 0); }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    params.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('[USER-API] Legacy update failed:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new user account (Admin functionality)
router.post('/add', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    const bcrypt = require('bcryptjs');

    // Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({ message: 'Name, email, and role are required' });
    }

    // Check if user already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'admin123', 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, role, status, profile_approved, profile_completed) VALUES (?, ?, ?, ?, ?, "active", 0, 0)',
      [name, email, hashedPassword, phone || null, role]
    );

    res.json({
      success: true,
      user_id: result.insertId,
      message: 'User account created successfully'
    });
  } catch (error) {
    console.error('[USER-API] Create failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admin/system_admin
    if (['admin', 'system_admin'].includes(users[0].role)) {
      return res.status(403).json({ message: 'Cannot delete admin accounts' });
    }

    // Delete related profile data first
    await db.query('DELETE FROM customer_profiles WHERE user_id = ?', [userId]).catch(() => { });
    await db.query('DELETE FROM owner_profiles WHERE user_id = ?', [userId]).catch(() => { });
    await db.query('DELETE FROM broker_profiles WHERE user_id = ?', [userId]).catch(() => { });
    await db.query('DELETE FROM notifications WHERE user_id = ?', [userId]).catch(() => { });
    await db.query('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [userId, userId]).catch(() => { });

    // Delete the user
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Catch-all for users router to debug 404s
router.use((req, res) => {
  console.warn(`[USER-API] 404 on ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    message: `User API: Endpoint not found (${req.method} ${req.originalUrl})`,
    tip: 'Check if you use /api/users/update/:id for PUT requests'
  });
});

module.exports = router;
