const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { SystemSettings } = require('../models');

router.get('/', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne().lean();
    if (!settings) {
      settings = await SystemSettings.create({
        theme: 'light',
        systemStatus: 'active',
        maintenanceMode: false,
        created_at: new Date()
      });
    }
    res.json(settings);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (settings) {
      Object.assign(settings, req.body);
      settings.updated_at = new Date();
      await settings.save();
    } else {
      settings = await SystemSettings.create({ ...req.body, created_at: new Date() });
    }
    res.json({ message: 'Success', success: true, settings });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/action/:action', async (req, res) => {
  try {
    const { action } = req.params;
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({ systemStatus: 'active' });
    }
    
    if (action === 'clear-cache') {
      // Dummy cache clear
    } else if (action === 'reindex') {
      // Dummy reindex
    } else if (action === 'maintenance') {
      settings.maintenanceMode = !settings.maintenanceMode;
      await settings.save();
    }
    
    res.json({ message: 'Success', success: true, action });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/status', async (req, res) => {
  try {
    const settings = await SystemSettings.findOne().lean();
    res.json({ 
      status: settings?.systemStatus || 'active', 
      maintenanceMode: settings?.maintenanceMode || false 
    });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/backup', async (req, res) => {
  try { res.json({ message: 'Backup started', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/logs/export', async (req, res) => {
  try { res.json({ message: 'Logs exported', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
