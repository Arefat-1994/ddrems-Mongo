const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all properties (with main image from property_images table)
router.get('/', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
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

// Get only ACTIVE properties (for customers)
router.get('/active', async (req, res) => {
  try {
    const [properties] = await db.query(`
      SELECT p.*, b.name as broker_name, u.name as owner_name,
        (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as image_count,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image,
        COALESCE(p.views, 0) as views
      FROM properties p 
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.status = 'active'
      ORDER BY p.views DESC, p.created_at DESC
    `);
    res.json(properties);
  } catch (error) {
    console.error('Get active properties error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get property stats for admin dashboard
router.get('/stats', async (req, res) => {
  try {
    const [total] = await db.query('SELECT COUNT(*) as count FROM properties');
    const [active] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'active'");
    const [pending] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'pending'");
    const [sold] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'sold'");
    const [rented] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'rented'");
    const [inactive] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'inactive'");
    const [suspended] = await db.query("SELECT COUNT(*) as count FROM properties WHERE status = 'suspended'");
    const [verified] = await db.query("SELECT COUNT(*) as count FROM properties WHERE verified = TRUE");
    const [unverified] = await db.query("SELECT COUNT(*) as count FROM properties WHERE verified = FALSE");

    // Type distribution
    const [types] = await db.query(`
      SELECT type, COUNT(*) as count 
      FROM properties 
      GROUP BY type
    `);

    // Listing type distribution
    const [listings] = await db.query(`
      SELECT listing_type, COUNT(*) as count 
      FROM properties 
      GROUP BY listing_type
    `);

    // Monthly Revenue (from agreements)
    const [revenue] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        SUM(amount) / 1000000 as amount
      FROM agreements
      WHERE status = 'active' OR status = 'completed'
      GROUP BY DATE_FORMAT(created_at, '%b'), MONTH(created_at)
      ORDER BY MONTH(created_at)
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
      brokerPerformance: performance
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
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
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
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image
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
    const { status, verified_by, notes } = req.body;
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
         SET verification_status = ?, verification_notes = ?, verified_by = ?, verified_at = NOW()
         WHERE property_id = ?`,
        [status, notes, verified_by, req.params.id]
      );
    } else {
      // Create new verification record
      await db.query(
        `INSERT INTO property_verification (property_id, verification_status, verification_notes, verified_by, verified_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [req.params.id, status, notes, verified_by]
      );
    }

    res.json({ message: `Property ${status} successfully`, status: propertyStatus });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get property by ID (with images)
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

// Create property
router.post('/', async (req, res) => {
  try {
    const {
      title, description, price, location, type, status, broker_id, owner_id,
      bedrooms, bathrooms, area, listing_type, address, city, state, zip_code, features
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO properties (
        title, description, price, location, type, status, broker_id, owner_id, 
        bedrooms, bathrooms, area, listing_type, address, city, state, zip_code, features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, price, location, type, status || 'pending', broker_id || null, owner_id || null,
        bedrooms || null, bathrooms || null, area || null, listing_type || 'sale',
        address || null, city || null, state || null, zip_code || null,
        features ? JSON.stringify(features) : null
      ]
    );

    // Create a verification record for the new property
    await db.query(
      'INSERT INTO property_verification (property_id, verification_status) VALUES (?, ?)',
      [result.insertId, 'pending']
    );

    res.status(201).json({ id: result.insertId, message: 'Property created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update property
router.put('/:id', async (req, res) => {
  try {
    const { title, description, price, location, type, status, broker_id, bedrooms, bathrooms, area, listing_type } = req.body;
    await db.query(
      `UPDATE properties SET title = ?, description = ?, price = ?, location = ?, type = ?, 
       status = ?, broker_id = ?, bedrooms = ?, bathrooms = ?, area = ?, listing_type = ? WHERE id = ?`,
      [title, description, price, location, type, status, broker_id, bedrooms, bathrooms, area, listing_type || 'sale', req.params.id]
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

module.exports = router;
