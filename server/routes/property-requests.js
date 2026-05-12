const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PropertyRequests, Properties, Users, Notifications } = require('../models');

router.get('/broker/:brokerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.brokerId)) return res.json([]);
    const requests = await PropertyRequests.aggregate([
      { $match: { broker_id: new mongoose.Types.ObjectId(req.params.brokerId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/owner/:ownerId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.ownerId)) return res.json([]);
    const requests = await PropertyRequests.aggregate([
      { $match: { owner_id: new mongoose.Types.ObjectId(req.params.ownerId) } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title', broker_name: '$broker.name' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(requests);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { property_id, broker_id, owner_id, request_type, request_message } = req.body;
    
    const newReq = await PropertyRequests.create({
      property_id,
      broker_id,
      owner_id,
      request_type,
      request_message,
      status: 'pending',
      created_at: new Date()
    });

    if (owner_id) {
      await Notifications.create({
        user_id: owner_id,
        type: 'property_request',
        message: 'A broker has requested to manage your property.',
        created_at: new Date(),
        is_read: false
      });
    }

    res.json({ message: 'Success', success: true, id: newReq._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id/respond', async (req, res) => {
  try {
    const { status, response_message } = req.body;
    const request = await PropertyRequests.findByIdAndUpdate(req.params.id, {
      status,
      response_message,
      responded_at: new Date(),
      updated_at: new Date()
    });

    if (request && request.broker_id) {
      await Notifications.create({
        user_id: request.broker_id,
        type: 'request_response',
        message: status === 'approved' ? 'Your property request was approved.' : 'Your property request was rejected.',
        created_at: new Date(),
        is_read: false
      });

      if (status === 'approved' && request.property_id) {
        await Properties.findByIdAndUpdate(request.property_id, { broker_id: request.broker_id });
      }
    }

    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
