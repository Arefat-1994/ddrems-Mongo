const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { PropertyVerification, Properties, Users, Notifications } = require('../models');

router.get('/property/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const verification = await PropertyVerification.find({ property_id: req.params.propertyId }).sort({ created_at: -1 }).lean();
    res.json(verification.map(v => ({ ...v, id: v._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.get('/pending', async (req, res) => {
  try {
    const pending = await PropertyVerification.aggregate([
      { $match: { verification_status: 'pending' } },
      { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'property' } },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', property_title: '$property.title' } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(pending);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.post('/', async (req, res) => {
  try {
    const newVer = await PropertyVerification.create({
      ...req.body,
      verification_status: 'pending',
      created_at: new Date()
    });
    res.json({ message: 'Success', success: true, id: newVer._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const ver = await PropertyVerification.findByIdAndUpdate(req.params.id, {
      ...req.body,
      verified_at: req.body.verification_status === 'approved' || req.body.verification_status === 'rejected' ? new Date() : undefined
    });

    if (req.body.verification_status && ver && ver.property_id) {
        await Properties.findByIdAndUpdate(ver.property_id, {
            verification_status: req.body.verification_status
        });
    }

    res.json({ message: 'Updated', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
