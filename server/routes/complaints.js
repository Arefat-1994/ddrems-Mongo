const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Complaints, Users, Notifications } = require('../models');

router.post('/', async (req, res) => {
  try {
    const { user_id, subject, description, category, priority } = req.body;
    if (!user_id || !subject || !description) return res.status(400).json({ message: 'Required fields missing', success: false });
    const validCategories = ['technical', 'billing', 'property', 'broker', 'service', 'other'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validCategory = validCategories.includes(category) ? category : 'other';
    const validPriority = validPriorities.includes(priority) ? priority : 'medium';

    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ message: 'Invalid user ID', success: false });
    const user = await Users.findById(user_id);
    if (!user) return res.status(404).json({ message: 'User not found', success: false });

    const complaint = await Complaints.create({ user_id, subject: subject.trim(), description: description.trim(), category: validCategory, priority: validPriority, status: 'open' });

    const admins = await Users.find({ role: { $in: ['system_admin', 'admin'] } });
    for (const admin of admins) {
      try { await Notifications.create({ user_id: admin._id, title: `New Complaint: ${subject.trim()}`, message: `${user.name} (${user.role}) submitted a ${validPriority} priority complaint.`, type: 'warning', is_read: false }); } catch(e) {}
    }

    res.status(201).json({ success: true, id: complaint._id, message: 'Complaint submitted successfully.' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json({ success: true, complaints: [] });
    const complaints = await Complaints.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $lookup: { from: 'users', localField: 'resolved_by', foreignField: '_id', as: 'resolver' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$resolver', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email', user_role: '$user.role', resolved_by_name: '$resolver.name' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json({ success: true, complaints });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.get('/admin/all', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    let match = {};
    if (status && status !== 'all') match.status = status;
    if (priority && priority !== 'all') match.priority = priority;
    if (category && category !== 'all') match.category = category;

    const complaints = await Complaints.aggregate([
      { $match: match },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $lookup: { from: 'users', localField: 'resolved_by', foreignField: '_id', as: 'resolver' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$resolver', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email', user_role: '$user.role', user_phone: '$user.phone', resolved_by_name: '$resolver.name' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json({ success: true, complaints });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.get('/admin/stats', async (req, res) => {
  try {
    const total = await Complaints.countDocuments();
    const open = await Complaints.countDocuments({ status: 'open' });
    const inProgress = await Complaints.countDocuments({ status: 'in_progress' });
    const resolved = await Complaints.countDocuments({ status: 'resolved' });
    const closed = await Complaints.countDocuments({ status: 'closed' });
    const urgent = await Complaints.countDocuments({ priority: 'urgent', status: { $in: ['open', 'in_progress'] } });
    const byCategory = await Complaints.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $project: { category: '$_id', count: 1, _id: 0 } }]);
    const byPriority = await Complaints.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }, { $project: { priority: '$_id', count: 1, _id: 0 } }]);
    res.json({ success: true, total, open, in_progress: inProgress, resolved, closed, urgent, byCategory, byPriority, byRole: [] });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.put('/:id/respond', async (req, res) => {
  try {
    const { admin_response, admin_id, status } = req.body;
    if (!admin_response || !admin_id) return res.status(400).json({ message: 'Required fields missing', success: false });
    const newStatus = status || 'in_progress';
    const update = { admin_response: admin_response.trim(), status: newStatus, updated_at: new Date() };
    if (newStatus === 'resolved' || newStatus === 'closed') { update.resolved_by = admin_id; update.resolved_at = new Date(); }
    await Complaints.findByIdAndUpdate(req.params.id, update);

    const complaint = await Complaints.findById(req.params.id);
    if (complaint) {
      const admin = await Users.findById(admin_id);
      try { await Notifications.create({ user_id: complaint.user_id, title: `Complaint Update: ${complaint.subject}`, message: `${admin ? admin.name : 'Admin'} has responded. Status: ${newStatus}`, type: 'info', is_read: false }); } catch(e) {}
    }
    res.json({ success: true, message: 'Response sent successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

router.put('/:id/status', async (req, res) => {
  try {
    const { status, admin_id } = req.body;
    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status', success: false });
    const update = { status, updated_at: new Date() };
    if (status === 'resolved' || status === 'closed') { update.resolved_by = admin_id; update.resolved_at = new Date(); }
    await Complaints.findByIdAndUpdate(req.params.id, update);

    const complaint = await Complaints.findById(req.params.id);
    if (complaint) {
      try { await Notifications.create({ user_id: complaint.user_id, title: 'Complaint Status Updated', message: `Your complaint "${complaint.subject}" status: ${status}`, type: 'info', is_read: false }); } catch(e) {}
    }
    res.json({ success: true, message: 'Status updated successfully' });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message, success: false }); }
});

module.exports = router;
