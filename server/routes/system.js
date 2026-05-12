const express = require('express');
const router = express.Router();
const { SystemConfig, SystemLogs, AuditLog, UserSessions } = require('../models');
const emailService = require('../services/emailService');

const isSystemAdmin = (req, res, next) => {
  const userRole = req.headers['x-user-role'];
  if (userRole === 'system_admin') next();
  else res.status(403).json({ message: 'Unauthorized: System admin access required' });
};

router.get('/status', async (req, res) => {
  try {
    const configs = await SystemConfig.find().lean();
    const configMap = {};
    configs.forEach(c => configMap[c.config_key] = c.config_value);
    res.json({ status: 'online', uptime: process.uptime(), memory: process.memoryUsage(), config: configMap });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/config', isSystemAdmin, async (req, res) => {
  try {
    const { key, value } = req.body;
    await SystemConfig.findOneAndUpdate({ config_key: key }, { config_key: key, config_value: value, updated_at: new Date() }, { upsert: true });
    res.json({ message: `System configuration '${key}' updated to '${value}'` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/restart', isSystemAdmin, async (req, res) => {
  res.json({ message: 'System restart initiated...' });
  setTimeout(() => process.exit(0), 1000);
});

router.post('/shutdown', isSystemAdmin, async (req, res) => {
  res.json({ message: 'System shutdown initiated...' });
  setTimeout(() => process.exit(1), 1000);
});

router.post('/sessions/close-all', isSystemAdmin, async (req, res) => {
  try {
    await UserSessions.updateMany({}, { is_active: false });
    res.json({ message: 'All active sessions terminated.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/send-custom-email', async (req, res) => {
  try {
    const { to, subject, body, userName } = req.body;
    if (!to || !subject || !body) return res.status(400).json({ message: 'Missing required fields' });
    const html = `<h2>${subject}</h2><p>Hello ${userName || 'User'},</p><div style="background:#f9f9f9;padding:20px;border-radius:8px;border-left:4px solid #1a237e;margin:20px 0;">${body.replace(/\n/g, '<br>')}</div><p>Best regards,<br>DDREMS Administration Team</p>`;
    const result = await emailService.sendEmail(to, subject, html);
    if (result.success) res.json({ message: 'Email sent successfully' });
    else res.status(500).json({ message: 'Failed to send email', error: result.error });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/config', isSystemAdmin, async (req, res) => {
  try {
    const configs = await SystemConfig.find().lean();
    res.json(configs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/logs', isSystemAdmin, async (req, res) => {
  try {
    const logs = await SystemLogs.find().sort({ created_at: -1 }).limit(100).lean();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/user-activity', isSystemAdmin, async (req, res) => {
  try {
    const activity = await AuditLog.find().sort({ created_at: -1 }).limit(100).lean();
    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
