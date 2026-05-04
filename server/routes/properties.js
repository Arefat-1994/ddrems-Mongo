const express = require('express');
const router = express.Router();
const db = require('../config/db');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer config for property videos (max 10MB)
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'videos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `property_${req.params.id}_${Date.now()}${ext}`);
  }
});
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  }
});

// Get only ACTIVE properties (for customers) - MUST be before /:id routes
router.get('/active', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        COALESCE(p.main_image, (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1)) as main_image,
        COALESCE(p.views, 0) as views
      FROM properties p 
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'active' AND p.verified = TRUE
      ORDER BY p.views DESC, p.created_at DESC
    `);
    console.log('Active properties returned:', properties.length);
    res.json(properties);
  } catch (error) {
    console.error('Get active properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all properties (with main image from property_images table)
router.get('/', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        COALESCE(p.main_image, (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1)) as main_image
      FROM properties p 
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get property stats for admin dashboard
router.get('/stats', async (req, res) => {
  try {
    const { admin_id } = req.query;
    let whereClause = '';
    const params = [];

    if (admin_id && admin_id !== 'undefined' && admin_id !== 'null') {
      whereClause = ' WHERE (property_admin_id = ? OR property_admin_id IS NULL)';
      params.push(admin_id);
    }

    const [total] = await db.query(`SELECT COUNT(*) as count FROM properties${whereClause}`, params);
    const [active] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE status = 'active'${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [pending] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE status = 'pending'${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [sold] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE status = 'sold'${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [rented] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE status = 'rented'${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [inactive] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE status = 'inactive'${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [suspended] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE status = 'suspended'${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [verified] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE verified = TRUE${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);
    const [unverified] = await db.query(`SELECT COUNT(*) as count FROM properties WHERE verified = FALSE${admin_id ? ' AND (property_admin_id = ? OR property_admin_id IS NULL)' : ''}`, admin_id ? [admin_id] : []);

    // Type distribution
    const [types] = await db.query(`
      SELECT type, COUNT(*) as count 
      FROM properties 
      ${whereClause}
      GROUP BY type
    `, params);

    // Listing type distribution
    const [listings] = await db.query(`
      SELECT listing_type, COUNT(*) as count 
      FROM properties 
      GROUP BY listing_type
    `);

    // Monthly Revenue (from agreements)
    const [revenue] = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        SUM(amount) / 1000000 as amount
      FROM agreements
      WHERE status = 'active' OR status = 'completed'
      GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
      ORDER BY EXTRACT(MONTH FROM created_at)
    `);

    // Broker Performance (from integrated users table)
    const [performance] = await db.query(`
      SELECT 
        u.name,
        COUNT(p.id) as count
      FROM users u
      LEFT JOIN properties p ON u.id = p.broker_id
      WHERE u.role = 'broker'
      GROUP BY u.id, u.name
    `);

    // Total Revenue
    const [totalRev] = await db.query(`
      SELECT SUM(amount) as total FROM agreements WHERE status IN ('active', 'completed')
    `);

    // User Distribution by Role
    const [userDist] = await db.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);

    res.json({
      total: total[0].count,
      active: active[0].count,
      pending: pending[0].count,
      sold: sold[0].count,
      rented: rented[0].count,
      inactive: inactive[0].count,
      suspended: suspended[0].count,
      verified: verified[0].count,
      unverified: unverified[0].count,
      totalRevenue: totalRev[0].total || 0,
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
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
      FROM properties p
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      WHERE p.owner_id = ?
      ORDER BY p.created_at DESC
    `, [req.params.userId]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending verification properties
router.get('/pending-verification', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, u.name as owner_name, u.email as owner_email,
        b.name as broker_name, b.email as broker_email,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        COALESCE(p.main_image, (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1)) as main_image
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
    `);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all properties with their verification status (for admin view)
router.get('/all-with-status', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, u.name as owner_name, b.name as broker_name,
        pv.verification_status, pv.verification_notes, pv.verified_at,
        vu.name as verified_by_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        COALESCE(p.main_image, (SELECT image_url FROM property_images WHERE property_id = p.id LIMIT 1)) as main_image
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN property_verification pv ON p.id = pv.property_id
      LEFT JOIN users vu ON pv.verified_by = vu.id
      ORDER BY p.created_at DESC
    `);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get property recommendations for user
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT DISTINCT p.*,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
      FROM properties p
      WHERE p.status = 'active' AND p.verified = TRUE
      ORDER BY p.views DESC, p.created_at DESC
      LIMIT 10
    `);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Verify property (Approve / Reject / Suspend)
router.put('/:id/verify', async (req, res) => {
  try {
    const { status, verified_by, notes, site_checked, site_inspection_notes } = req.body;
    let propertyStatus = 'active';
    let verified = true;

    if (status === 'rejected') {
      propertyStatus = 'inactive';
      verified = false;
    } else if (status === 'suspended') {
      propertyStatus = 'suspended';
      verified = false;
    } else if (status === 'approved' || status === 'verified') {
      propertyStatus = 'active';
      verified = true;
    }

    // Update property status and verified flag
    await db.query(
      'UPDATE properties SET verified = ?, status = ?, verification_date = NOW() WHERE id = ?',
      [verified, propertyStatus, req.params.id]
    );

    // Check if verification record exists
    const [existingVerification] = await db.query(
      'SELECT id FROM property_verification WHERE property_id = ?',
      [req.params.id]
    );

    if (existingVerification.length > 0) {
      // Update existing verification record
      await db.query(
        `UPDATE property_verification 
         SET verification_status = ?, verification_notes = ?, verified_by = ?, verified_at = NOW(),
             site_checked = ?, site_inspection_notes = ?
         WHERE property_id = ?`,
        [status, notes, verified_by, site_checked || false, site_inspection_notes || null, req.params.id]
      );
    } else {
      // Create new verification record
      await db.query(
        `INSERT INTO property_verification (property_id, verification_status, verification_notes, verified_by, verified_at, site_checked, site_inspection_notes)
         VALUES (?, ?, ?, ?, NOW(), ?, ?)`,
        [req.params.id, status, notes, verified_by, site_checked || false, site_inspection_notes || null]
      );
    }

    res.json({ message: `Property ${status} successfully`, status: propertyStatus });

    // Send email notification to owner or broker
    try {
      const [property] = await db.query('SELECT title, owner_id, broker_id FROM properties WHERE id = ?', [req.params.id]);
      if (property.length > 0) {
        const userId = property[0].owner_id || property[0].broker_id;
        if (userId) {
          const [user] = await db.query('SELECT name, email FROM users WHERE id = ?', [userId]);
          if (user.length > 0 && user[0].email) {
            const subject = `Property Verification Update: ${property[0].title}`;
            const html = `
              <h2>Property Verification Update</h2>
              <p>Hello ${user[0].name},</p>
              <p>The verification process for your property <strong>"${property[0].title}"</strong> has been completed.</p>
              <p><strong>Status:</strong> <span style="color: ${status === 'approved' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status.toUpperCase()}</span></p>
              ${notes ? `<p><strong>Notes from Admin:</strong> ${notes}</p>` : ''}
              <p>You can view your property status in your dashboard.</p>
            `;
            await emailService.sendEmail(user[0].email, subject, html);
          }

          // Also create an in-app notification
          await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [userId, 'Property Verification', `Your property "${property[0].title}" has been ${status}.`, status === 'approved' ? 'success' : 'error']
          );
        }
      }
    } catch (emailErr) {
      console.error('Notification failed for property verification:', emailErr);
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

    // Validate required fields
    if (!title || !price || !location || !type) {
      return res.status(400).json({ message: 'Missing required fields: title, price, location, type' });
    }

    let finalOwnerId = owner_id;

    // Handle Owner Invitation if broker is adding for a new owner
    if (req.body.invite_name && req.body.invite_email) {
      const { invite_name, invite_email } = req.body;
      
      // Check if user already exists
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [invite_email]);
      
      if (existing.length > 0) {
        finalOwnerId = existing[0].id;
      } else {
        // Create new user (Owner role, pending_invite status)
        const bcrypt = require('bcryptjs');
        const tempPassword = Math.random().toString(36).slice(-8); // Random 8-char password
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        const [userResult] = await db.query(
          'INSERT INTO users (name, email, password, role, status, profile_approved, profile_completed) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [invite_name, invite_email, hashedPassword, 'owner', 'active', false, false]
        );
        
        finalOwnerId = userResult.insertId;

        // Send Invitation Email
        try {
          const emailData = emailService.templates.ownerInvitation(invite_name, title, tempPassword, invite_email);
          await emailService.sendEmail(invite_email, emailData.subject, emailData.html);
          
          // Add notification for the new owner
          await db.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
            [finalOwnerId, 'Welcome to DDREMS', `A broker has added your property "${title}" and invited you to manage it.`, 'info']
          );
        } catch (emailErr) {
          console.error('Failed to send owner invitation email:', emailErr);
        }
      }
    }

    // Helper to handle numeric inputs safely preventing PostgreSQL 22P02 NaN crashes
    const parseNum = (val) => {
      if (val === '' || val === undefined || val === null || val === 'undefined' || val === 'null') return null;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    };

    const [result] = await db.query(
      `INSERT INTO properties (
        title, description, price, location, type, status, broker_id, owner_id, 
        bedrooms, bathrooms, area, listing_type, address, city, state, zip_code, features, 
        latitude, longitude, model_3d_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        title, description, parseNum(price), location, type, status || 'pending', 
        parseNum(broker_id) || null, parseNum(finalOwnerId) || null,
        parseNum(bedrooms) || null, parseNum(bathrooms) || null, parseNum(area) || null, 
        listing_type || 'sale',
        address || null, city || null, state || null, zip_code || null,
        features ? (typeof features === 'string' ? features : JSON.stringify(features)) : null,
        parseNum(latitude) || null, parseNum(longitude) || null, model_3d_path || null
      ]
    );

    // Create a verification record for the new property (only if it doesn't exist)
    try {
      await db.query(
        'INSERT INTO property_verification (property_id, verification_status, created_at) VALUES (?, ?, NOW())',
        [result.insertId, 'pending']
      );
    } catch (verifyError) {
      // If verification record already exists, that's okay
      console.log('Verification record already exists or error:', verifyError.message);
    }

    res.status(201).json({ id: result.insertId, message: 'Property created successfully' });
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ 
      message: `Server error: ${error.message}`, 
      error: error.message,
      code: error.code
    });
  }
});

// Update property
router.put('/:id', async (req, res) => {
  try {
    const { title, description, price, location, type, status, broker_id, bedrooms, bathrooms, area, listing_type, latitude, longitude, model_3d_path } = req.body;
    await db.query(
      `UPDATE properties SET title = ?, description = ?, price = ?, location = ?, type = ?, 
       status = ?, broker_id = ?, bedrooms = ?, bathrooms = ?, area = ?, listing_type = ?, latitude = ?, longitude = ?, model_3d_path = ? WHERE id = ?`,
      [title, description, price, location, type, status, broker_id, bedrooms, bathrooms, area, listing_type || 'sale', latitude || null, longitude || null, model_3d_path || null, req.params.id]
    );
    res.json({ message: 'Property updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete property
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM properties WHERE id = ?', [req.params.id]);
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get only APPROVED properties (for Browse Properties - all users)
// MUST be before /:id routes to avoid matching as ID
// NOTE: This is an alias for /active - both return active properties
router.get('/approved', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
      FROM properties p 
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'active' AND p.verified = TRUE
      ORDER BY p.created_at DESC
    `);
    res.json(properties);
  } catch (error) {
    console.error('Get approved properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get broker's own properties (My Properties)
// MUST be before /:id routes to avoid matching as ID
router.get('/broker/:brokerId', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
      FROM properties p 
      LEFT JOIN users b ON p.broker_id = b.id
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.broker_id = ?
      ORDER BY p.created_at DESC
    `, [req.params.brokerId]);
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload property video link - owners only
router.put('/:id/video-link', async (req, res) => {
  try {
    const { video_url } = req.body;
    if (!video_url) {
      return res.status(400).json({ message: 'No video link provided' });
    }

    await db.query('UPDATE properties SET video_url = ? WHERE id = ?', [video_url, req.params.id]);

    res.json({ message: 'Video link updated successfully', video_url });
  } catch (error) {
    console.error('Video link update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload property video (max 10MB) - owners only
router.put('/:id/video', (req, res, next) => {
  uploadVideo.single('video')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Video file is too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }

    const videoUrl = `/uploads/videos/${req.file.filename}`;

    // Delete old video file if exists
    try {
      const [existing] = await db.query('SELECT video_url FROM properties WHERE id = ?', [req.params.id]);
      if (existing.length > 0 && existing[0].video_url && existing[0].video_url.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', existing[0].video_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    } catch (e) { /* ignore cleanup errors */ }

    await db.query('UPDATE properties SET video_url = ? WHERE id = ?', [videoUrl, req.params.id]);

    res.json({ message: 'Video uploaded successfully', video_url: `http://${req.headers.host}${videoUrl}` });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete property video
router.delete('/:id/video', async (req, res) => {
  try {
    const [existing] = await db.query('SELECT video_url FROM properties WHERE id = ?', [req.params.id]);
    if (existing.length > 0 && existing[0].video_url && existing[0].video_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', existing[0].video_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.query('UPDATE properties SET video_url = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get property by ID (with images) - MUST be last
router.get('/:id', async (req, res) => {
  try {
    const [property] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count
      FROM properties p
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.id = ?
    `, [req.params.id]);

    if (property.length === 0) {
      return res.status(404).json({ message: 'Property not found' });
    }

    // Also get images
    const [images] = await db.query(
      'SELECT * FROM property_images WHERE property_id = ? ORDER BY image_type, created_at',
      [req.params.id]
    );

    // Get verification status
    const [verification] = await db.query(
      'SELECT * FROM property_verification WHERE property_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.params.id]
    );

    res.json({
      ...property[0],
      images: images,
      verification: verification[0] || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
