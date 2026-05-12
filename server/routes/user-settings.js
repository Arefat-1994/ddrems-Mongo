const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { 
  UserPreferences, 
  UserTwoFactorSettings, 
  AuditLog, 
  UserSessions,
  Users
} = require('../models');
const { sendEmail, templates } = require('../services/emailService');

// Get user settings
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    let settings = await UserPreferences.findOne({ user_id: userId }).lean();
    
    if (!settings) {
      const defaultSettings = {
        userId,
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        textColor: '#333333',
        sidebarColor: '#f8f9fa',
        sidebarTextColor: '#333333',
        notificationsEnabled: true,
        soundEnabled: true,
        emailNotifications: true,
        twoFactorAuth: false,
        alertsEnabled: true,
        securityAlerts: true,
        loginAlerts: true,
        wrongPasswordAlerts: true,
        unauthorizedAccessAlerts: true,
        suspiciousActivityAlerts: true,
        soundNotifications: true,
        pendingRequestNotifications: true,
        language: 'en',
        timezone: 'UTC',
        idleTimeout: 5
      };
      return res.json(defaultSettings);
    }
    
    res.json({ ...settings, id: settings._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save user settings
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    let existing = await UserPreferences.findOne({ user_id: userId });
    
    if (!existing) {
      await UserPreferences.create({
        user_id: userId,
        theme: settings.theme || 'light',
        primaryColor: settings.primaryColor || '#667eea',
        accentColor: settings.accentColor || '#764ba2',
        backgroundColor: settings.backgroundColor || '#ffffff',
        foregroundColor: settings.foregroundColor || '#000000',
        textColor: settings.textColor || '#333333',
        sidebarColor: settings.sidebarColor || '#f8f9fa',
        sidebarTextColor: settings.sidebarTextColor || '#333333',
        notificationsEnabled: settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true,
        soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : true,
        emailNotifications: settings.emailNotifications !== undefined ? settings.emailNotifications : true,
        twoFactorAuth: settings.twoFactorAuth !== undefined ? settings.twoFactorAuth : false,
        alertsEnabled: settings.alertsEnabled !== undefined ? settings.alertsEnabled : true,
        securityAlerts: settings.securityAlerts !== undefined ? settings.securityAlerts : true,
        loginAlerts: settings.loginAlerts !== undefined ? settings.loginAlerts : true,
        wrong_password_alerts: settings.wrongPasswordAlerts !== undefined ? settings.wrongPasswordAlerts : true,
        unauthorized_access_alerts: settings.unauthorizedAccessAlerts !== undefined ? settings.unauthorizedAccessAlerts : true,
        suspicious_activity_alerts: settings.suspiciousActivityAlerts !== undefined ? settings.suspiciousActivityAlerts : true,
        sound_notifications: settings.soundNotifications !== undefined ? settings.soundNotifications : true,
        pending_request_notifications: settings.pendingRequestNotifications !== undefined ? settings.pendingRequestNotifications : true,
        language: settings.language || 'en',
        timezone: settings.timezone || 'UTC',
        idle_timeout: settings.idleTimeout !== undefined ? settings.idleTimeout : 5
      });
    } else {
      await UserPreferences.updateOne({ user_id: userId }, {
        $set: {
          theme: settings.theme || 'light',
          primaryColor: settings.primaryColor || '#667eea',
          accentColor: settings.accentColor || '#764ba2',
          backgroundColor: settings.backgroundColor || '#ffffff',
          foregroundColor: settings.foregroundColor || '#000000',
          textColor: settings.textColor || '#333333',
          sidebarColor: settings.sidebarColor || '#f8f9fa',
          sidebarTextColor: settings.sidebarTextColor || '#333333',
          notificationsEnabled: settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true,
          soundEnabled: settings.soundEnabled !== undefined ? settings.soundEnabled : true,
          emailNotifications: settings.emailNotifications !== undefined ? settings.emailNotifications : true,
          twoFactorAuth: settings.twoFactorAuth !== undefined ? settings.twoFactorAuth : false,
          alertsEnabled: settings.alertsEnabled !== undefined ? settings.alertsEnabled : true,
          securityAlerts: settings.securityAlerts !== undefined ? settings.securityAlerts : true,
          loginAlerts: settings.loginAlerts !== undefined ? settings.loginAlerts : true,
          wrong_password_alerts: settings.wrongPasswordAlerts !== undefined ? settings.wrongPasswordAlerts : true,
          unauthorized_access_alerts: settings.unauthorizedAccessAlerts !== undefined ? settings.unauthorizedAccessAlerts : true,
          suspicious_activity_alerts: settings.suspiciousActivityAlerts !== undefined ? settings.suspiciousActivityAlerts : true,
          sound_notifications: settings.soundNotifications !== undefined ? settings.soundNotifications : true,
          pending_request_notifications: settings.pendingRequestNotifications !== undefined ? settings.pendingRequestNotifications : true,
          language: settings.language || 'en',
          timezone: settings.timezone || 'UTC',
          idle_timeout: settings.idleTimeout !== undefined ? settings.idleTimeout : 5
        }
      });
    }
    
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get theme for user
router.get('/:userId/theme', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    const settings = await UserPreferences.findOne({ user_id: userId }).select('theme primaryColor accentColor backgroundColor foregroundColor textColor sidebarColor sidebarTextColor').lean();
    
    if (!settings) {
      return res.json({
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        textColor: '#333333',
        sidebarColor: '#f8f9fa',
        sidebarTextColor: '#333333'
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get 2FA settings for user
router.get('/:userId/two-factor', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    const settings = await UserTwoFactorSettings.findOne({ user_id: userId }).lean();
    
    if (!settings) {
      return res.json({
        userId,
        twoFactorEnabled: false,
        twoFactorMethod: 'otp',
        otpVerified: false,
        captchaEnabled: true,
        captchaDifficulty: 'medium',
        failedAttempts: 0
      });
    }
    
    res.json({ ...settings, id: settings._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save 2FA settings
router.post('/:userId/two-factor', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    let existing = await UserTwoFactorSettings.findOne({ user_id: userId });
    
    if (!existing) {
      await UserTwoFactorSettings.create({
        user_id: userId,
        two_factor_enabled: settings.twoFactorEnabled || false,
        two_factor_method: settings.twoFactorMethod || 'otp',
        captcha_enabled: settings.captchaEnabled !== undefined ? settings.captchaEnabled : true,
        captcha_difficulty: settings.captchaDifficulty || 'medium'
      });
    } else {
      await UserTwoFactorSettings.updateOne({ user_id: userId }, {
        $set: {
          two_factor_enabled: settings.twoFactorEnabled || false,
          two_factor_method: settings.twoFactorMethod || 'otp',
          captcha_enabled: settings.captchaEnabled !== undefined ? settings.captchaEnabled : true,
          captcha_difficulty: settings.captchaDifficulty || 'medium'
        }
      });
    }
    
    try {
      const user = await Users.findById(userId);
      if (user) {
        const emailData = templates.securityAlert(user.name, 'Your Two-Factor Authentication settings have been updated.');
        await sendEmail(user.email, emailData.subject, emailData.html);
      }
    } catch (e) {}

    res.json({ message: '2FA settings saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/:userId/verify-otp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { otpCode, generatedOTP } = req.body;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    if (otpCode === generatedOTP) {
      await UserTwoFactorSettings.findOneAndUpdate(
        { user_id: userId },
        { two_factor_enabled: true, otp_verified: true },
        { upsert: true }
      );
      res.json({ valid: true, message: 'OTP verified successfully' });
    } else {
      res.status(400).json({ valid: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Setup password-based 2FA
router.post('/:userId/setup-password-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    const { securityPassword } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    if (!securityPassword || securityPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(securityPassword).digest('hex');
    
    await UserTwoFactorSettings.findOneAndUpdate(
      { user_id: userId },
      { two_factor_enabled: true, two_factor_method: 'password', security_password: hashedPassword, security_password_verified: true },
      { upsert: true }
    );
    
    res.json({ message: 'Password 2FA setup completed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Disable 2FA
router.post('/:userId/disable-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    await UserTwoFactorSettings.findOneAndUpdate(
      { user_id: userId },
      { two_factor_enabled: false, otp_verified: false, security_password_verified: false, failed_attempts: 0 }
    );
    
    try {
      const user = await Users.findById(userId);
      if (user) {
        const emailData = templates.securityAlert(user.name, 'Two-Factor Authentication has been disabled on your account.');
        await sendEmail(user.email, emailData.subject, emailData.html);
      }
    } catch (e) {}

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get activity logs for user
router.get('/:userId/activity-logs', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    const logs = await AuditLog.find({ user_id: userId }).sort({ created_at: -1 }).limit(50).lean();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active sessions for user
router.get('/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid User ID' });
    
    const sessions = await UserSessions.find({ user_id: userId, is_active: true }).sort({ last_active: -1 }).lean();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Terminate a specific session
router.delete('/:userId/sessions/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    await UserSessions.updateOne({ user_id: userId, _id: sessionId }, { is_active: false });
    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Terminate all other sessions
router.delete('/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    await UserSessions.updateMany({ user_id: userId }, { is_active: false });
    res.json({ message: 'All other sessions terminated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
