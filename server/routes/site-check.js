const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const siteCheckUploadDir = path.join(__dirname, '../uploads/site-checks');
const legalDocsUploadDir = path.join(__dirname, '../uploads/legal-documents');
if (!fs.existsSync(siteCheckUploadDir)) fs.mkdirSync(siteCheckUploadDir, { recursive: true });
if (!fs.existsSync(legalDocsUploadDir)) fs.mkdirSync(legalDocsUploadDir, { recursive: true });

// Multer config for site check photos
const siteCheckStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, siteCheckUploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `sitecheck_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Multer config for legal documents
const legalDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, legalDocsUploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `legaldoc_${Date.now()}_${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadSitePhoto = multer({ storage: siteCheckStorage, limits: { fileSize: 50 * 1024 * 1024 } });
const uploadLegalDoc = multer({ storage: legalDocStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Haversine formula: calculate distance between two GPS points ───
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Audit log helper ───
async function logAudit(propertyId, action, performedBy, performerRole, details) {
  try {
    await db.query(
      'INSERT INTO verification_audit_log (property_id, action, performed_by, performer_role, details) VALUES (?, ?, ?, ?, ?)',
      [propertyId, action, performedBy, performerRole, typeof details === 'string' ? details : JSON.stringify(details)]
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
//  SITE CHECK ENDPOINTS
// ════════════════════════════════════════════════════════════════

// POST /start — Property Admin starts a site check
router.post('/start', uploadSitePhoto.single('photo'), async (req, res) => {
  try {
    const { property_id, inspector_id, inspector_lat, inspector_lng } = req.body;

    if (!property_id || !inspector_id || !inspector_lat || !inspector_lng) {
      return res.status(400).json({ message: 'Missing required fields: property_id, inspector_id, inspector_lat, inspector_lng' });
    }

    // Get property coordinates
    const [property] = await db.query('SELECT id, title, latitude, longitude FROM properties WHERE id = ?', [property_id]);
    if (property.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const prop = property[0];
    const propLat = parseFloat(prop.latitude);
    const propLng = parseFloat(prop.longitude);

    if (!propLat || !propLng) {
      return res.status(400).json({ message: 'Property has no GPS coordinates set. Please update the property with latitude/longitude first.' });
    }

    // Calculate distance
    const distance = haversineDistance(
      parseFloat(inspector_lat), parseFloat(inspector_lng),
      propLat, propLng
    );

    const withinRadius = distance <= 100; // 100 meters

    // Photo URL
    const photoUrl = req.file ? `/uploads/site-checks/${req.file.filename}` : null;

    // Save site check record
    const [result] = await db.query(
      `INSERT INTO site_checks (property_id, inspector_id, inspector_gps_lat, inspector_gps_lng, property_lat, property_lng, distance_meters, within_radius, photo_url, photo_timestamp, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        property_id, inspector_id,
        parseFloat(inspector_lat), parseFloat(inspector_lng),
        propLat, propLng,
        Math.round(distance * 100) / 100,
        withinRadius,
        photoUrl,
        'pending'
      ]
    );

    // Log audit
    await logAudit(property_id, 'site_check_started', inspector_id, 'property_admin', {
      distance_meters: Math.round(distance * 100) / 100,
      within_radius: withinRadius,
      has_photo: !!photoUrl
    });

    // Send notification to all system admins
    try {
      const [admins] = await db.query("SELECT id FROM users WHERE role IN ('system_admin', 'admin')");
      const [inspector] = await db.query('SELECT name FROM users WHERE id = ?', [inspector_id]);
      const inspectorName = inspector.length > 0 ? inspector[0].name : 'Unknown';

      for (const admin of admins) {
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [
            admin.id,
            '📍 New Site Check Submitted',
            `${inspectorName} submitted a site check for property "${prop.title}" (${Math.round(distance)}m from property). ${withinRadius ? '✅ Within radius' : '⚠️ Outside radius'}`,
            withinRadius ? 'info' : 'warning'
          ]
        );
      }
    } catch (notifErr) {
      console.error('Site check notification error:', notifErr.message);
    }

    res.status(201).json({
      id: result.insertId,
      message: withinRadius
        ? `✅ Site check submitted successfully! You are ${Math.round(distance)}m from the property (within allowed radius).`
        : `⚠️ Site check submitted but you are ${Math.round(distance)}m from the property (outside 100m radius). Admin review required.`,
      distance: Math.round(distance * 100) / 100,
      within_radius: withinRadius
    });

  } catch (error) {
    console.error('Start site check error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /property/:propertyId — Get site checks for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const [checks] = await db.query(
      `SELECT sc.*, u.name as inspector_name, u.email as inspector_email,
              ru.name as reviewer_name
       FROM site_checks sc
       LEFT JOIN users u ON sc.inspector_id = u.id
       LEFT JOIN users ru ON sc.reviewed_by = ru.id
       WHERE sc.property_id = ?
       ORDER BY sc.created_at DESC`,
      [req.params.propertyId]
    );
    res.json(checks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /all — System Admin gets all site checks
router.get('/all', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT sc.*, u.name as inspector_name, u.email as inspector_email,
             ru.name as reviewer_name, p.title as property_title, p.location as property_location
      FROM site_checks sc
      LEFT JOIN users u ON sc.inspector_id = u.id
      LEFT JOIN users ru ON sc.reviewed_by = ru.id
      LEFT JOIN properties p ON sc.property_id = p.id
    `;
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE sc.status = ?';
      params.push(status);
    }
    query += ' ORDER BY sc.created_at DESC';

    const [checks] = await db.query(query, params);
    res.json(checks);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /stats — Get site check stats
router.get('/stats', async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as count FROM site_checks');
    const [pending] = await db.query("SELECT COUNT(*) as count FROM site_checks WHERE status = 'pending'");
    const [approved] = await db.query("SELECT COUNT(*) as count FROM site_checks WHERE status = 'approved'");
    const [rejected] = await db.query("SELECT COUNT(*) as count FROM site_checks WHERE status = 'rejected'");
    const [recheckRequested] = await db.query("SELECT COUNT(*) as count FROM site_checks WHERE status = 'recheck_requested'");
    const [pendingDocs] = await db.query("SELECT COUNT(*) as count FROM legal_documents WHERE status = 'pending'");

    res.json({
      total: total[0].count,
      pending: pending[0].count,
      approved: approved[0].count,
      rejected: rejected[0].count,
      recheck_requested: recheckRequested[0].count,
      pending_documents: pendingDocs[0].count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /:id/review — System Admin reviews site check
router.put('/:id/review', async (req, res) => {
  try {
    const { status, admin_comment, reviewed_by } = req.body;

    if (!['approved', 'rejected', 'recheck_requested'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: approved, rejected, or recheck_requested' });
    }

    await db.query(
      'UPDATE site_checks SET status = ?, admin_comment = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, admin_comment || null, reviewed_by, req.params.id]
    );

    // Get site check info for notification
    const [check] = await db.query(
      `SELECT sc.*, p.title as property_title FROM site_checks sc
       LEFT JOIN properties p ON sc.property_id = p.id WHERE sc.id = ?`,
      [req.params.id]
    );

    if (check.length > 0) {
      const sc = check[0];

      // Log audit
      await logAudit(sc.property_id, `site_check_${status}`, reviewed_by, 'system_admin', {
        site_check_id: req.params.id,
        comment: admin_comment
      });

      // Notify the inspector
      const statusLabels = { approved: '✅ Approved', rejected: '❌ Rejected', recheck_requested: '🔄 Re-check Requested' };
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [
          sc.inspector_id,
          `Site Check ${statusLabels[status]}`,
          `Your site check for "${sc.property_title}" has been ${status.replace('_', ' ')}. ${admin_comment ? 'Comment: ' + admin_comment : ''}`,
          status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'warning'
        ]
      );

      // Check if property should be fully verified (both site check + legal docs approved)
      if (status === 'approved') {
        await checkFullVerification(sc.property_id);
      }
    }

    res.json({ message: `Site check ${status} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  LEGAL DOCUMENT ENDPOINTS
// ════════════════════════════════════════════════════════════════

// POST /legal-documents — Upload a legal document
router.post('/legal-documents', uploadLegalDoc.single('document'), async (req, res) => {
  try {
    const { property_id, uploaded_by, document_type } = req.body;

    if (!property_id || !uploaded_by || !document_type || !req.file) {
      return res.status(400).json({ message: 'Missing required fields: property_id, uploaded_by, document_type, and document file' });
    }

    const validTypes = ['title_deed', 'ownership_document', 'id_card'];
    if (!validTypes.includes(document_type)) {
      return res.status(400).json({ message: 'Invalid document_type. Must be: title_deed, ownership_document, or id_card' });
    }

    const documentUrl = `/uploads/legal-documents/${req.file.filename}`;

    const [result] = await db.query(
      `INSERT INTO legal_documents (property_id, uploaded_by, document_type, document_url, original_filename, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [property_id, uploaded_by, document_type, documentUrl, req.file.originalname]
    );

    // Log audit
    await logAudit(property_id, 'document_uploaded', uploaded_by, 'property_admin', {
      document_type,
      filename: req.file.originalname
    });

    // Notify system admins
    try {
      const [admins] = await db.query("SELECT id FROM users WHERE role IN ('system_admin', 'admin')");
      const [prop] = await db.query('SELECT title FROM properties WHERE id = ?', [property_id]);
      const propTitle = prop.length > 0 ? prop[0].title : `#${property_id}`;
      const typeLabels = { title_deed: 'Title Deed', ownership_document: 'Ownership Document', id_card: 'ID Card' };

      for (const admin of admins) {
        await db.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
          [admin.id, '📄 New Legal Document', `A ${typeLabels[document_type]} was uploaded for property "${propTitle}". Review required.`, 'info']
        );
      }
    } catch (notifErr) {
      console.error('Legal doc notification error:', notifErr.message);
    }

    res.status(201).json({ id: result.insertId, message: 'Document uploaded successfully', url: documentUrl });
  } catch (error) {
    console.error('Upload legal document error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /legal-documents/:propertyId — Get legal documents for a property
router.get('/legal-documents/:propertyId', async (req, res) => {
  try {
    const [docs] = await db.query(
      `SELECT ld.*, u.name as uploader_name, ru.name as reviewer_name
       FROM legal_documents ld
       LEFT JOIN users u ON ld.uploaded_by = u.id
       LEFT JOIN users ru ON ld.reviewed_by = ru.id
       WHERE ld.property_id = ?
       ORDER BY ld.created_at DESC`,
      [req.params.propertyId]
    );
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /legal-documents-all — System Admin gets all legal documents
router.get('/legal-documents-all', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT ld.*, u.name as uploader_name, ru.name as reviewer_name,
             p.title as property_title, p.location as property_location
      FROM legal_documents ld
      LEFT JOIN users u ON ld.uploaded_by = u.id
      LEFT JOIN users ru ON ld.reviewed_by = ru.id
      LEFT JOIN properties p ON ld.property_id = p.id
    `;
    const params = [];
    if (status && status !== 'all') {
      query += ' WHERE ld.status = ?';
      params.push(status);
    }
    query += ' ORDER BY ld.created_at DESC';

    const [docs] = await db.query(query, params);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /legal-documents/:id/review — System Admin reviews a legal document
router.put('/legal-documents/:id/review', async (req, res) => {
  try {
    const { status, admin_comment, reviewed_by } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be: verified or rejected' });
    }

    await db.query(
      'UPDATE legal_documents SET status = ?, admin_comment = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [status, admin_comment || null, reviewed_by, req.params.id]
    );

    const [doc] = await db.query(
      `SELECT ld.*, p.title as property_title FROM legal_documents ld
       LEFT JOIN properties p ON ld.property_id = p.id WHERE ld.id = ?`,
      [req.params.id]
    );

    if (doc.length > 0) {
      const d = doc[0];
      const typeLabels = { title_deed: 'Title Deed', ownership_document: 'Ownership Document', id_card: 'ID Card' };

      await logAudit(d.property_id, `document_${status}`, reviewed_by, 'system_admin', {
        document_id: req.params.id,
        document_type: d.document_type,
        comment: admin_comment
      });

      // Notify uploader
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [
          d.uploaded_by,
          `Document ${status === 'verified' ? '✅ Verified' : '❌ Rejected'}`,
          `Your ${typeLabels[d.document_type]} for "${d.property_title}" has been ${status}. ${admin_comment ? 'Comment: ' + admin_comment : ''}`,
          status === 'verified' ? 'success' : 'error'
        ]
      );

      // Check full verification if approved
      if (status === 'verified') {
        await checkFullVerification(d.property_id);
      }
    }

    res.json({ message: `Document ${status} successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  VERIFICATION STATUS & AUDIT LOG
// ════════════════════════════════════════════════════════════════

// GET /verification-status/:propertyId — Combined verification status
router.get('/verification-status/:propertyId', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;

    // Latest site check
    const [siteChecks] = await db.query(
      "SELECT status FROM site_checks WHERE property_id = ? ORDER BY created_at DESC LIMIT 1",
      [propertyId]
    );

    // Legal documents status
    const [docs] = await db.query(
      "SELECT document_type, status FROM legal_documents WHERE property_id = ?",
      [propertyId]
    );

    const siteCheckStatus = siteChecks.length > 0 ? siteChecks[0].status : 'not_started';

    const docStatuses = {};
    for (const d of docs) {
      docStatuses[d.document_type] = d.status;
    }

    const allDocsVerified = ['title_deed', 'ownership_document', 'id_card'].every(
      type => docStatuses[type] === 'verified'
    );

    const fullyVerified = siteCheckStatus === 'approved' && allDocsVerified;

    res.json({
      property_id: propertyId,
      site_check_status: siteCheckStatus,
      documents: docStatuses,
      all_documents_verified: allDocsVerified,
      fully_verified: fullyVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /audit-log/:propertyId — Audit trail
router.get('/audit-log/:propertyId', async (req, res) => {
  try {
    const [logs] = await db.query(
      `SELECT val.*, u.name as performer_name
       FROM verification_audit_log val
       LEFT JOIN users u ON val.performed_by = u.id
       WHERE val.property_id = ?
       ORDER BY val.created_at DESC`,
      [req.params.propertyId]
    );
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── Helper: check if property should be fully verified ───
async function checkFullVerification(propertyId) {
  try {
    const [siteChecks] = await db.query(
      "SELECT status FROM site_checks WHERE property_id = ? AND status = 'approved' LIMIT 1",
      [propertyId]
    );

    const [docs] = await db.query(
      "SELECT document_type, status FROM legal_documents WHERE property_id = ?",
      [propertyId]
    );

    const docStatuses = {};
    for (const d of docs) {
      docStatuses[d.document_type] = d.status;
    }

    const siteCheckApproved = siteChecks.length > 0;
    const allDocsVerified = ['title_deed', 'ownership_document', 'id_card'].every(
      type => docStatuses[type] === 'verified'
    );

    if (siteCheckApproved && allDocsVerified) {
      // Mark property as fully verified
      await db.query(
        "UPDATE properties SET verified = TRUE, status = 'active', verification_date = NOW() WHERE id = ?",
        [propertyId]
      );

      // Update property_verification table
      const [existing] = await db.query('SELECT id FROM property_verification WHERE property_id = ?', [propertyId]);
      if (existing.length > 0) {
        await db.query(
          "UPDATE property_verification SET verification_status = 'approved', verified_at = NOW() WHERE property_id = ?",
          [propertyId]
        );
      } else {
        await db.query(
          "INSERT INTO property_verification (property_id, verification_status, verified_at) VALUES (?, 'approved', NOW())",
          [propertyId]
        );
      }

      await logAudit(propertyId, 'property_fully_verified', null, 'system', {
        reason: 'Site check approved and all legal documents verified'
      });

      // Notify property owner/broker
      const [prop] = await db.query('SELECT title, owner_id, broker_id FROM properties WHERE id = ?', [propertyId]);
      if (prop.length > 0) {
        const notifyUserId = prop[0].owner_id || prop[0].broker_id;
        if (notifyUserId) {
          await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [notifyUserId, '🎉 Property Fully Verified!', `Your property "${prop[0].title}" has been fully verified (site check + legal documents). It is now active and visible to buyers.`, 'success']
          );
        }
      }
    }
  } catch (e) {
    console.error('checkFullVerification error:', e.message);
  }
}

// Error handling middleware for Multer and other errors in this router
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    return res.status(413).json({ message: `File upload error: ${err.message}. Please upload a smaller file.` });
  } else if (err) {
    // An unknown error occurred when uploading.
    console.error('Site Check Router Error:', err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
  next();
});

module.exports = router;
