const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Users, BrokerProfiles, Notifications } = require('../models');
const bcrypt = require('bcryptjs');

router.post('/create-account', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Server-side validation
    if (!name || name.trim().length < 3) return res.status(400).json({ success: false, message: 'Full name must be at least 3 characters' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    
    const cleanPhone = (phone || '').replace(/\s/g, '');
    if (!/^(\+251|0)9[0-9]{8}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid Ethiopian phone number (09... or +2519...)' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const existing = await Users.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });
    const hashedPassword = await bcrypt.hash(password || 'admin123', 10);
    const newUser = await Users.create({ name, email, password: hashedPassword, phone, role: 'broker', status: 'active', profile_approved: false, profile_completed: false });
    res.json({ success: true, user_id: newUser._id, message: 'Broker account created' });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error', error: error.message }); }
});

router.get('/', async (req, res) => {
  try {
    const brokers = await Users.aggregate([
      { $match: { role: 'broker' } },
      { $lookup: { from: 'brokerprofiles', localField: '_id', foreignField: 'user_id', as: 'profile' } },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      { $addFields: { user_id: '$_id', id: '$_id', account_status: '$status', profile_id: '$profile._id', full_name: '$profile.full_name', profile_phone: '$profile.phone_number', address: '$profile.address', license_number: '$profile.license_number', profile_status: '$profile.profile_status', profile_photo: '$profile.profile_photo', id_document: '$profile.id_document', broker_license: '$profile.broker_license', rejection_reason: '$profile.rejection_reason', registered_at: '$created_at' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(brokers);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: 'Broker not found' });
    const user = await Users.findOne({ _id: req.params.id, role: 'broker' }).lean();
    if (!user) return res.status(404).json({ message: 'Broker not found' });
    const profile = await BrokerProfiles.findOne({ user_id: req.params.id }).lean();
    res.json({ ...user, user_id: user._id, id: user._id, account_status: user.status, ...(profile || {}), profile_id: profile?._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/update/:id', async (req, res) => {
  try {
    const { name, email, phone, account_status, license_number } = req.body;
    const update = {};
    if (name) update.name = name; if (email) update.email = email; if (phone) update.phone = phone; if (account_status) update.status = account_status;
    if (Object.keys(update).length > 0) await Users.findByIdAndUpdate(req.params.id, update);
    if (license_number) await BrokerProfiles.findOneAndUpdate({ user_id: req.params.id }, { license_number });
    res.json({ message: 'Broker updated' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { user_id, full_name, phone, address, license_number } = req.body;
    const existing = await BrokerProfiles.findOne({ user_id });
    if (existing) return res.status(400).json({ message: 'Profile already exists' });
    const bp = await BrokerProfiles.create({ user_id, full_name, phone_number: phone, address, license_number, profile_status: 'pending' });
    res.json({ id: bp._id, message: 'Broker profile created' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, status } = req.body;
    await Users.findOneAndUpdate({ _id: req.params.id, role: 'broker' }, { name, email, phone, status: status || 'active' });
    res.json({ message: 'Broker updated' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(404).json({ message: 'Not found' });
    const user = await Users.findOne({ _id: req.params.userId, role: 'broker' }).lean();
    if (!user) return res.status(404).json({ message: 'Broker not found' });
    const profile = await BrokerProfiles.findOne({ user_id: req.params.userId }).lean();
    res.json({ ...user, user_id: user._id, id: user._id, account_status: user.status, ...(profile || {}) });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
