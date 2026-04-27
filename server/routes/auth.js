const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendEmail, templates } = require('../services/emailService');

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

    // Insert new user with inactive status (Stage 1 pending)
    const [result] = await db.query(
      'INSERT INTO users (name, email, phone, password, role, profile_approved, profile_completed, status) VALUES (?, ?, ?, ?, ?, FALSE, FALSE, \'inactive\')',
      [name, email, phone || null, hashedPassword, role]
    );

    // Send welcome email
    const emailData = templates.accountCreated(name);
    await sendEmail(email, emailData.subject, emailData.html);

    res.status(201).json({
      message: 'Registration successful! Your account is pending approval. You will be notified via email once approved.',
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
      console.log(`[LOGIN] No user found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = users[0];
    console.log(`[LOGIN] User found: id=${user.id}, name=${user.name}, role=${user.role}, status=${user.status}`);

    // Check if account is active (Stage 1 Approval)
    // Admins and system_admins should always be able to login
    if (user.status !== 'active' && !['admin', 'system_admin', 'property_admin'].includes(user.role)) {
      console.log(`[LOGIN] Account not active for user ${user.id}, status=${user.status}`);
      return res.status(403).json({ 
        message: 'Your account is pending activation. You will receive an email once an administrator activates your account.',
        pendingApproval: true 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN] Password match result for user ${user.id}: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password. Please check your credentials and try again.' });
    }

    // Get profile image based on role
    let profileImage = user.profile_image; // Default from users table

    if (user.role === 'user') {
      // Get from customer_profiles
      const [customerProfiles] = await db.query('SELECT profile_photo FROM customer_profiles WHERE user_id = ? AND profile_status = \'approved\'', [user.id]);
      if (customerProfiles.length > 0 && customerProfiles[0].profile_photo) {
        profileImage = customerProfiles[0].profile_photo;
      }
    } else if (user.role === 'owner') {
      // Get from owner_profiles
      const [ownerProfiles] = await db.query('SELECT profile_photo FROM owner_profiles WHERE user_id = ? AND profile_status = \'approved\'', [user.id]);
      if (ownerProfiles.length > 0 && ownerProfiles[0].profile_photo) {
        profileImage = ownerProfiles[0].profile_photo;
      }
    } else if (user.role === 'broker') {
      // Get from broker_profiles
      const [brokerProfiles] = await db.query('SELECT profile_photo FROM broker_profiles WHERE user_id = ? AND profile_status = \'approved\'', [user.id]);
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
        phone: user.phone,
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

// Forgot Password (Generate OTP)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.query('SELECT id, name FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await db.query(
      'INSERT INTO password_reset_requests (user_id, email, otp_code) VALUES (?, ?, ?)',
      [users[0].id, email, otpCode]
    );

    const emailData = {
      subject: 'Password Reset Request - DDREMS',
      html: `<h2>Password Reset OTP</h2>
             <p>Hello ${users[0].name},</p>
             <p>Your OTP for password reset is: <strong>${otpCode}</strong></p>
             <p>If you did not request this, please ignore this email.</p>`
    };
    
    await sendEmail(email, emailData.subject, emailData.html);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const [requests] = await db.query(
      'SELECT id FROM password_reset_requests WHERE email = ? AND otp_code = ? AND status = \'pending\' ORDER BY requested_at DESC LIMIT 1',
      [email, otp]
    );

    if (requests.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await db.query(
      'UPDATE password_reset_requests SET status = \'verified\' WHERE id = ?',
      [requests[0].id]
    );

    res.json({ message: 'OTP verified successfully. Request forwarded to System Admin.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Reset Password (Auto Generate)
router.post('/admin/reset-password', async (req, res) => {
  try {
    const { requestId, adminId } = req.body;
    
    // Verify admin
    const [admins] = await db.query('SELECT role FROM users WHERE id = ?', [adminId]);
    if (!admins.length || !['admin', 'system_admin'].includes(admins[0].role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const [requests] = await db.query('SELECT user_id, email FROM password_reset_requests WHERE id = ? AND status = \'verified\'', [requestId]);
    if (requests.length === 0) {
      return res.status(404).json({ message: 'Valid request not found' });
    }

    const newPassword = Math.random().toString(36).slice(-8); // 8 char random pwd
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, requests[0].user_id]);
    
    // Update request
    await db.query('UPDATE password_reset_requests SET status = \'completed\', reset_at = CURRENT_TIMESTAMP WHERE id = ?', [requestId]);

    // Email user
    const emailData = {
      subject: 'Your Password has been Reset - DDREMS',
      html: `<h2>Password Reset Successful</h2>
             <p>Your password has been reset by the System Administrator.</p>
             <p>Your new password is: <strong>${newPassword}</strong></p>
             <p>Please log in and change this password immediately from your account settings.</p>`
    };
    await sendEmail(requests[0].email, emailData.subject, emailData.html);

    res.json({ message: 'Password reset and emailed to user' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all pending reset requests
router.get('/password-requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT p.*, u.name 
      FROM password_reset_requests p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.status = 'verified' OR p.status = 'pending'
      ORDER BY p.requested_at DESC
    `);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change Password (User facing)
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
