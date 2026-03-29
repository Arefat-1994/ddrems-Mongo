const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Create new broker account (creates user with role='broker')
// IMPORTANT: This must be BEFORE /:id route to avoid route matching conflicts
router.post('/create-account', async (req, res) => {
  try {
    console.log('[BROKER-CREATE] Received request:', req.body);
    
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !phone) {
      console.log('[BROKER-CREATE] Validation failed: Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Name, email, and phone are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format' 
      });
    }

    // Check if email already exists
    console.log('[BROKER-CREATE] Checking if email exists:', email);
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      console.log('[BROKER-CREATE] Email already exists');
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists' 
      });
    }

    // Hash password
    console.log('[BROKER-CREATE] Hashing password...');
    const hashedPassword = await bcrypt.hash(password || 'admin123', 10);
    console.log('[BROKER-CREATE] Password hashed successfully');

    // Create user account with role='broker'
    console.log('[BROKER-CREATE] Creating user account...');
    const [userResult] = await db.query(`
      INSERT INTO users (name, email, password, phone, role, status, profile_approved, profile_completed)
      VALUES (?, ?, ?, ?, 'broker', 'active', 0, 0)
    `, [name, email, hashedPassword, phone]);

    const userId = userResult.insertId;
    console.log('[BROKER-CREATE] User created successfully with ID:', userId);

    // Create notification for admin
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT id, 'New Broker Registration', ?, 'info' FROM users WHERE role = 'admin'`,
      [`New broker account created: ${name} (${email})`]
    );

    res.json({
      success: true,
      user_id: userId,
      message: 'Broker account created successfully. User can now login and complete their profile.'
    });
  } catch (error) {
    console.error('[BROKER-CREATE] Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create broker account', 
      error: error.message,
      details: error.toString()
    });
  }
});

// Get all brokers with profile information (ONLY from users and broker_profiles tables)
router.get('/', async (req, res) => {
  try {
    const [brokers] = await db.query(`
      SELECT
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.status as account_status,
        u.profile_approved,
        u.profile_completed,
        u.created_at as registered_at,
        bp.id as profile_id,
        bp.full_name,
        bp.phone_number as profile_phone,
        bp.address,
        bp.license_number,
        bp.profile_status,
        bp.profile_photo,
        bp.id_document,
        bp.broker_license,
        bp.rejection_reason,
        bp.created_at as profile_created_at,
        bp.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN broker_profiles bp ON u.id = bp.user_id
      WHERE u.role = 'broker'
      ORDER BY u.created_at DESC
    `);
    res.json(brokers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker by ID with profile information (ONLY from users and broker_profiles tables)
router.get('/:id', async (req, res) => {
  try {
    const [brokers] = await db.query(`
      SELECT
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.status as account_status,
        u.profile_approved,
        u.profile_completed,
        u.created_at as registered_at,
        bp.id as profile_id,
        bp.full_name,
        bp.phone_number as profile_phone,
        bp.address,
        bp.license_number,
        bp.profile_status,
        bp.profile_photo,
        bp.id_document,
        bp.broker_license,
        bp.rejection_reason,
        bp.created_at as profile_created_at,
        bp.updated_at as profile_updated_at
      FROM users u
      LEFT JOIN broker_profiles bp ON u.id = bp.user_id
      WHERE u.role = 'broker' AND u.id = ?
    `, [req.params.id]);

    if (brokers.length === 0) {
      return res.status(404).json({ message: 'Broker not found' });
    }

    res.json(brokers[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update broker (user and profile information)
router.put('/update/:id', async (req, res) => {
  try {
    const { name, email, phone, account_status, license_number } = req.body;
    const brokerId = req.params.id;

    // Update user table fields
    const userUpdates = [];
    const userParams = [];

    if (name !== undefined) { userUpdates.push('name = ?'); userParams.push(name); }
    if (email !== undefined) { userUpdates.push('email = ?'); userParams.push(email); }
    if (phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(phone); }
    if (account_status !== undefined) { userUpdates.push('status = ?'); userParams.push(account_status); }

    if (userUpdates.length > 0) {
      userParams.push(brokerId);
      const userSql = `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ? AND role = 'broker'`;
      console.log(`[BROKER-API] Updating user ${brokerId}:`, { userSql, userParams });
      await db.query(userSql, userParams);
    }

    // Update broker profile fields
    if (license_number !== undefined) {
      const profileUpdates = [];
      const profileParams = [];

      profileUpdates.push('license_number = ?');
      profileParams.push(license_number);

      profileParams.push(brokerId);
      const profileSql = `UPDATE broker_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`;
      console.log(`[BROKER-API] Updating broker profile ${brokerId}:`, { profileSql, profileParams });
      await db.query(profileSql, profileParams);
    }

    res.json({ message: 'Broker updated successfully' });
  } catch (error) {
    console.error('[BROKER-API] Update failed:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new broker (creates user with role='broker' and broker_profile)
router.post('/', async (req, res) => {
  try {
    const { user_id, full_name, phone, address, license_number } = req.body;

    // Check if broker profile already exists
    const [existing] = await db.query('SELECT * FROM broker_profiles WHERE user_id = ?', [user_id]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Broker profile already exists' });
    }

    // Create broker profile
    const [result] = await db.query(`
      INSERT INTO broker_profiles (user_id, full_name, phone_number, address, license_number, profile_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [user_id, full_name, phone || null, address || null, license_number]);

    res.json({
      id: result.insertId,
      message: 'Broker profile created successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update broker account status
router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;

    // Check if user exists and is a broker
    const [user] = await db.query('SELECT id, role FROM users WHERE id = ? AND role = ?', [req.params.id, 'broker']);

    if (user.length === 0) {
      return res.status(404).json({ message: 'Broker not found' });
    }

    // Update user account
    await db.query(`
      UPDATE users 
      SET name = ?, email = ?, phone = ?, status = ?
      WHERE id = ?
    `, [name, email, phone, status || 'active', req.params.id]);

    res.json({ message: 'Broker account updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker by User ID (for backward compatibility)
router.get('/user/:userId', async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        u.status as account_status,
        u.profile_approved,
        u.profile_completed,
        bp.id as profile_id,
        bp.full_name,
        bp.license_number,
        bp.profile_status
      FROM users u
      LEFT JOIN broker_profiles bp ON u.id = bp.user_id
      WHERE u.id = ? AND u.role = 'broker'
    `, [req.params.userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'Broker not found' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

