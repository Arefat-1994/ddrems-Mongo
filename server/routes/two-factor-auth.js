const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { UserTwoFactorSettings } = require('../models');

router.get('/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json(null);
    let settings = await UserTwoFactorSettings.findOne({ user_id: req.params.userId }).lean();
    if (!settings) {
      settings = await UserTwoFactorSettings.create({
        user_id: req.params.userId,
        two_factor_enabled: false,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
    res.json(settings);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/setup-otp', async (req, res) => {
  try {
    await UserTwoFactorSettings.findOneAndUpdate({ user_id: req.params.userId }, {
      two_factor_method: 'otp',
      otp_secret: 'DUMMY_SECRET',
      updated_at: new Date()
    });
    res.json({ message: 'Setup initiated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/verify-otp', async (req, res) => {
  try {
    await UserTwoFactorSettings.findOneAndUpdate({ user_id: req.params.userId }, {
      two_factor_enabled: true,
      otp_verified: true,
      updated_at: new Date()
    });
    res.json({ message: 'Verified successfully', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/setup-password-2fa', async (req, res) => {
  try { res.json({ message: 'Success', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/verify-password-2fa', async (req, res) => {
  try { res.json({ message: 'Success', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/disable-2fa', async (req, res) => {
  try {
    await UserTwoFactorSettings.findOneAndUpdate({ user_id: req.params.userId }, {
      two_factor_enabled: false,
      two_factor_method: null,
      updated_at: new Date()
    });
    res.json({ message: 'Disabled successfully', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/generate-captcha', async (req, res) => {
  try { res.json({ message: 'Success', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/verify-captcha', async (req, res) => {
  try { res.json({ message: 'Success', success: true }); } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
