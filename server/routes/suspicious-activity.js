const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { FraudAlerts } = require('../models');

router.get('/scan', async (req, res) => {
  try {
    const alerts = await FraudAlerts.find({ status: 'active' }).sort({ created_at: -1 }).lean();
    res.json(alerts.map(a => ({ ...a, id: a._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/count', async (req, res) => {
  try {
    const count = await FraudAlerts.countDocuments({ status: 'active' });
    res.json({ count });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
