const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [properties] = await db.query('SELECT COUNT(*) as total FROM properties');
    const [activeProperties] = await db.query('SELECT COUNT(*) as total FROM properties WHERE status = \'active\'');
    const [brokers] = await db.query('SELECT COUNT(*) as total FROM users WHERE role = \'broker\' AND status = \'active\'');
    const [users] = await db.query('SELECT COUNT(*) as total FROM users');
    const [pendingTransactions] = await db.query('SELECT COUNT(*) as total FROM transactions WHERE status = \'pending\'');
    const [recentTransactions] = await db.query('SELECT SUM(customer_commission) as total FROM commission_tracking WHERE DATE(calculated_at) = CURRENT_DATE AND (status = \'paid\' OR commission_type = \'deal\')');

    res.json({
      totalProperties: properties[0].total,
      activeProperties: activeProperties[0].total,
      totalBrokers: brokers[0].total,
      totalUsers: users[0].total,
      pendingTransactions: pendingTransactions[0].total,
      todayRevenue: Number(recentTransactions[0].total || 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  try {
    const [activities] = await db.query(`
      SELECT 'property' as type, title as name, created_at, status 
      FROM properties 
      UNION ALL
      SELECT 'transaction' as type, CONCAT('Transaction #', id) as name, created_at, status 
      FROM transactions
      ORDER BY created_at DESC LIMIT 10
    `);

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
