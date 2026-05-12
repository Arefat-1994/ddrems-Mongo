const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { EditRequests, Users, Notifications } = require('../models');

router.get('/all', async (req, res) => {
  try {
    const requests = await EditRequests.aggregate([
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const requests = await EditRequests.find({ user_id: req.params.userId }).sort({ created_at: -1 }).lean();
    res.json(requests.map(r => ({ ...r, id: r._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/request', async (req, res) => {
  try {
    const newReq = await EditRequests.create({
      user_id: req.body.user_id,
      profile_type: req.body.profile_type,
      profile_id: req.body.profile_id,
      reason: req.body.reason,
      requested_fields: req.body.requested_fields || [],
      status: 'pending',
      created_at: new Date()
    });
    res.json({ message: 'Success', success: true, id: newReq._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/:requestId', async (req, res) => {
  try {
    const request = await EditRequests.findById(req.params.requestId).lean();
    if (!request) return res.status(404).json({ message: 'Not found' });
    request.id = request._id;
    res.json(request);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:requestId/approve', async (req, res) => {
  try {
    const request = await EditRequests.findByIdAndUpdate(req.params.requestId, {
      status: 'approved',
      admin_response: req.body.admin_response,
      admin_id: req.body.admin_id,
      approved_fields: req.body.approved_fields || [],
      resolved_at: new Date()
    }, { new: true });
    
    if (request && request.user_id) {
      await Notifications.create({
        user_id: request.user_id,
        type: 'edit_approved',
        message: 'Your edit request was approved.',
        created_at: new Date(),
        is_read: false
      });
    }
    
    res.json({ message: 'Approved', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:requestId/reject', async (req, res) => {
  try {
    const request = await EditRequests.findByIdAndUpdate(req.params.requestId, {
      status: 'rejected',
      admin_response: req.body.admin_response,
      admin_id: req.body.admin_id,
      resolved_at: new Date()
    });

    if (request && request.user_id) {
      await Notifications.create({
        user_id: request.user_id,
        type: 'edit_rejected',
        message: 'Your edit request was rejected.',
        created_at: new Date(),
        is_read: false
      });
    }
    
    res.json({ message: 'Rejected', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/:requestId/submit', async (req, res) => {
  try { 
    await EditRequests.findByIdAndUpdate(req.params.requestId, { status: 'resolved' });
    res.json({ message: 'Success', success: true }); 
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// Assuming these notifications routes are in this file due to PostgreSQL stub grouping
router.get('/notifications/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const notifs = await Notifications.find({ user_id: req.params.userId }).sort({ created_at: -1 }).lean();
    res.json(notifs.map(n => ({ ...n, id: n._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/notifications/:notificationId/read', async (req, res) => {
  try {
    await Notifications.findByIdAndUpdate(req.params.notificationId, { is_read: true });
    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
