const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendEmail, templates } = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for profile photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only images (jpeg, jpg, png, webp) are allowed!'));
  }
});

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, status, profile_approved, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search users by name, email, phone, or ID
router.get('/search', async (req, res) => {
  try {
    const { q, role } = req.query;
    let query = 'SELECT id, name, email, phone, role, status FROM users WHERE 1=1';
    const params = [];

    if (q) {
      // Check if the search term is a numeric ID
      const isNumeric = /^\d+$/.test(q.trim());
      if (isNumeric) {
        query += ' AND (id = ? OR name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)';
        params.push(q.trim(), `%${q}%`, `%${q}%`, `%${q}%`);
      } else {
        query += ' AND (name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)';
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' LIMIT 20';

    const [users] = await db.query(query, params);
    res.json(users);
  } catch (error) {
    console.error('[USER-API] Search failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID (with role-specific profile data)
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    // Base user query
    const [users] = await db.query('SELECT id, name, email, phone, role, status, profile_approved, profile_completed, profile_image, created_at FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];

    // If broker, join with broker_profiles
    if (user.role === 'broker') {
      const [profiles] = await db.query('SELECT * FROM broker_profiles WHERE user_id = ?', [userId]);
      if (profiles.length > 0) {
        Object.assign(user, profiles[0]);
      }
    }
    // If owner, join with owner_profiles
    else if (user.role === 'owner') {
      const [profiles] = await db.query('SELECT * FROM owner_profiles WHERE user_id = ?', [userId]);
      if (profiles.length > 0) {
        Object.assign(user, profiles[0]);
      }
    }
    // If customer/user, join with customer_profiles
    else if (user.role === 'user') {
      const [profiles] = await db.query('SELECT * FROM customer_profiles WHERE user_id = ?', [userId]);
      if (profiles.length > 0) {
        Object.assign(user, profiles[0]);
      }
    }

    res.json(user);
  } catch (error) {
    console.error(`[USER-API] Get by ID failed:`, error.message);
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
    const userId = req.params.id;

    // Fetch current status to check if approval is changing
    const [currentUser] = await db.query('SELECT name, email, profile_approved, status FROM users WHERE id = ?', [userId]);

    
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (profile_approved !== undefined) { updates.push('profile_approved = ?'); params.push(profile_approved ? true : false); }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    await db.query(sql, params);

    // If account was just activated (Stage 1)
    if (status === 'active' && currentUser.length > 0 && currentUser[0].status !== 'active') {
      const emailData = templates.accountApproved(currentUser[0].name); // This is the "Welcome" email
      await sendEmail(currentUser[0].email, emailData.subject, emailData.html);
    } 
    // If profile was just approved (Stage 3)
    else if (profile_approved === true && currentUser.length > 0 && currentUser[0].profile_approved !== 1) {
      // Create a specific template for profile approval if needed, or use a notification
      const emailData = {
        subject: 'Your Profile has been Approved! - Dire Dawa Real Estate Management system',
        html: `<h2>Congratulations!</h2><p>Your detailed profile has been approved. You now have full access to the system.</p>`
      };
      await sendEmail(currentUser[0].email, emailData.subject, emailData.html);
    }

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

    // Fetch current status to check if approval is changing
    const [currentUser] = await db.query('SELECT name, email, profile_approved FROM users WHERE id = ?', [userId]);

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (profile_approved !== undefined) { updates.push('profile_approved = ?'); params.push(profile_approved ? true : false); }

    if (updates.length === 0) return res.status(400).json({ message: 'No fields to update' });

    params.push(userId);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    // If account was just approved, send email
    if (profile_approved === true && currentUser.length > 0 && currentUser[0].profile_approved !== 1) {
      const emailData = templates.accountApproved(currentUser[0].name);
      await sendEmail(currentUser[0].email, emailData.subject, emailData.html);
    }

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

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, role, status, profile_approved, profile_completed) VALUES (?, ?, ?, ?, ?, \'active\', false, false)',
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

// Update user profile
router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Update users table
    await db.query('UPDATE users SET name = ?, phone = COALESCE(?, phone) WHERE id = ?', [name, phone, userId]);

    // Update role-specific tables
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.length > 0) {
      const role = user[0].role;
      if (role === 'broker') {
        await db.query('UPDATE broker_profiles SET full_name = ? WHERE user_id = ?', [name, userId]);
      } else if (role === 'owner') {
        await db.query('UPDATE owner_profiles SET full_name = ? WHERE user_id = ?', [name, userId]);
      } else if (role === 'user') {
        await db.query('UPDATE customer_profiles SET full_name = ? WHERE user_id = ?', [name, userId]);
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('[USER-API] Profile update failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload profile photo
router.post('/upload-photo/:id', upload.single('photo'), async (req, res) => {
  try {
    const userId = req.params.id;
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    // Update user table
    await db.query('UPDATE users SET profile_image = ? WHERE id = ?', [photoUrl, userId]);

    // Also update role-specific profiles if they exist
    const [user] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (user.length > 0) {
      const role = user[0].role;
      if (role === 'broker') {
        await db.query('UPDATE broker_profiles SET profile_photo = ? WHERE user_id = ?', [photoUrl, userId]);
      } else if (role === 'owner') {
        await db.query('UPDATE owner_profiles SET profile_photo = ? WHERE user_id = ?', [photoUrl, userId]);
      } else if (role === 'user') {
        await db.query('UPDATE customer_profiles SET profile_photo = ? WHERE user_id = ?', [photoUrl, userId]);
      }
    }

    res.json({ 
      message: 'Profile photo uploaded successfully', 
      photoUrl: photoUrl 
    });
  } catch (error) {
    console.error('[USER-API] Photo upload failed:', error.message);
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
