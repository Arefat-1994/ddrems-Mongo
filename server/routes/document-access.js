const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { DocumentAccess, Properties, Users, Notifications } = require('../models');

router.post('/request', async (req, res) => {
  try {
    const { property_id, user_id } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(property_id)) return res.status(400).json({ message: 'Invalid Property ID' });
    if (!mongoose.Types.ObjectId.isValid(user_id)) return res.status(400).json({ message: 'Invalid User ID' });

    const property = await Properties.findById(property_id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const newRequest = await DocumentAccess.create({
      property_id,
      user_id,
      status: 'pending',
      requested_at: new Date()
    });

    if (property.owner_id) {
      await Notifications.create({
        user_id: property.owner_id,
        title: 'Document Access Request',
        message: `A user has requested access to documents for your property: ${property.title}`,
        type: 'info',
        related_id: newRequest._id
      });
    }

    res.json({ message: 'Success', success: true, id: newRequest._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/property/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const requests = await DocumentAccess.aggregate([
      { $match: { property_id: new mongoose.Types.ObjectId(req.params.propertyId) } },
      { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', user_name: '$user.name', user_email: '$user.email' } },
      { $sort: { requested_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/user/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) return res.json([]);
    const requests = await DocumentAccess.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title' } },
      { $sort: { requested_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/respond', async (req, res) => {
  try {
    const { status, response_message } = req.body;
    const request = await DocumentAccess.findByIdAndUpdate(req.params.id, {
      status,
      response_message,
      responded_at: new Date(),
      updated_at: new Date()
    });

    if (request && request.user_id) {
      await Notifications.create({
        user_id: request.user_id,
        title: 'Document Access Response',
        message: status === 'approved' ? 'Your document access request was approved.' : 'Your document access request was rejected.',
        type: status === 'approved' ? 'success' : 'error'
      });
    }

    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
