const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendEmail, templates } = require('../services/emailService');

// Get user settings
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[USER-SETTINGS] GET /:userId - userId: ${userId}`);
    
    const [settings] = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    
    if (settings.length === 0) {
      // Return default settings for this user
      const defaultSettings = {
        userId: parseInt(userId),
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
        timezone: 'UTC'
      };
      console.log(`[USER-SETTINGS] No settings found for user ${userId}, returning defaults`);
      return res.json(defaultSettings);
    }
    
    console.log(`[USER-SETTINGS] Settings found for user ${userId}`);
    res.json(settings[0]);
  } catch (error) {
    console.error(`[USER-SETTINGS] Error fetching settings for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save user settings
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[USER-SETTINGS] POST /:userId - userId: ${userId}`);
    console.log(`[USER-SETTINGS] Settings to save:`, settings);
    
    // Check if settings exist for this user
    const [existing] = await db.query(
      'SELECT id FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      // Insert new settings for this user
      console.log(`[USER-SETTINGS] Creating new settings for user ${userId}`);
      
      await db.query(
        `INSERT INTO user_preferences (
          user_id, theme, primaryColor, accentColor, backgroundColor,
          foregroundColor, textColor, sidebarColor, sidebarTextColor,
          notificationsEnabled, soundEnabled, emailNotifications,
          twoFactorAuth, alertsEnabled, securityAlerts, loginAlerts,
          wrong_password_alerts, unauthorized_access_alerts,
          suspicious_activity_alerts, sound_notifications,
          pending_request_notifications,
          language, timezone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          settings.theme || 'light',
          settings.primaryColor || '#667eea',
          settings.accentColor || '#764ba2',
          settings.backgroundColor || '#ffffff',
          settings.foregroundColor || '#000000',
          settings.textColor || '#333333',
          settings.sidebarColor || '#f8f9fa',
          settings.sidebarTextColor || '#333333',
          settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true,
          settings.soundEnabled !== undefined ? settings.soundEnabled : true,
          settings.emailNotifications !== undefined ? settings.emailNotifications : true,
          settings.twoFactorAuth !== undefined ? settings.twoFactorAuth : false,
          settings.alertsEnabled !== undefined ? settings.alertsEnabled : true,
          settings.securityAlerts !== undefined ? settings.securityAlerts : true,
          settings.loginAlerts !== undefined ? settings.loginAlerts : true,
          settings.wrongPasswordAlerts !== undefined ? settings.wrongPasswordAlerts : true,
          settings.unauthorizedAccessAlerts !== undefined ? settings.unauthorizedAccessAlerts : true,
          settings.suspiciousActivityAlerts !== undefined ? settings.suspiciousActivityAlerts : true,
          settings.soundNotifications !== undefined ? settings.soundNotifications : true,
          settings.pendingRequestNotifications !== undefined ? settings.pendingRequestNotifications : true,
          settings.language || 'en',
          settings.timezone || 'UTC'
        ]
      );
    } else {
      // Update existing settings for this user
      console.log(`[USER-SETTINGS] Updating settings for user ${userId}`);
      
      await db.query(
        `UPDATE user_preferences SET
          theme = ?, primaryColor = ?, accentColor = ?, backgroundColor = ?,
          foregroundColor = ?, textColor = ?, sidebarColor = ?,
          sidebarTextColor = ?, notificationsEnabled = ?, soundEnabled = ?,
          emailNotifications = ?, twoFactorAuth = ?, alertsEnabled = ?,
          securityAlerts = ?, loginAlerts = ?, 
          wrong_password_alerts = ?, unauthorized_access_alerts = ?,
          suspicious_activity_alerts = ?, sound_notifications = ?,
          pending_request_notifications = ?,
          language = ?, timezone = ?,
          updated_at = NOW()
          WHERE user_id = ?`,
        [
          settings.theme || 'light',
          settings.primaryColor || '#667eea',
          settings.accentColor || '#764ba2',
          settings.backgroundColor || '#ffffff',
          settings.foregroundColor || '#000000',
          settings.textColor || '#333333',
          settings.sidebarColor || '#f8f9fa',
          settings.sidebarTextColor || '#333333',
          settings.notificationsEnabled !== undefined ? settings.notificationsEnabled : true,
          settings.soundEnabled !== undefined ? settings.soundEnabled : true,
          settings.emailNotifications !== undefined ? settings.emailNotifications : true,
          settings.twoFactorAuth !== undefined ? settings.twoFactorAuth : false,
          settings.alertsEnabled !== undefined ? settings.alertsEnabled : true,
          settings.securityAlerts !== undefined ? settings.securityAlerts : true,
          settings.loginAlerts !== undefined ? settings.loginAlerts : true,
          settings.wrongPasswordAlerts !== undefined ? settings.wrongPasswordAlerts : true,
          settings.unauthorizedAccessAlerts !== undefined ? settings.unauthorizedAccessAlerts : true,
          settings.suspiciousActivityAlerts !== undefined ? settings.suspiciousActivityAlerts : true,
          settings.soundNotifications !== undefined ? settings.soundNotifications : true,
          settings.pendingRequestNotifications !== undefined ? settings.pendingRequestNotifications : true,
          settings.language || 'en',
          settings.timezone || 'UTC',
          userId
        ]
      );
    }
    
    console.log(`[USER-SETTINGS] Settings saved successfully for user ${userId}`);
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error(`[USER-SETTINGS] Error saving settings for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get theme for user
router.get('/:userId/theme', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[USER-SETTINGS] GET /:userId/theme - userId: ${userId}`);
    
    const [settings] = await db.query(
      `SELECT theme, primaryColor, accentColor, backgroundColor,
              foregroundColor, textColor, sidebarColor, sidebarTextColor
       FROM user_preferences WHERE user_id = ?`,
      [userId]
    );
    
    if (settings.length === 0) {
      const defaultTheme = {
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        textColor: '#333333',
        sidebarColor: '#f8f9fa',
        sidebarTextColor: '#333333'
      };
      console.log(`[USER-SETTINGS] No theme found for user ${userId}, returning defaults`);
      return res.json(defaultTheme);
    }
    
    console.log(`[USER-SETTINGS] Theme found for user ${userId}`);
    res.json(settings[0]);
  } catch (error) {
    console.error(`[USER-SETTINGS] Error fetching theme for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get 2FA settings for user
router.get('/:userId/two-factor', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[USER-SETTINGS] GET /:userId/two-factor - userId: ${userId}`);
    
    const [settings] = await db.query(
      'SELECT * FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (settings.length === 0) {
      const defaultSettings = {
        userId: parseInt(userId),
        twoFactorEnabled: false,
        twoFactorMethod: 'otp',
        otpVerified: false,
        captchaEnabled: true,
        captchaDifficulty: 'medium',
        failedAttempts: 0
      };
      console.log(`[USER-SETTINGS] No 2FA settings found for user ${userId}, returning defaults`);
      return res.json(defaultSettings);
    }
    
    console.log(`[USER-SETTINGS] 2FA settings found for user ${userId}`);
    res.json(settings[0]);
  } catch (error) {
    console.error(`[USER-SETTINGS] Error fetching 2FA settings for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save 2FA settings
router.post('/:userId/two-factor', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[USER-SETTINGS] POST /:userId/two-factor - userId: ${userId}`);
    
    // Check if settings exist
    const [existing] = await db.query(
      'SELECT id FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      // Insert new settings
      await db.query(
        `INSERT INTO user_two_factor_settings (
          user_id, two_factor_enabled, two_factor_method, captcha_enabled, 
          captcha_difficulty, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          settings.twoFactorEnabled || false,
          settings.twoFactorMethod || 'otp',
          settings.captchaEnabled !== undefined ? settings.captchaEnabled : true,
          settings.captchaDifficulty || 'medium'
        ]
      );
    } else {
      // Update existing settings
      await db.query(
        `UPDATE user_two_factor_settings SET
          two_factor_enabled = ?, two_factor_method = ?, 
          captcha_enabled = ?, captcha_difficulty = ?, updated_at = NOW()
          WHERE user_id = ?`,
        [
          settings.twoFactorEnabled || false,
          settings.twoFactorMethod || 'otp',
          settings.captchaEnabled !== undefined ? settings.captchaEnabled : true,
          settings.captchaDifficulty || 'medium',
          userId
        ]
      );
    }
    
    console.log(`[USER-SETTINGS] 2FA settings saved for user ${userId}`);
    
    // Notify user of security change
    try {
      const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [userId]);
      if (user.length > 0) {
        const emailData = templates.securityAlert(user[0].name, 'Your Two-Factor Authentication settings have been updated.');
        await sendEmail(user[0].email, emailData.subject, emailData.html);
      }
    } catch (e) { console.warn('[Security] Alert email failed:', e.message); }

    res.json({ message: '2FA settings saved successfully' });
  } catch (error) {
    console.error(`[USER-SETTINGS] Error saving 2FA settings for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify OTP
router.post('/:userId/verify-otp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { otpCode, generatedOTP } = req.body;
    
    if (!userId || !otpCode) {
      return res.status(400).json({ message: 'User ID and OTP code are required' });
    }
    
    console.log(`[USER-SETTINGS] POST /:userId/verify-otp - userId: ${userId}`);
    
    // Simple OTP verification
    const isValid = otpCode === generatedOTP;
    
    if (isValid) {
      // Update 2FA settings to enabled
      await db.query(
        `UPDATE user_two_factor_settings SET 
          two_factor_enabled = true, otp_verified = true, updated_at = NOW()
          WHERE user_id = ?`,
        [userId]
      );
      
      console.log(`[USER-SETTINGS] OTP verified for user ${userId}`);
      res.json({ valid: true, message: 'OTP verified successfully' });
    } else {
      console.log(`[USER-SETTINGS] OTP verification failed for user ${userId}`);
      res.status(400).json({ valid: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error(`[USER-SETTINGS] Error verifying OTP for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Setup password-based 2FA
router.post('/:userId/setup-password-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    const { securityPassword } = req.body;
    
    if (!userId || !securityPassword) {
      return res.status(400).json({ message: 'User ID and security password are required' });
    }
    
    if (securityPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    console.log(`[USER-SETTINGS] POST /:userId/setup-password-2fa - userId: ${userId}`);
    
    const crypto = require('crypto');
    const hashedPassword = crypto
      .createHash('sha256')
      .update(securityPassword)
      .digest('hex');
    
    // Check if settings exist
    const [existing] = await db.query(
      'SELECT id FROM user_two_factor_settings WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      await db.query(
        `INSERT INTO user_two_factor_settings (
          user_id, two_factor_enabled, two_factor_method, security_password, 
          security_password_verified, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [userId, true, 'password', hashedPassword, true]
      );
    } else {
      await db.query(
        `UPDATE user_two_factor_settings SET 
          two_factor_enabled = true, two_factor_method = 'password', 
          security_password = ?, security_password_verified = true, updated_at = NOW()
          WHERE user_id = ?`,
        [hashedPassword, userId]
      );
    }
    
    console.log(`[USER-SETTINGS] Password 2FA setup for user ${userId}`);
    res.json({ message: 'Password 2FA setup completed' });
  } catch (error) {
    console.error(`[USER-SETTINGS] Error setting up password 2FA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Disable 2FA
router.post('/:userId/disable-2fa', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    console.log(`[USER-SETTINGS] POST /:userId/disable-2fa - userId: ${userId}`);
    
    await db.query(
      `UPDATE user_two_factor_settings SET 
        two_factor_enabled = false, otp_verified = false, 
        security_password_verified = false, failed_attempts = 0, updated_at = NOW()
        WHERE user_id = ?`,
      [userId]
    );
    
    console.log(`[USER-SETTINGS] 2FA disabled for user ${userId}`);

    // Notify user of security change
    try {
      const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [userId]);
      if (user.length > 0) {
        const emailData = templates.securityAlert(user[0].name, 'Two-Factor Authentication has been disabled on your account.');
        await sendEmail(user[0].email, emailData.subject, emailData.html);
      }
    } catch (e) { console.warn('[Security] Disable 2FA alert failed:', e.message); }

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    console.error(`[USER-SETTINGS] Error disabling 2FA for user ${req.params.userId}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get activity logs for user
router.get('/:userId/activity-logs', async (req, res) => {
  try {
    const { userId } = req.params;
    const [logs] = await db.query(
      'SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get active sessions for user
router.get('/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    const [sessions] = await db.query(
      'SELECT id, session_id, ip_address, user_agent, device_type, location, last_active, is_active FROM user_sessions WHERE user_id = ? AND is_active = true ORDER BY last_active DESC',
      [userId]
    );
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Terminate a specific session
router.delete('/:userId/sessions/:sessionId', async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = ? AND id = ?',
      [userId, sessionId]
    );
    res.json({ message: 'Session terminated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Terminate all other sessions
router.delete('/:userId/sessions', async (req, res) => {
  try {
    const { userId } = req.params;
    // Note: In a real app we would exclude the CURRENT session ID
    // For now we simulate by marking all as inactive
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = ?',
      [userId]
    );
    res.json({ message: 'All other sessions terminated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
