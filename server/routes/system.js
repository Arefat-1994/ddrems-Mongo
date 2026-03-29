const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get system logs
router.get('/logs', async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT * FROM audit_log 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    
    // Format logs for display
    const formattedLogs = logs.map(log => ({
      timestamp: log.created_at,
      level: 'info',
      message: `${log.action} on ${log.table_name} (ID: ${log.record_id})`
    }));
    
    res.json(formattedLogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user activity
router.get('/user-activity', async (req, res) => {
  try {
    const [activity] = await db.query(`
      SELECT al.*, u.name as user_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `);
    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get system configuration
router.get('/config', async (req, res) => {
  try {
    const [config] = await db.query('SELECT * FROM system_config ORDER BY config_key');
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update system configuration
router.put('/config/:key', async (req, res) => {
  try {
    const { value } = req.body;
    await db.query(
      'UPDATE system_config SET config_value = ? WHERE config_key = ?',
      [value, req.params.key]
    );
    res.json({ message: 'Configuration updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
