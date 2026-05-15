const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Properties, Users, PropertyImages, PropertyVerification, Agreements, Notifications, BrokerEngagements } = require('../models');
const emailService = require('../services/emailService');
const { upload } = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const uploadVideo = upload;

// Helper to validate ObjectId
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Get only ACTIVE properties
router.get('/active', async (req, res) => {
  try {
    const properties = await Properties.aggregate([
      { $match: { status: 'active', verified: true } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        broker_name: '$broker.name',
        owner_name: '$owner.name',
        image_count: { $size: '$images' },
        main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] },
        views: { $ifNull: ['$views', 0] }
      }},
      { $sort: { views: -1, created_at: -1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all properties
router.get('/', async (req, res) => {
  try {
    const properties = await Properties.aggregate([
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        broker_name: '$broker.name',
        owner_name: '$owner.name',
        image_count: { $size: '$images' },
        main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] },
        created_at: { $ifNull: ['$created_at', '$createdAt'] }
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const { admin_id } = req.query;
    let matchQuery = {};
    if (admin_id && admin_id !== 'undefined' && admin_id !== 'null' && isValidId(admin_id)) {
      matchQuery.property_admin_id = new mongoose.Types.ObjectId(admin_id);
    }

    const total = await Properties.countDocuments(matchQuery);
    const active = await Properties.countDocuments({ ...matchQuery, status: 'active' });
    const pending = await Properties.countDocuments({ ...matchQuery, status: 'pending' });
    const sold = await Properties.countDocuments({ ...matchQuery, status: 'sold' });
    const rented = await Properties.countDocuments({ ...matchQuery, status: 'rented' });
    const inactive = await Properties.countDocuments({ ...matchQuery, status: 'inactive' });
    const suspended = await Properties.countDocuments({ ...matchQuery, status: 'suspended' });
    const verified = await Properties.countDocuments({ ...matchQuery, verified: true });
    const unverified = await Properties.countDocuments({ ...matchQuery, verified: { $ne: true } });

    const types = await Properties.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } }
    ]);

    const listings = await Properties.aggregate([
      { $group: { _id: '$listing_type', count: { $sum: 1 } } },
      { $project: { listing_type: '$_id', count: 1, _id: 0 } }
    ]);

    const revenueAgg = await BrokerEngagements.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$system_commission_amount' } } }
    ]);
    const totalRev = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    const monthlyRevenueAgg = await BrokerEngagements.aggregate([
      { $match: { status: 'completed', completed_at: { $exists: true } } },
      { $group: {
        _id: { month: { $month: '$completed_at' }, year: { $year: '$completed_at' } },
        amount: { $sum: '$system_commission_amount' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);
    const revenue = monthlyRevenueAgg.map(r => ({
      month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
      amount: r.amount
    }));

    const performance = await BrokerEngagements.aggregate([
      { $match: { status: 'completed' } },
      { $group: {
        _id: '$broker_id',
        deals: { $sum: 1 },
        revenue: { $sum: '$system_commission_amount' }
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'broker'
      }},
      { $unwind: '$broker' },
      { $project: {
        _id: 0,
        broker_id: '$_id',
        name: '$broker.name',
        count: '$deals',
        revenue: 1
      }},
      { $sort: { count: -1 } }
    ]);

    const userDist = await Users.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $project: { role: '$_id', count: 1, _id: 0 } }
    ]);

    res.json({
      total, active, pending, sold, rented, inactive, suspended, verified, unverified,
      totalRevenue: totalRev,
      typeDistribution: types,
      listingDistribution: listings,
      monthlyRevenue: revenue,
      brokerPerformance: performance,
      userDistribution: userDist
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get owner properties
router.get('/owner/:userId', async (req, res) => {
  try {
    if (!isValidId(req.params.userId)) return res.status(400).json({ message: 'Invalid ID' });
    const properties = await Properties.aggregate([
      { $match: { owner_id: new mongoose.Types.ObjectId(req.params.userId) } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        broker_name: '$broker.name',
        image_count: { $size: '$images' },
        main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] },
        created_at: { $ifNull: ['$created_at', '$createdAt'] }
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending verification properties
router.get('/pending-verification', async (req, res) => {
  try {
    const properties = await Properties.aggregate([
      { $match: { status: 'pending' } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        owner_name: '$owner.name', owner_email: '$owner.email',
        broker_name: '$broker.name', broker_email: '$broker.email',
        image_count: { $size: '$images' },
        main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] },
        created_at: { $ifNull: ['$created_at', '$createdAt'] }
      }},
      { $sort: { created_at: 1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all with status
router.get('/all-with-status', async (req, res) => {
  try {
    const properties = await Properties.aggregate([
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'propertyverifications', localField: '_id', foreignField: 'property_id', as: 'pv' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$pv', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id',
        owner_name: '$owner.name',
        broker_name: '$broker.name',
        verification_status: '$pv.verification_status',
        verification_notes: '$pv.verification_notes',
        verified_at: '$pv.verified_at',
        image_count: { $size: '$images' },
        main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] },
        created_at: { $ifNull: ['$created_at', '$createdAt'] }
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Recommendations
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const properties = await Properties.aggregate([
      { $match: { status: 'active', verified: true } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $addFields: { id: '$_id', main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] } } },
      { $sort: { views: -1, created_at: -1 } },
      { $limit: 10 }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify property
router.put('/:id/verify', async (req, res) => {
  try {
    const { status, verified_by, notes, site_checked, site_inspection_notes } = req.body;
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid property id' });
    
    let propertyStatus = 'active';
    let verified = true;

    if (status === 'rejected') { propertyStatus = 'inactive'; verified = false; }
    else if (status === 'suspended') { propertyStatus = 'suspended'; verified = false; }
    else if (status === 'approved' || status === 'verified') { propertyStatus = 'active'; verified = true; }

    const property = await Properties.findByIdAndUpdate(req.params.id, {
      verified, status: propertyStatus, verification_date: new Date()
    }, { new: true });

    if (!property) return res.status(404).json({ message: 'Property not found' });

    let verifyRecord = await PropertyVerification.findOne({ property_id: req.params.id });
    if (verifyRecord) {
      verifyRecord.verification_status = status;
      verifyRecord.verification_notes = notes;
      verifyRecord.verified_by = isValidId(verified_by) ? verified_by : null;
      verifyRecord.verified_at = new Date();
      verifyRecord.site_checked = site_checked || false;
      verifyRecord.site_inspection_notes = site_inspection_notes || null;
      await verifyRecord.save();
    } else {
      await PropertyVerification.create({
        property_id: req.params.id,
        verification_status: status,
        verification_notes: notes,
        verified_by: isValidId(verified_by) ? verified_by : null,
        verified_at: new Date(),
        site_checked: site_checked || false,
        site_inspection_notes: site_inspection_notes || null
      });
    }

    res.json({ message: `Property ${status} successfully`, status: propertyStatus });

    const userId = property.owner_id || property.broker_id;
    if (userId) {
      const user = await Users.findById(userId);
      if (user) {
        try {
          await Notifications.create({
            user_id: userId, title: 'Property Verification', 
            message: `Your property "${property.title}" has been ${status}.`, type: status === 'approved' ? 'success' : 'error'
          });
          const html = `<h2>Verification Update</h2><p>Your property <strong>"${property.title}"</strong> has been ${status}.</p>`;
          await emailService.sendEmail(user.email, `Property Verification Update: ${property.title}`, html);
        } catch(e) {}
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create property
router.post('/', async (req, res) => {
  try {
    const {
      title, description, price, location, type, status, broker_id, owner_id,
      bedrooms, bathrooms, area, listing_type, address, city, state, zip_code, features,
      latitude, longitude, model_3d_path
    } = req.body;

    if (!title || !price || !location || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    let finalOwnerId = isValidId(owner_id) ? owner_id : null;
    let finalBrokerId = isValidId(broker_id) ? broker_id : null;

    if (req.body.invite_name && req.body.invite_email) {
      const existing = await Users.findOne({ email: req.body.invite_email });
      if (existing) {
        finalOwnerId = existing._id;
      } else {
        const bcrypt = require('bcryptjs');
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newUser = await Users.create({
          name: req.body.invite_name, email: req.body.invite_email, password: hashedPassword, role: 'owner', status: 'active', profile_approved: false
        });
        finalOwnerId = newUser._id;
        try {
          const emailData = emailService.templates.ownerInvitation(req.body.invite_name, title, tempPassword, req.body.invite_email);
          await emailService.sendEmail(req.body.invite_email, emailData.subject, emailData.html);
        } catch(e) {}
      }
    }

    const newProp = await Properties.create({
      title, description, price: parseFloat(price) || 0, location, type, status: status || 'pending',
      broker_id: finalBrokerId, owner_id: finalOwnerId,
      bedrooms: parseFloat(bedrooms) || 0, bathrooms: parseFloat(bathrooms) || 0, area: parseFloat(area) || 0,
      listing_type: listing_type || 'sale', address, city, state, zip_code, features,
      latitude: parseFloat(latitude) || null, longitude: parseFloat(longitude) || null, model_3d_path
    });

    await PropertyVerification.create({ property_id: newProp._id, verification_status: 'pending' });
    res.status(201).json({ id: newProp._id, message: 'Property created successfully' });
  } catch (error) {
    res.status(500).json({ message: `Server error: ${error.message}`, error: error.message });
  }
});

// Update property
router.put('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Properties.findByIdAndUpdate(req.params.id, req.body);
    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete property
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Properties.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get approved properties alias
router.get('/approved', async (req, res) => {
  try {
    const properties = await Properties.aggregate([
      { $match: { status: 'active', verified: true } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'owner' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id', broker_name: '$broker.name', owner_name: '$owner.name',
        image_count: { $size: '$images' }, main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] }
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/broker/:brokerId', async (req, res) => {
  try {
    if (!isValidId(req.params.brokerId)) return res.status(400).json({ message: 'Invalid ID' });
    const properties = await Properties.aggregate([
      { $match: { broker_id: new mongoose.Types.ObjectId(req.params.brokerId) } },
      { $lookup: { from: 'users', localField: 'broker_id', foreignField: '_id', as: 'broker' } },
      { $lookup: { from: 'propertyimages', let: { propId: '$_id' }, pipeline: [ { $match: { $expr: { $eq: ['$property_id', '$$propId'] } } }, { $project: { _id: 1 } } ], as: 'images' } },
      { $unwind: { path: '$broker', preserveNullAndEmptyArrays: true } },
      { $addFields: {
        id: '$_id', broker_name: '$broker.name',
        image_count: { $size: '$images' }, main_image: { $ifNull: ['$main_image', { $arrayElemAt: ['$images.image_url', 0] }] }
      }},
      { $sort: { created_at: -1 } }
    ]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/video-link', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Properties.findByIdAndUpdate(req.params.id, { video_url: req.body.video_url });
    res.json({ message: 'Video link updated', video_url: req.body.video_url });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id/video', (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => { if (err) return res.status(400).json({ message: err.message }); next(); });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video provided' });
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Properties.findByIdAndUpdate(req.params.id, { video_url: req.file.path });
    res.json({ message: 'Video uploaded', video_url: req.file.path });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id/video', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    await Properties.findByIdAndUpdate(req.params.id, { $unset: { video_url: 1 } });
    res.json({ message: 'Video deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    const property = await Properties.findById(req.params.id).lean();
    if (!property) return res.status(404).json({ message: 'Property not found' });
    
    let broker_name = null, owner_name = null;
    if (property.broker_id) { const b = await Users.findById(property.broker_id); if (b) broker_name = b.name; }
    if (property.owner_id) { const o = await Users.findById(property.owner_id); if (o) owner_name = o.name; }
    
    const images = await PropertyImages.find({ property_id: req.params.id }).sort({ image_type: 1, created_at: 1 }).lean();
    const verification = await PropertyVerification.findOne({ property_id: req.params.id }).sort({ created_at: -1 }).lean();

    res.json({ ...property, id: property._id, broker_name, owner_name, images, verification });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
