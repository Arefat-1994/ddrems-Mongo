const express = require('express');
const router = express.Router();
const db = require('../config/db');

console.log('[ROUTES] Loading user-preferences routes');

// Get user preferences
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[USER-PREFS] GET /:userId - userId:', userId);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const [preferences] = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    
    if (preferences.length === 0) {
      console.log('[USER-PREFS] No preferences found, returning defaults');
      // Return default preferences if none exist
      return res.json({
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
        language: 'en',
        timezone: 'UTC'
      });
    }
    
    console.log('[USER-PREFS] Preferences found, returning data');
    res.json(preferences[0]);
  } catch (error) {
    console.error('[USER-PREFS] Error fetching user preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save user preferences
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;
    
    console.log('[USER-PREFS] POST /:userId - userId:', userId);
    console.log('[USER-PREFS] Preferences:', preferences);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Check if preferences exist
    const [existing] = await db.query(
      'SELECT id FROM user_preferences WHERE user_id = ?',
      [userId]
    );
    
    if (existing.length === 0) {
      console.log('[USER-PREFS] Creating new preferences');
      // Insert new preferences
      await db.query(
        `INSERT INTO user_preferences (
          user_id, theme, primaryColor, accentColor, backgroundColor,
          foregroundColor, textColor, sidebarColor, sidebarTextColor,
          notificationsEnabled, soundEnabled, emailNotifications,
          twoFactorAuth, alertsEnabled, securityAlerts, loginAlerts,
          language, timezone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          preferences.theme || 'light',
          preferences.primaryColor || '#667eea',
          preferences.accentColor || '#764ba2',
          preferences.backgroundColor || '#ffffff',
          preferences.foregroundColor || '#000000',
          preferences.textColor || '#333333',
          preferences.sidebarColor || '#f8f9fa',
          preferences.sidebarTextColor || '#333333',
          preferences.notificationsEnabled !== undefined ? preferences.notificationsEnabled : true,
          preferences.soundEnabled !== undefined ? preferences.soundEnabled : true,
          preferences.emailNotifications !== undefined ? preferences.emailNotifications : true,
          preferences.twoFactorAuth !== undefined ? preferences.twoFactorAuth : false,
          preferences.alertsEnabled !== undefined ? preferences.alertsEnabled : true,
          preferences.securityAlerts !== undefined ? preferences.securityAlerts : true,
          preferences.loginAlerts !== undefined ? preferences.loginAlerts : true,
          preferences.language || 'en',
          preferences.timezone || 'UTC'
        ]
      );
    } else {
      console.log('[USER-PREFS] Updating existing preferences');
      // Update existing preferences
      await db.query(
        `UPDATE user_preferences SET
          theme = ?, primaryColor = ?, accentColor = ?, backgroundColor = ?,
          foregroundColor = ?, textColor = ?, sidebarColor = ?,
          sidebarTextColor = ?, notificationsEnabled = ?, soundEnabled = ?,
          emailNotifications = ?, twoFactorAuth = ?, alertsEnabled = ?,
          securityAlerts = ?, loginAlerts = ?, language = ?, timezone = ?,
          updated_at = NOW()
          WHERE user_id = ?`,
        [
          preferences.theme || 'light',
          preferences.primaryColor || '#667eea',
          preferences.accentColor || '#764ba2',
          preferences.backgroundColor || '#ffffff',
          preferences.foregroundColor || '#000000',
          preferences.textColor || '#333333',
          preferences.sidebarColor || '#f8f9fa',
          preferences.sidebarTextColor || '#333333',
          preferences.notificationsEnabled !== undefined ? preferences.notificationsEnabled : true,
          preferences.soundEnabled !== undefined ? preferences.soundEnabled : true,
          preferences.emailNotifications !== undefined ? preferences.emailNotifications : true,
          preferences.twoFactorAuth !== undefined ? preferences.twoFactorAuth : false,
          preferences.alertsEnabled !== undefined ? preferences.alertsEnabled : true,
          preferences.securityAlerts !== undefined ? preferences.securityAlerts : true,
          preferences.loginAlerts !== undefined ? preferences.loginAlerts : true,
          preferences.language || 'en',
          preferences.timezone || 'UTC',
          userId
        ]
      );
    }
    
    console.log('[USER-PREFS] Preferences saved successfully');
    res.json({ message: 'Preferences saved successfully' });
  } catch (error) {
    console.error('[USER-PREFS] Error saving user preferences:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get theme colors
router.get('/:userId/theme', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[USER-PREFS] GET /:userId/theme - userId:', userId);
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const [preferences] = await db.query(
      `SELECT theme, primaryColor, accentColor, backgroundColor,
              foregroundColor, textColor, sidebarColor, sidebarTextColor
       FROM user_preferences WHERE user_id = ?`,
      [userId]
    );
    
    if (preferences.length === 0) {
      console.log('[USER-PREFS] No theme found, returning defaults');
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
    
    console.log('[USER-PREFS] Theme found, returning data');
    res.json(preferences[0]);
  } catch (error) {
    console.error('[USER-PREFS] Error fetching theme:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

console.log('[ROUTES] user-preferences routes loaded successfully');

module.exports = router;
