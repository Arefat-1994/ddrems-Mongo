const express = require('express');
const router = express.Router();
const db = require('../config/db');
const emailService = require('../services/emailService');

// Middleware to check if user is system_admin
const isSystemAdmin = (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  if (userRole === 'system_admin') {
    next();
  } else {
    res.status(403).json({ message: 'Unauthorized: System admin access required' });
  }
};

// Get system status and config
router.get('/status', async (req, res) => {
  try {
    const [configs] = await db.query('SELECT * FROM system_config');
    const configMap = {};
    configs.forEach(c => configMap[c.config_key] = c.config_value);
    
    res.json({
      status: 'online',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: configMap
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update system config (performance mode, etc.)
router.post('/config', isSystemAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    await db.query(
      'INSERT INTO system_config (config_key, config_value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (config_key) DO UPDATE SET config_value = ?, updated_at = NOW()',
      [key, value, value]
    );
    res.json({ message: `System configuration '${key}' updated to '${value}'` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Restart System
router.post('/restart', isSystemAdmin, async (req, res) => {
  console.log('🔄 System restart triggered by admin');
  res.json({ message: 'System restart initiated...' });
  
  // In a real environment, you'd use a process manager like pm2 or a service restarter
  setTimeout(() => {
    process.exit(0); // Assuming a process manager will restart it
  }, 1000);
});

// Shutdown System
router.post('/shutdown', isSystemAdmin, async (req, res) => {
  console.log('🛑 System shutdown triggered by admin');
  res.json({ message: 'System shutdown initiated...' });
  
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Close all open sessions (System Admin only)
router.post('/sessions/close-all', isSystemAdmin, async (req, res) => {
  try {
    console.log('🛑 Global session termination triggered by admin');
    await db.query('UPDATE user_sessions SET is_active = false');
    res.json({ message: 'All active sessions across the platform have been terminated.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Send custom email to user
router.post('/send-custom-email', async (req, res) => {
  try {
    const { to, subject, body, userName } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const html = `
      <h2>${subject}</h2>
      <p>Hello ${userName || 'User'},</p>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #1a237e; margin: 20px 0;">
        ${body.replace(/\n/g, '<br>')}
      </div>
      <p>Best regards,<br>DDREMS Administration Team</p>
    `;

    const result = await emailService.sendEmail(to, subject, html);
    if (result.success) {
      res.json({ message: 'Email sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send email', error: result.error });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all system configurations
router.get('/config', isSystemAdmin, async (req, res) => {
  try {
    const [configs] = await db.query('SELECT * FROM system_config');
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get system logs
router.get('/logs', isSystemAdmin, async (req, res) => {
  try {
    const [logs] = await db.query('SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 100');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user activity (audit log)
router.get('/user-activity', isSystemAdmin, async (req, res) => {
  try {
    const [activity] = await db.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100');
    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
