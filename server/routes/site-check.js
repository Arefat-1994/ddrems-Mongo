const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { SiteChecks, LegalDocuments, Properties, Users } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Local Storage for Site Checks
const localUploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(localUploadDir)) {
  fs.mkdirSync(localUploadDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, localUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'sitecheck-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadLocal = multer({ storage: localStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ═══════════════════════════════════════════════════════════════
// GET /stats — Aggregate counts for the admin dashboard cards
// ═══════════════════════════════════════════════════════════════
router.get('/stats', async (req, res) => {
  try {
    const [totalChecks, pendingChecks, approvedChecks, rejectedChecks, pendingDocs] = await Promise.all([
      SiteChecks.countDocuments(),
      SiteChecks.countDocuments({ status: 'pending' }),
      SiteChecks.countDocuments({ status: 'approved' }),
      SiteChecks.countDocuments({ status: 'rejected' }),
      LegalDocuments.countDocuments({ status: 'pending' })
    ]);
    res.json({
      total: totalChecks,
      pending: pendingChecks,
      approved: approvedChecks,
      rejected: rejectedChecks,
      pending_documents: pendingDocs
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /all — Fetch all site checks with property + inspector info
// Used by SiteCheckAdmin to display the full review list
// ═══════════════════════════════════════════════════════════════
router.get('/all', async (req, res) => {
  try {
    const matchStage = {};
    if (req.query.status) {
      matchStage.status = req.query.status;
    }

    const siteChecks = await SiteChecks.aggregate([
      { $match: matchStage },
      // Join with properties to get title, location, lat/lng
      {
        $lookup: {
          from: 'properties',
          localField: 'property_id',
          foreignField: '_id',
          as: 'property'
        }
      },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      // Join with users to get inspector name
      {
        $lookup: {
          from: 'users',
          localField: 'inspector_id',
          foreignField: '_id',
          as: 'inspector'
        }
      },
      { $unwind: { path: '$inspector', preserveNullAndEmptyArrays: true } },
      // Join with users to get reviewer name
      {
        $lookup: {
          from: 'users',
          localField: 'reviewed_by',
          foreignField: '_id',
          as: 'reviewer'
        }
      },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
      // Project all fields the frontend needs
      {
        $addFields: {
          id: '$_id',
          property_title: { $ifNull: ['$property.title', 'Unknown Property'] },
          property_location: { $ifNull: ['$property.location', ''] },
          property_lat: { $ifNull: ['$property.latitude', null] },
          property_lng: { $ifNull: ['$property.longitude', null] },
          inspector_name: { $ifNull: ['$inspector.name', 'Unknown'] },
          reviewer_name: { $ifNull: ['$reviewer.name', null] }
        }
      },
      { $sort: { created_at: -1 } }
    ]);

    res.json(siteChecks);
  } catch (error) {
    console.error('Fetch all checks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /legal-documents-all — Fetch ALL legal docs with property + uploader info
// Used by SiteCheckAdmin "Legal Documents" tab
// ═══════════════════════════════════════════════════════════════
router.get('/legal-documents-all', async (req, res) => {
  try {
    const matchStage = {};
    if (req.query.status) {
      matchStage.status = req.query.status;
    }

    const docs = await LegalDocuments.aggregate([
      { $match: matchStage },
      // Join with properties
      {
        $lookup: {
          from: 'properties',
          localField: 'property_id',
          foreignField: '_id',
          as: 'property'
        }
      },
      { $unwind: { path: '$property', preserveNullAndEmptyArrays: true } },
      // Join with users for uploader name
      {
        $lookup: {
          from: 'users',
          localField: 'uploaded_by',
          foreignField: '_id',
          as: 'uploader'
        }
      },
      { $unwind: { path: '$uploader', preserveNullAndEmptyArrays: true } },
      // Join with users for reviewer name
      {
        $lookup: {
          from: 'users',
          localField: 'reviewed_by',
          foreignField: '_id',
          as: 'reviewer'
        }
      },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          id: '$_id',
          property_title: { $ifNull: ['$property.title', 'Unknown Property'] },
          property_location: { $ifNull: ['$property.location', ''] },
          uploader_name: { $ifNull: ['$uploader.name', 'Unknown'] },
          reviewer_name: { $ifNull: ['$reviewer.name', null] }
        }
      },
      { $sort: { created_at: -1 } }
    ]);

    res.json(docs);
  } catch (error) {
    console.error('Fetch all docs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /audit-log/:propertyId — Build a synthetic audit trail
// from site checks + legal docs for a given property
// ═══════════════════════════════════════════════════════════════
router.get('/audit-log/:propertyId', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return res.json([]);

    const pid = new mongoose.Types.ObjectId(propertyId);

    // Get all site checks for this property
    const checks = await SiteChecks.aggregate([
      { $match: { property_id: pid } },
      { $lookup: { from: 'users', localField: 'inspector_id', foreignField: '_id', as: 'inspector' } },
      { $unwind: { path: '$inspector', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'reviewed_by', foreignField: '_id', as: 'reviewer' } },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: 1 } }
    ]);

    // Get all legal docs for this property
    const docs = await LegalDocuments.aggregate([
      { $match: { property_id: pid } },
      { $lookup: { from: 'users', localField: 'uploaded_by', foreignField: '_id', as: 'uploader' } },
      { $unwind: { path: '$uploader', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'users', localField: 'reviewed_by', foreignField: '_id', as: 'reviewer' } },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
      { $sort: { created_at: 1 } }
    ]);

    // Build timeline entries
    const auditLogs = [];

    checks.forEach(check => {
      // Site check started
      auditLogs.push({
        id: check._id + '_started',
        action: 'site_check_started',
        created_at: check.created_at || check.createdAt,
        performer_name: check.inspector?.name || 'Unknown',
        performer_role: 'inspector',
        details: JSON.stringify({
          distance: `${check.distance_meters || 0}m`,
          within_radius: check.within_radius ? 'Yes' : 'No'
        })
      });

      // If reviewed
      if (check.status === 'approved' || check.status === 'rejected' || check.status === 'recheck_requested') {
        auditLogs.push({
          id: check._id + '_reviewed',
          action: `site_check_${check.status}`,
          created_at: check.reviewed_at || check.updatedAt,
          performer_name: check.reviewer?.name || 'Admin',
          performer_role: 'admin',
          details: check.admin_comment ? JSON.stringify({ comment: check.admin_comment }) : null
        });
      }
    });

    docs.forEach(doc => {
      // Document uploaded
      auditLogs.push({
        id: doc._id + '_uploaded',
        action: 'document_uploaded',
        created_at: doc.created_at || doc.createdAt,
        performer_name: doc.uploader?.name || 'Unknown',
        performer_role: 'property_admin',
        details: JSON.stringify({ type: doc.document_type, filename: doc.original_filename })
      });

      // If reviewed
      if (doc.status === 'verified' || doc.status === 'rejected') {
        auditLogs.push({
          id: doc._id + '_reviewed',
          action: `document_${doc.status}`,
          created_at: doc.reviewed_at || doc.updatedAt,
          performer_name: doc.reviewer?.name || 'Admin',
          performer_role: 'admin',
          details: doc.admin_comment ? JSON.stringify({ comment: doc.admin_comment }) : null
        });
      }
    });

    // Sort by date
    auditLogs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    res.json(auditLogs);
  } catch (error) {
    console.error('Audit log error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// GET /verification-status/:propertyId
// ═══════════════════════════════════════════════════════════════
router.get('/verification-status/:propertyId', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return res.json({ site_check_status: 'not_started', all_documents_verified: false, fully_verified: false, documents: {} });

    const siteCheck = await SiteChecks.findOne({ property_id: propertyId }).sort({ created_at: -1 }).lean();
    const legalDocs = await LegalDocuments.find({ property_id: propertyId }).lean();

    const documents = {};
    legalDocs.forEach(d => { documents[d.document_type] = d.status; });

    const all_documents_verified = legalDocs.length >= 3 && legalDocs.every(d => d.status === 'verified');
    const site_check_status = siteCheck ? siteCheck.status : 'not_started';

    res.json({
      site_check_status,
      all_documents_verified,
      fully_verified: site_check_status === 'approved' && all_documents_verified,
      documents
    });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ═══════════════════════════════════════════════════════════════
// GET /property/:propertyId — Fetch site checks for one property
// Used by SiteCheckManager to show previous checks
// ═══════════════════════════════════════════════════════════════
router.get('/property/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const siteChecks = await SiteChecks.aggregate([
      { $match: { property_id: new mongoose.Types.ObjectId(req.params.propertyId) } },
      { $lookup: { from: 'users', localField: 'inspector_id', foreignField: '_id', as: 'inspector' } },
      { $unwind: { path: '$inspector', preserveNullAndEmptyArrays: true } },
      { $addFields: { id: '$_id', inspector_name: { $ifNull: ['$inspector.name', 'Unknown'] } } },
      { $sort: { created_at: -1 } }
    ]);
    res.json(siteChecks);
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ═══════════════════════════════════════════════════════════════
// POST /start — Submit a new site check (local file upload)
// ═══════════════════════════════════════════════════════════════
router.post('/start', uploadLocal.single('photo'), async (req, res) => {
  try {
    const { property_id, inspector_id, inspector_gps_lat, inspector_gps_lng, within_radius, distance_meters } = req.body;
    let photo_url = '';
    if (req.file) photo_url = `/uploads/${req.file.filename}`;

    // Also grab property lat/lng to store alongside
    let property_lat = null, property_lng = null;
    if (mongoose.Types.ObjectId.isValid(property_id)) {
      const prop = await Properties.findById(property_id).select('latitude longitude').lean();
      if (prop) {
        property_lat = prop.latitude;
        property_lng = prop.longitude;
      }
    }

    const siteCheck = await SiteChecks.create({
      property_id,
      inspector_id,
      inspector_gps_lat: parseFloat(inspector_gps_lat) || 0,
      inspector_gps_lng: parseFloat(inspector_gps_lng) || 0,
      property_lat,
      property_lng,
      distance_meters: parseFloat(distance_meters) || 0,
      within_radius: within_radius === 'true' || within_radius === true,
      photo_url,
      photo_timestamp: new Date(),
      status: 'pending',
      created_at: new Date()
    });
    res.json({ message: 'Site check started successfully', success: true, id: siteCheck._id });
  } catch (error) {
    console.error('Site check start error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUT /:id/review — Admin reviews a site check
// ═══════════════════════════════════════════════════════════════
router.put('/:id/review', async (req, res) => {
  try {
    const { status, admin_comment, reviewed_by } = req.body;
    await SiteChecks.findByIdAndUpdate(req.params.id, {
      status,
      admin_comment,
      reviewed_by: mongoose.Types.ObjectId.isValid(reviewed_by) ? new mongoose.Types.ObjectId(reviewed_by) : reviewed_by,
      reviewed_at: new Date()
    });
    res.json({ message: 'Site check reviewed', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ═══════════════════════════════════════════════════════════════
// POST /legal-documents — Upload a legal document (local)
// ═══════════════════════════════════════════════════════════════
router.post('/legal-documents', uploadLocal.single('document'), async (req, res) => {
  try {
    const { property_id, uploaded_by, document_type, original_filename } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded', success: false });

    const doc = await LegalDocuments.create({
      property_id, uploaded_by, document_type,
      original_filename: original_filename || req.file.originalname,
      document_url: `/uploads/${req.file.filename}`,
      status: 'pending',
      created_at: new Date()
    });
    res.json({ message: 'Legal document uploaded', success: true, id: doc._id });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ═══════════════════════════════════════════════════════════════
// GET /legal-documents/:propertyId — Legal docs for one property
// ═══════════════════════════════════════════════════════════════
router.get('/legal-documents/:propertyId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.propertyId)) return res.json([]);
    const docs = await LegalDocuments.find({ property_id: req.params.propertyId }).lean();
    res.json(docs.map(d => ({ ...d, id: d._id })));
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PUT /legal-documents/:id/review — Admin reviews a legal document
// ═══════════════════════════════════════════════════════════════
router.put('/legal-documents/:id/review', async (req, res) => {
  try {
    const { status, admin_comment, reviewed_by } = req.body;
    await LegalDocuments.findByIdAndUpdate(req.params.id, {
      status,
      admin_comment,
      reviewed_by: mongoose.Types.ObjectId.isValid(reviewed_by) ? new mongoose.Types.ObjectId(reviewed_by) : reviewed_by,
      reviewed_at: new Date()
    });
    res.json({ message: 'Document reviewed', success: true });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

module.exports = router;
