const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Users, BrokerProfiles, OwnerProfiles, CustomerProfiles, ProfileStatusHistory, Notifications } = require('../models');
const { sendEmail, templates } = require('../services/emailService');

// Admin route to get all profiles by status
router.get('/all', async (req, res) => {
  try {
    const users = await Users.find().lean();
    
    // We group them into pending, approved, rejected (using status or profile_approved fields)
    const pending = users.filter(u => !u.profile_approved && u.profile_completed && u.status !== 'rejected');
    const approved = users.filter(u => u.profile_approved && u.status === 'active');
    const rejected = users.filter(u => u.status === 'rejected');

    // Add profile details
    const enrichUsers = async (userList) => {
      const enriched = [];
      for (const u of userList) {
        let profile = null;
        if (u.role === 'broker') profile = await BrokerProfiles.findOne({ user_id: u._id }).lean();
        else if (u.role === 'owner') profile = await OwnerProfiles.findOne({ user_id: u._id }).lean();
        else if (u.role === 'user') profile = await CustomerProfiles.findOne({ user_id: u._id }).lean();
        
        enriched.push({ ...u, id: u._id, profile });
      }
      return enriched;
    };

    res.json({
      pending: await enrichUsers(pending),
      approved: await enrichUsers(approved),
      rejected: await enrichUsers(rejected)
    });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/approve', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await Users.findByIdAndUpdate(req.params.userId, {
      profile_approved: true,
      status: 'active'
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.role === 'broker') await BrokerProfiles.findOneAndUpdate({ user_id: user._id }, { profile_status: 'approved' });
    else if (user.role === 'owner') await OwnerProfiles.findOneAndUpdate({ user_id: user._id }, { profile_status: 'approved' });
    else if (user.role === 'user') await CustomerProfiles.findOneAndUpdate({ user_id: user._id }, { profile_status: 'approved' });

    // Send account approved email
    try {
      const emailData = templates.accountApproved(user.name);
      await sendEmail(user.email, emailData.subject, emailData.html);
      console.log(`[PROFILE-APPROVAL] Approval email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('[PROFILE-APPROVAL] Email send failed:', emailErr.message);
    }

    // Create in-app notification
    try {
      await Notifications.create({
        user_id: user._id,
        title: 'Account Activated!',
        message: 'Your account has been approved and activated. You now have full access to the system.',
        type: 'success',
        is_read: false,
        created_at: new Date()
      });

      // Emit socket event
      const socketModule = require('../socket');
      socketModule.emitToUser(user._id.toString(), 'new_notification', {
        title: 'Account Activated!',
        message: 'Your account has been approved and activated.',
        type: 'success',
        is_read: false,
        created_at: new Date()
      });
    } catch (notifErr) {
      console.warn('[PROFILE-APPROVAL] Notification creation failed:', notifErr.message);
    }

    res.json({ message: 'Profile approved', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:userId/reject', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const { reason } = req.body;

    const user = await Users.findByIdAndUpdate(req.params.userId, {
      profile_approved: false,
      status: 'rejected'
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    if (user.role === 'broker') await BrokerProfiles.findOneAndUpdate({ user_id: user._id }, { profile_status: 'rejected' });
    else if (user.role === 'owner') await OwnerProfiles.findOneAndUpdate({ user_id: user._id }, { profile_status: 'rejected' });
    else if (user.role === 'user') await CustomerProfiles.findOneAndUpdate({ user_id: user._id }, { profile_status: 'rejected' });

    // Send rejection email
    try {
      const emailData = templates.accountRejected(user.name, reason);
      await sendEmail(user.email, emailData.subject, emailData.html);
      console.log(`[PROFILE-APPROVAL] Rejection email sent to ${user.email}`);
    } catch (emailErr) {
      console.error('[PROFILE-APPROVAL] Email send failed:', emailErr.message);
    }

    // Create in-app notification
    try {
      await Notifications.create({
        user_id: user._id,
        title: 'Account Not Approved',
        message: `Your account application was not approved.${reason ? ' Reason: ' + reason : ''}`,
        type: 'error',
        is_read: false,
        created_at: new Date()
      });
    } catch (notifErr) {
      console.warn('[PROFILE-APPROVAL] Notification creation failed:', notifErr.message);
    }

    res.json({ message: 'Profile rejected', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/check-approval/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const user = await Users.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ approved: user.profile_approved, status: user.status });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/submit-for-approval/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const user = await Users.findByIdAndUpdate(req.params.userId, { profile_completed: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Submitted for approval', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
