const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { 
  CustomerProfiles, 
  OwnerProfiles, 
  BrokerProfiles, 
  Users, 
  Notifications, 
  ProfileEditRequests, 
  ProfileStatusHistory 
} = require('../models');
const { sendEmail, templates } = require('../services/emailService');

// Helper to handle mapping _id to id
const mapId = (doc) => {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id };
};

// ============================================================================
// CUSTOMER PROFILE ROUTES
// ============================================================================

router.get('/customer', async (req, res) => {
  try {
    const profiles = await CustomerProfiles.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email' } }
    ]);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/customer/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(404).json({ message: 'User not found' });
    let profile = await CustomerProfiles.findOne({ user_id: req.params.userId }).lean();
    if (!profile) {
      const user = await Users.findById(req.params.userId).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ id: user._id, name: user.name, email: user.email, phone: user.phone });
    }
    profile.id = profile._id;
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/customer', async (req, res) => {
  try {
    const { user_id, full_name, phone_number, address, profile_photo, id_document } = req.body;
    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ message: 'Invalid user id' });

    const existing = await CustomerProfiles.findOne({ user_id });
    if (existing) return res.status(400).json({ message: 'Profile already exists' });

    const newProfile = await CustomerProfiles.create({
      user_id, full_name, phone_number, address, profile_photo, id_document, profile_status: 'pending'
    });

    await Users.findByIdAndUpdate(user_id, { profile_completed: true });

    res.status(201).json({ message: 'Profile created successfully.', profileId: newProfile._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/customer/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid profile id' });
    const profile = await CustomerProfiles.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// OWNER PROFILE ROUTES
// ============================================================================

router.get('/owner', async (req, res) => {
  try {
    const profiles = await OwnerProfiles.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email' } }
    ]);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/owner/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(404).json({ message: 'User not found' });
    let profile = await OwnerProfiles.findOne({ user_id: req.params.userId }).lean();
    if (!profile) {
      const user = await Users.findById(req.params.userId).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.json({ id: user._id, name: user.name, email: user.email, phone: user.phone });
    }
    profile.id = profile._id;
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/owner', async (req, res) => {
  try {
    const { user_id, full_name, phone_number, address, profile_photo, id_document, business_license } = req.body;
    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ message: 'Invalid user id' });

    const existing = await OwnerProfiles.findOne({ user_id });
    if (existing) return res.status(400).json({ message: 'Profile already exists' });

    const newProfile = await OwnerProfiles.create({
      user_id, full_name, phone_number, address, profile_photo, id_document, business_license, profile_status: 'pending'
    });

    await Users.findByIdAndUpdate(user_id, { profile_completed: true });

    res.status(201).json({ message: 'Profile created successfully.', profileId: newProfile._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/owner/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid profile id' });
    const profile = await OwnerProfiles.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// BROKER PROFILE ROUTES
// ============================================================================

router.get('/broker', async (req, res) => {
  try {
    const profiles = await BrokerProfiles.aggregate([
      { $sort: { createdAt: -1 } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email' } }
    ]);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/broker/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.status(404).json({ message: 'Profile not found' });
    let profile = await BrokerProfiles.findOne({ user_id: req.params.userId }).lean();
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    profile.id = profile._id;
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/broker', async (req, res) => {
  try {
    const { user_id, full_name, phone_number, address, profile_photo, id_document, broker_license, license_number } = req.body;
    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ message: 'Invalid user id' });

    const existing = await BrokerProfiles.findOne({ user_id });
    if (existing) return res.status(400).json({ message: 'Profile already exists' });

    const newProfile = await BrokerProfiles.create({
      user_id, full_name, phone_number, address, profile_photo, id_document, broker_license, license_number, profile_status: 'pending'
    });

    await Users.findByIdAndUpdate(user_id, { profile_completed: true });

    res.status(201).json({ message: 'Profile created successfully.', profileId: newProfile._id });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/broker/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Invalid profile id' });
    const profile = await BrokerProfiles.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============================================================================
// ADMIN PROFILE APPROVAL ROUTES
// ============================================================================

router.post('/approve/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { adminId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(profileId)) return res.status(400).json({ message: 'Invalid profile id' });

    let Model;
    if (profileType === 'customer') Model = CustomerProfiles;
    else if (profileType === 'owner') Model = OwnerProfiles;
    else if (profileType === 'broker') Model = BrokerProfiles;
    else return res.status(400).json({ message: 'Invalid profile type' });

    const profile = await Model.findById(profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    const previousStatus = profile.profile_status;
    
    profile.profile_status = 'approved';
    profile.approved_by = adminId || null;
    profile.approved_at = new Date();
    profile.rejection_reason = null;
    await profile.save();

    await Users.findByIdAndUpdate(profile.user_id, { profile_approved: true, status: 'active' });

    try {
      await ProfileStatusHistory.create({
        profile_id: profileId, profile_type: profileType, old_status: previousStatus, new_status: 'approved', changed_by: adminId || null, reason: 'Admin approval'
      });
      await Notifications.create({
        user_id: profile.user_id, title: 'Profile Approved', message: 'Your profile has been approved. You now have full access to the system.', type: 'success', is_read: false, created_at: new Date()
      });
    } catch(e) { console.warn('Profile approval side-effects error:', e.message); }

    // Send approval email
    try {
      const user = await Users.findById(profile.user_id).lean();
      if (user && user.email) {
        const emailData = templates.accountApproved(user.name || profile.full_name);
        await sendEmail(user.email, emailData.subject, emailData.html);
        console.log(`[PROFILES] Approval email sent to ${user.email}`);
      }
    } catch (emailErr) {
      console.error('[PROFILES] Approval email failed:', emailErr.message);
    }

    // Emit real-time socket notification
    try {
      const socketModule = require('../socket');
      socketModule.emitToUser(profile.user_id.toString(), 'new_notification', {
        title: 'Profile Approved', message: 'Your profile has been approved.', type: 'success', is_read: false, created_at: new Date()
      });
    } catch(se) {}

    res.json({ message: 'Profile approved successfully', previousStatus, newStatus: 'approved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/suspend/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { adminId, reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(profileId)) return res.status(400).json({ message: 'Invalid profile id' });
    let Model;
    if (profileType === 'customer') Model = CustomerProfiles;
    else if (profileType === 'owner') Model = OwnerProfiles;
    else if (profileType === 'broker') Model = BrokerProfiles;
    else return res.status(400).json({ message: 'Invalid profile type' });

    const profile = await Model.findById(profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const previousStatus = profile.profile_status;
    
    profile.profile_status = 'suspended';
    profile.approved_by = adminId || null;
    profile.approved_at = new Date();
    profile.rejection_reason = reason || 'Suspended by administrator';
    await profile.save();

    await Users.findByIdAndUpdate(profile.user_id, { profile_approved: false });

    try {
      await ProfileStatusHistory.create({ profile_id: profileId, profile_type: profileType, old_status: previousStatus, new_status: 'suspended', changed_by: adminId || null, reason: reason || 'Suspended' });
      await Notifications.create({ user_id: profile.user_id, title: 'Profile Suspended', message: `Your profile has been suspended. Reason: ${reason || 'Contact support'}`, type: 'warning', is_read: false, created_at: new Date() });
    } catch(e) { console.warn('Suspension side-effects error:', e.message); }

    // Send suspension email
    try {
      const user = await Users.findById(profile.user_id).lean();
      if (user && user.email) {
        const emailData = templates.accountRejected(user.name || profile.full_name, reason || 'Your profile has been suspended by the administrator.');
        await sendEmail(user.email, emailData.subject, emailData.html);
      }
    } catch(emailErr) { console.error('[PROFILES] Suspension email failed:', emailErr.message); }

    try {
      const socketModule = require('../socket');
      socketModule.emitToUser(profile.user_id.toString(), 'new_notification', {
        title: 'Profile Suspended', message: `Your profile has been suspended.`, type: 'warning', is_read: false, created_at: new Date()
      });
    } catch(se) {}

    res.json({ message: 'Profile suspended successfully', previousStatus, newStatus: 'suspended' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/reject/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { adminId, rejectionReason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(profileId)) return res.status(400).json({ message: 'Invalid profile id' });
    let Model;
    if (profileType === 'customer') Model = CustomerProfiles;
    else if (profileType === 'owner') Model = OwnerProfiles;
    else if (profileType === 'broker') Model = BrokerProfiles;
    else return res.status(400).json({ message: 'Invalid profile type' });

    const profile = await Model.findById(profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const previousStatus = profile.profile_status;
    
    profile.profile_status = 'rejected';
    profile.approved_by = adminId || null;
    profile.approved_at = new Date();
    profile.rejection_reason = rejectionReason;
    await profile.save();

    await Users.findByIdAndUpdate(profile.user_id, { profile_approved: false });

    try {
      await ProfileStatusHistory.create({ profile_id: profileId, profile_type: profileType, old_status: previousStatus, new_status: 'rejected', changed_by: adminId || null, reason: rejectionReason });
      await Notifications.create({ user_id: profile.user_id, title: 'Profile Rejected', message: `Your profile has been rejected. Reason: ${rejectionReason}`, type: 'error', is_read: false, created_at: new Date() });
    } catch(e) { console.warn('Rejection side-effects error:', e.message); }

    // Send rejection email
    try {
      const user = await Users.findById(profile.user_id).lean();
      if (user && user.email) {
        const emailData = templates.accountRejected(user.name || profile.full_name, rejectionReason);
        await sendEmail(user.email, emailData.subject, emailData.html);
      }
    } catch(emailErr) { console.error('[PROFILES] Rejection email failed:', emailErr.message); }

    try {
      const socketModule = require('../socket');
      socketModule.emitToUser(profile.user_id.toString(), 'new_notification', {
        title: 'Profile Rejected', message: `Your profile has been rejected.`, type: 'error', is_read: false, created_at: new Date()
      });
    } catch(se) {}

    res.json({ message: 'Profile rejected successfully', previousStatus, newStatus: 'rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/change-status/:profileType/:profileId', async (req, res) => {
  try {
    const { profileType, profileId } = req.params;
    const { newStatus, adminId, reason } = req.body;
    if (!mongoose.Types.ObjectId.isValid(profileId)) return res.status(400).json({ message: 'Invalid profile id' });
    let Model;
    if (profileType === 'customer') Model = CustomerProfiles;
    else if (profileType === 'owner') Model = OwnerProfiles;
    else if (profileType === 'broker') Model = BrokerProfiles;
    else return res.status(400).json({ message: 'Invalid profile type' });

    const profile = await Model.findById(profileId);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    const previousStatus = profile.profile_status;
    
    profile.profile_status = newStatus;
    profile.approved_by = adminId || null;
    profile.approved_at = new Date();
    profile.rejection_reason = newStatus === 'rejected' ? reason : null;
    await profile.save();

    await Users.findByIdAndUpdate(profile.user_id, { profile_approved: newStatus === 'approved' });

    try {
      await ProfileStatusHistory.create({ profile_id: profileId, profile_type: profileType, old_status: previousStatus, new_status: newStatus, changed_by: adminId || null, reason: reason });
    } catch(e) {}

    res.json({ message: 'Profile status changed', previousStatus, newStatus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const customerCount = await CustomerProfiles.countDocuments({ profile_status: 'pending' });
    const ownerCount = await OwnerProfiles.countDocuments({ profile_status: 'pending' });
    const brokerCount = await BrokerProfiles.countDocuments({ profile_status: 'pending' });

    // The frontend actually expects two things from /pending. Sometimes it uses GET /pending for arrays of profiles, sometimes GET /pending for counts. Let's return both to be safe.
    
    const customers = await CustomerProfiles.aggregate([{ $match: { profile_status: 'pending' } }, { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $addFields: { id: '$_id', profile_type: 'customer', user_name: '$user.name', user_email: '$user.email' } }]);
    const owners = await OwnerProfiles.aggregate([{ $match: { profile_status: 'pending' } }, { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $addFields: { id: '$_id', profile_type: 'owner', user_name: '$user.name', user_email: '$user.email' } }]);
    const brokers = await BrokerProfiles.aggregate([{ $match: { profile_status: 'pending' } }, { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $addFields: { id: '$_id', profile_type: 'broker', user_name: '$user.name', user_email: '$user.email' } }]);

    res.json({
      customers: customers,
      owners: owners,
      brokers: brokers,
      total: customerCount + ownerCount + brokerCount,
      breakdown: { customer: customerCount, owner: ownerCount, broker: brokerCount }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/history/:profileType/:profileId', async (req, res) => {
  try {
    const history = await ProfileStatusHistory.find({ profile_id: req.params.profileId, profile_type: req.params.profileType }).sort({ createdAt: -1 });
    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
