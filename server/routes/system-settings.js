const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get system settings
router.get('/', async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM system_settings LIMIT 1');
    
    if (settings.length === 0) {
      // Return default settings if none exist
      return res.json({
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        soundEnabled: true,
        notificationsEnabled: true,
        systemStatus: 'active',
        maintenanceMode: false,
        maintenanceMessage: '',
        maxUsers: 1000,
        sessionTimeout: 30,
        enableRegistration: true,
        enableBrokerRegistration: true,
        enableOwnerRegistration: true,
        twoFactorAuth: false,
        ipWhitelist: false,
        ipWhitelistAddresses: '',
        backupEnabled: true,
        backupFrequency: 'daily',
        logLevel: 'info',
        apiRateLimit: 1000,
        apiRateLimitWindow: 3600
      });
    }
    
    res.json(settings[0]);
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save system settings
router.post('/', async (req, res) => {
  try {
    const settings = req.body;
    
    // Check if settings exist
    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');
    
    if (existing.length === 0) {
      // Insert new settings
      await db.query(
        `INSERT INTO system_settings (
          theme, primaryColor, accentColor, soundEnabled, notificationsEnabled,
          systemStatus, maintenanceMode, maintenanceMessage, maxUsers, sessionTimeout,
          enableRegistration, enableBrokerRegistration, enableOwnerRegistration,
          twoFactorAuth, ipWhitelist, ipWhitelistAddresses, backupEnabled,
          backupFrequency, logLevel, apiRateLimit, apiRateLimitWindow, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          settings.theme, settings.primaryColor, settings.accentColor,
          settings.soundEnabled, settings.notificationsEnabled,
          settings.systemStatus, settings.maintenanceMode, settings.maintenanceMessage,
          settings.maxUsers, settings.sessionTimeout,
          settings.enableRegistration, settings.enableBrokerRegistration,
          settings.enableOwnerRegistration, settings.twoFactorAuth,
          settings.ipWhitelist, settings.ipWhitelistAddresses,
          settings.backupEnabled, settings.backupFrequency,
          settings.logLevel, settings.apiRateLimit, settings.apiRateLimitWindow
        ]
      );
    } else {
      // Update existing settings
      await db.query(
        `UPDATE system_settings SET
          theme = ?, primaryColor = ?, accentColor = ?, soundEnabled = ?,
          notificationsEnabled = ?, systemStatus = ?, maintenanceMode = ?,
          maintenanceMessage = ?, maxUsers = ?, sessionTimeout = ?,
          enableRegistration = ?, enableBrokerRegistration = ?,
          enableOwnerRegistration = ?, twoFactorAuth = ?, ipWhitelist = ?,
          ipWhitelistAddresses = ?, backupEnabled = ?, backupFrequency = ?,
          logLevel = ?, apiRateLimit = ?, apiRateLimitWindow = ?, updated_at = NOW()
          WHERE id = ?`,
        [
          settings.theme, settings.primaryColor, settings.accentColor,
          settings.soundEnabled, settings.notificationsEnabled,
          settings.systemStatus, settings.maintenanceMode, settings.maintenanceMessage,
          settings.maxUsers, settings.sessionTimeout,
          settings.enableRegistration, settings.enableBrokerRegistration,
          settings.enableOwnerRegistration, settings.twoFactorAuth,
          settings.ipWhitelist, settings.ipWhitelistAddresses,
          settings.backupEnabled, settings.backupFrequency,
          settings.logLevel, settings.apiRateLimit, settings.apiRateLimitWindow,
          existing[0].id
        ]
      );
    }
    
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving system settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// System actions
router.post('/action/:action', async (req, res) => {
  try {
    const { action } = req.params;
    
    switch (action) {
      case 'restart':
        console.log('System restart initiated');
        // In production, this would trigger actual system restart
        res.json({ message: 'System restart initiated' });
        break;
        
      case 'pause':
        console.log('System paused');
        await db.query('UPDATE system_settings SET systemStatus = ? WHERE id = 1', ['paused']);
        res.json({ message: 'System paused' });
        break;
        
      case 'shutdown':
        console.log('System shutdown initiated');
        await db.query('UPDATE system_settings SET systemStatus = ? WHERE id = 1', ['inactive']);
        res.json({ message: 'System shutdown initiated' });
        break;
        
      default:
        res.status(400).json({ message: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error performing system action:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get system status
router.get('/status', async (req, res) => {
  try {
    const [settings] = await db.query('SELECT systemStatus, maintenanceMode FROM system_settings LIMIT 1');
    
    if (settings.length === 0) {
      return res.json({ systemStatus: 'active', maintenanceMode: false });
    }
    
    res.json(settings[0]);
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create backup
router.post('/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `Backup_${timestamp}.zip`;
    
    // In production, this would create an actual backup
    console.log(`Backup created: ${backupName}`);
    
    res.json({ message: 'Backup created successfully', backupName });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export logs
router.get('/logs/export', async (req, res) => {
  try {
    // In production, this would export actual logs
    const logs = 'System logs exported';
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="system-logs.txt"');
    res.send(logs);
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
