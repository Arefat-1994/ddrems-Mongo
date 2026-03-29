const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate role (only user, owner, broker can register)
    if (!['user', 'owner', 'broker'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only Customer, Owner, and Broker can register.' });
    }

    // Check if user already exists
    const [existingUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password, role, profile_approved, profile_completed) VALUES (?, ?, ?, ?, ?, FALSE, FALSE)',
      [name, email, phone || null, hashedPassword, role]
    );

    res.status(201).json({
      message: 'Registration successful! Please login and complete your profile.',
      userId: result.insertId
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check users table (includes brokers with role='broker')
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Get profile image based on role
    let profileImage = user.profile_image; // Default from users table

    if (user.role === 'user') {
      // Get from customer_profiles
      const [customerProfiles] = await db.query('SELECT profile_photo FROM customer_profiles WHERE user_id = ? AND profile_status = "approved"', [user.id]);
      if (customerProfiles.length > 0 && customerProfiles[0].profile_photo) {
        profileImage = customerProfiles[0].profile_photo;
      }
    } else if (user.role === 'owner') {
      // Get from owner_profiles
      const [ownerProfiles] = await db.query('SELECT profile_photo FROM owner_profiles WHERE user_id = ? AND profile_status = "approved"', [user.id]);
      if (ownerProfiles.length > 0 && ownerProfiles[0].profile_photo) {
        profileImage = ownerProfiles[0].profile_photo;
      }
    } else if (user.role === 'broker') {
      // Get from broker_profiles
      const [brokerProfiles] = await db.query('SELECT profile_photo FROM broker_profiles WHERE user_id = ? AND profile_status = "approved"', [user.id]);
      if (brokerProfiles.length > 0 && brokerProfiles[0].profile_photo) {
        profileImage = brokerProfiles[0].profile_photo;
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_approved: user.profile_approved,
        profile_completed: user.profile_completed,
        profile_image: profileImage
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
