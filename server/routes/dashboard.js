const express = require('express');
const router = express.Router();
const { Properties, Users, Transactions, CommissionTracking } = require('../models');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalProperties = await Properties.countDocuments();
    const activeProperties = await Properties.countDocuments({ status: 'active' });
    const totalBrokers = await Users.countDocuments({ role: 'broker', status: 'active' });
    const totalUsers = await Users.countDocuments();
    const pendingTransactions = await Transactions.countDocuments({ status: 'pending' }).catch(() => 0);

    res.json({
      totalProperties,
      activeProperties,
      totalBrokers,
      totalUsers,
      pendingTransactions,
      todayRevenue: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent activities
router.get('/activities', async (req, res) => {
  try {
    const recentProps = await Properties.find().sort({ created_at: -1 }).limit(10).lean();
    const activities = recentProps.map(p => ({
      type: 'property', name: p.title, created_at: p.created_at || p.createdAt, status: p.status, id: p._id
    }));
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
