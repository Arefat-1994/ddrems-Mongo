const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Users, CustomerProfiles, OwnerProfiles, BrokerProfiles, PasswordResetRequests, LoginAttempts, Notifications, FraudAlerts } = require('../models');
const { sendEmail, templates } = require('../services/emailService');

// Helper: notify all system admins via in-app notification + email
const notifySystemAdmins = async (title, message, type, userName, userEmail, attemptCount, emailTemplate) => {
  try {
    const admins = await Users.find({ role: 'system_admin' }).select('_id name email').lean();
    for (const admin of admins) {
      // In-app notification
      await Notifications.create({
        user_id: admin._id,
        title,
        message,
        type: type,
        notification_type: 'security',
        is_read: false,
        icon: type === 'banned' ? '🛑' : '🚨',
        created_at: new Date(),
      });
      // Email notification
      try {
        if (emailTemplate === 'suspicious') {
          const emailData = templates.adminSuspiciousAlert(admin.name, userName, userEmail, attemptCount);
          sendEmail(admin.email, emailData.subject, emailData.html);
        } else if (emailTemplate === 'banned') {
          const emailData = templates.adminBannedAlert(admin.name, userName, userEmail, attemptCount);
          sendEmail(admin.email, emailData.subject, emailData.html);
        }
      } catch (e) { console.error('Admin email error:', e.message); }
    }
  } catch (e) { console.error('Error notifying admins:', e.message); }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['user', 'owner', 'broker'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only Customer, Owner, and Broker can register.' });
    }

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await Users.create({
      name,
      email,
      phone: phone || null,
      password: hashedPassword,
      role,
      profile_approved: false,
      profile_completed: false,
      status: 'inactive'
    });

    const emailData = templates.accountCreated(name);
    sendEmail(email, emailData.subject, emailData.html);

    res.status(201).json({
      message: 'Registration successful! Your account is pending approval. You will be notified via email once approved.',
      userId: newUser._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login (with security: lockout → suspicious → ban)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    // ── 1. Check login attempts record ──
    let attempt = await LoginAttempts.findOne({ email });

    // If banned, reject immediately
    if (attempt && attempt.phase === 'banned') {
      return res.status(403).json({
        message: 'Your account has been permanently banned due to repeated failed login attempts. Please contact the system administrator.',
        banned: true,
      });
    }

    // If locked, check if lockout has expired
    if (attempt && attempt.phase === 'locked' && attempt.lockout_until) {
      const now = new Date();
      if (now < new Date(attempt.lockout_until)) {
        const remainingMs = new Date(attempt.lockout_until) - now;
        const remainingSec = Math.ceil(remainingMs / 1000);
        return res.status(429).json({
          message: `Account temporarily locked. Please try again in ${remainingSec} seconds.`,
          locked: true,
          lockout_until: attempt.lockout_until,
          remaining_seconds: remainingSec,
        });
      }
      // Lockout expired — allow attempt, move to "suspicious watch" phase
    }

    // ── 2. Find user ──
    const user = await Users.findOne({ email }).lean();

    if (!user) {
      console.log(`[LOGIN] No user found with email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log(`[LOGIN] User found: id=${user._id}, name=${user.name}, role=${user.role}, status=${user.status}`);

    // Check if user status is banned in the Users collection
    if (user.status === 'banned') {
      return res.status(403).json({
        message: 'Your account has been banned. Please contact the system administrator.',
        banned: true,
      });
    }

    if (user.status !== 'active' && !['admin', 'system_admin', 'property_admin'].includes(user.role)) {
      console.log(`[LOGIN] Account not active for user ${user._id}, status=${user.status}`);
      return res.status(403).json({ 
        message: 'Your account is pending activation. You will receive an email once an administrator activates your account.',
        pendingApproval: true 
      });
    }

    // ── 3. Verify password ──
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`[LOGIN] Password match result for user ${user._id}: ${isMatch}`);

    if (!isMatch) {
      // ── FAILED LOGIN ──
      if (!attempt) {
        attempt = await LoginAttempts.create({
          email,
          user_id: user._id,
          failed_count: 1,
          phase: 'normal',
          last_ip: clientIp,
          last_failed_at: new Date(),
        });
      } else {
        attempt.failed_count += 1;
        attempt.last_ip = clientIp;
        attempt.last_failed_at = new Date();
        attempt.updated_at = new Date();
      }

      const count = attempt.failed_count;

      // ── Phase 1: After 3 fails → Lock for 1 minute ──
      if (count === 3 && attempt.phase === 'normal') {
        attempt.phase = 'locked';
        attempt.lockout_until = new Date(Date.now() + 60 * 1000); // 1 minute
        await attempt.save();

        // Email user about lockout
        try {
          const emailData = templates.accountLockout(user.name, 1);
          sendEmail(user.email, emailData.subject, emailData.html);
        } catch (e) { console.error('Lockout email error:', e.message); }

        return res.status(429).json({
          message: 'Too many failed attempts. Your account has been locked for 1 minute. Please try again later.',
          locked: true,
          lockout_until: attempt.lockout_until,
          remaining_seconds: 60,
          attempts: count,
        });
      }

      // ── Phase 2: After 6 fails (3 more after lockout) → Suspicious ──
      if (count === 6 && (attempt.phase === 'locked' || attempt.phase === 'normal')) {
        attempt.phase = 'suspicious';
        attempt.flagged_suspicious_at = new Date();
        await attempt.save();

        // Create fraud alert
        await FraudAlerts.create({
          alert_type: 'suspicious_login',
          severity: 'high',
          description: `Account ${user.email} flagged suspicious after ${count} failed login attempts from IP ${clientIp}`,
          related_entity_type: 'user',
          related_entity_id: user._id,
          status: 'active',
          created_at: new Date(),
        });

        // Update user status
        await Users.findByIdAndUpdate(user._id, { status: 'suspicious' });

        // Email user
        try {
          const emailData = templates.accountSuspicious(user.name);
          sendEmail(user.email, emailData.subject, emailData.html);
        } catch (e) { console.error('Suspicious email error:', e.message); }

        // Notify system admins
        await notifySystemAdmins(
          '🚨 Suspicious Account Detected',
          `User "${user.name}" (${user.email}) has been flagged suspicious after ${count} failed login attempts.`,
          'suspicious', user.name, user.email, count, 'suspicious'
        );

        return res.status(403).json({
          message: 'Your account has been flagged as suspicious due to multiple failed login attempts. The system administrator has been notified. Please contact support.',
          suspicious: true,
          attempts: count,
        });
      }

      // ── Phase 3: After 9 fails (3 more after suspicious) → Ban ──
      if (count >= 9 && attempt.phase === 'suspicious') {
        attempt.phase = 'banned';
        attempt.banned_at = new Date();
        await attempt.save();

        // Ban the user
        await Users.findByIdAndUpdate(user._id, { status: 'banned' });

        // Create fraud alert
        await FraudAlerts.create({
          alert_type: 'account_banned',
          severity: 'critical',
          description: `Account ${user.email} auto-banned after ${count} failed login attempts from IP ${clientIp}`,
          related_entity_type: 'user',
          related_entity_id: user._id,
          status: 'active',
          created_at: new Date(),
        });

        // Email user about ban
        try {
          const emailData = templates.accountBanned(user.name);
          sendEmail(user.email, emailData.subject, emailData.html);
        } catch (e) { console.error('Ban email error:', e.message); }

        // Notify system admins
        await notifySystemAdmins(
          '🛑 Account Auto-Banned',
          `User "${user.name}" (${user.email}) has been automatically banned after ${count} failed login attempts.`,
          'banned', user.name, user.email, count, 'banned'
        );

        return res.status(403).json({
          message: 'Your account has been permanently banned due to repeated failed login attempts. Please contact the system administrator.',
          banned: true,
          attempts: count,
        });
      }

      // Save attempt and return generic fail
      await attempt.save();

      // Determine remaining attempts before next phase
      let warningMsg = '';
      if (count < 3) {
        warningMsg = ` You have ${3 - count} attempt(s) remaining before your account is temporarily locked.`;
      } else if (count < 6) {
        warningMsg = ` You have ${6 - count} attempt(s) remaining before your account is flagged as suspicious.`;
      } else if (count < 9) {
        warningMsg = ` You have ${9 - count} attempt(s) remaining before your account is permanently banned.`;
      }

      return res.status(401).json({
        message: `Invalid email or password.${warningMsg}`,
        attempts: count,
        remaining_before_lock: count < 3 ? 3 - count : 0,
      });
    }

    // ── SUCCESSFUL LOGIN ──
    // Reset all login attempt tracking
    if (attempt) {
      attempt.failed_count = 0;
      attempt.phase = 'normal';
      attempt.lockout_until = null;
      attempt.updated_at = new Date();
      await attempt.save();
    }

    let profileImage = user.profile_image;

    if (user.role === 'user') {
      const profile = await CustomerProfiles.findOne({ user_id: user._id, profile_status: 'approved' }).lean();
      if (profile && profile.profile_photo) profileImage = profile.profile_photo;
    } else if (user.role === 'owner') {
      const profile = await OwnerProfiles.findOne({ user_id: user._id, profile_status: 'approved' }).lean();
      if (profile && profile.profile_photo) profileImage = profile.profile_photo;
    } else if (user.role === 'broker') {
      const profile = await BrokerProfiles.findOne({ user_id: user._id, profile_status: 'approved' }).lean();
      if (profile && profile.profile_photo) profileImage = profile.profile_photo;
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_in_production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
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

// Get login attempts for admin dashboard
router.get('/login-attempts', async (req, res) => {
  try {
    const attempts = await LoginAttempts.find({ phase: { $in: ['suspicious', 'banned', 'locked'] } })
      .sort({ updated_at: -1 }).lean();

    // Enrich with user names
    const enriched = await Promise.all(attempts.map(async (a) => {
      const user = await Users.findById(a.user_id).select('name role status').lean();
      return { ...a, user_name: user?.name || 'Unknown', user_role: user?.role || 'unknown', user_status: user?.status || 'unknown' };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unban a user (admin action)
router.post('/unban/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { adminId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user ID' });

    const admin = await Users.findById(adminId).select('role');
    if (!admin || !['admin', 'system_admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Reset login attempts
    await LoginAttempts.findOneAndUpdate(
      { user_id: userId },
      { phase: 'normal', failed_count: 0, lockout_until: null, unbanned_by: adminId, unbanned_at: new Date() }
    );

    // Reactivate user
    await Users.findByIdAndUpdate(userId, { status: 'active' });

    // Resolve fraud alerts
    await FraudAlerts.updateMany(
      { related_entity_id: userId, status: 'active' },
      { status: 'resolved', resolved_at: new Date() }
    );

    const user = await Users.findById(userId).select('name email');
    if (user) {
      try {
        const emailData = templates.securityAlert(user.name, 'Your account has been reviewed and reactivated by the system administrator. You can now log in again. Please change your password for security.');
        sendEmail(user.email, emailData.subject, emailData.html);
      } catch (e) {}
    }

    res.json({ message: 'User unbanned successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forgot Password (Generate OTP)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Users.findOne({ email }).select('name _id');
    
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await PasswordResetRequests.create({
      user_id: user._id,
      email,
      otp_code: otpCode,
      status: 'pending',
      requested_at: new Date()
    });

    const emailData = {
      subject: 'Password Reset Request - DDREMS',
      html: `<h2>Password Reset OTP</h2>
             <p>Hello ${user.name},</p>
             <p>Your OTP for password reset is: <strong>${otpCode}</strong></p>
             <p>If you did not request this, please ignore this email.</p>`
    };
    
    sendEmail(email, emailData.subject, emailData.html);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const request = await PasswordResetRequests.findOne({ 
      email, 
      otp_code: otp, 
      status: 'pending' 
    }).sort({ requested_at: -1 });

    if (!request) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    request.status = 'verified';
    await request.save();

    res.json({ message: 'OTP verified successfully. Request forwarded to System Admin.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin Reset Password (Auto Generate)
router.post('/admin/reset-password', async (req, res) => {
  try {
    const { requestId, adminId } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(adminId)) return res.status(403).json({ message: 'Unauthorized' });

    const admin = await Users.findById(adminId).select('role');
    if (!admin || !['admin', 'system_admin'].includes(admin.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) return res.status(404).json({ message: 'Valid request not found' });

    const request = await PasswordResetRequests.findOne({ _id: requestId, status: 'verified' });
    if (!request) {
      return res.status(404).json({ message: 'Valid request not found' });
    }

    const newPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Users.findByIdAndUpdate(request.user_id, { password: hashedPassword });
    
    request.status = 'completed';
    request.reset_at = new Date();
    await request.save();

    const emailData = {
      subject: 'Your Password has been Reset - DDREMS',
      html: `<h2>Password Reset Successful</h2>
             <p>Your password has been reset by the System Administrator.</p>
             <p>Your new password is: <strong>${newPassword}</strong></p>
             <p>Please log in and change this password immediately from your account settings.</p>`
    };
    sendEmail(request.email, emailData.subject, emailData.html);

    res.json({ message: 'Password reset and emailed to user' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all pending reset requests
router.get('/password-requests', async (req, res) => {
  try {
    const requests = await PasswordResetRequests.aggregate([
      { $match: { status: { $in: ['verified', 'pending'] } } },
      { $sort: { requested_at: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          id: '$_id',
          user_id: 1,
          email: 1,
          otp_code: 1,
          status: 1,
          requested_at: 1,
          reset_at: 1,
          name: '$user.name'
        }
      }
    ]);

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change Password (User facing)
router.post('/change-password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(404).json({ message: 'User not found' });

    const user = await Users.findById(userId).select('password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
