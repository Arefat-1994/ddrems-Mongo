const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware: Verify user authentication
const verifyUser = (req, res, next) => {
  const userId = req.query.userId || req.body.user_id || req.headers['x-user-id'] || req.params.userId;
  if (!userId) {
    return res.status(401).json({ 
      message: 'Unauthorized - User ID required', 
      success: false,
      code: 'AUTH_REQUIRED'
    });
  }
  req.user = { id: parseInt(userId) };
  next();
};

// Get all properties with map data (for markers on the map)
router.get('/map-data', async (req, res) => {
  try {
    // First try to get properties WITH coordinates
    let [result] = await db.query(`
      SELECT 
        p.id, 
        p.title, 
        p.description, 
        p.price, 
        p.type, 
        p.latitude, 
        p.longitude, 
        p.location,
        p.address,
        p.bedrooms,
        p.bathrooms,
        p.area,
        p.main_image,
        p.listing_type,
        p.status,
        p.created_at,
        u.name as owner_name
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      WHERE p.latitude IS NOT NULL 
      AND p.longitude IS NOT NULL
      AND p.status = 'active'
      ORDER BY p.created_at DESC
    `);

    // If no geo-located properties, return all active properties for the sidebar list
    if (!result || result.length === 0) {
      [result] = await db.query(`
        SELECT 
          p.id, 
          p.title, 
          p.description, 
          p.price, 
          p.type, 
          p.latitude, 
          p.longitude, 
          p.location,
          p.address,
          p.bedrooms,
          p.bathrooms,
          p.area,
          p.main_image,
          p.listing_type,
          p.status,
          p.created_at,
          u.name as owner_name
        FROM properties p
        LEFT JOIN users u ON p.owner_id = u.id
        WHERE p.status = 'active'
        ORDER BY p.created_at DESC
      `);
    }

    res.json(result || []);
  } catch (error) {
    console.error('Error fetching map data:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// Get location analysis for Dire Dawa
router.get('/location-analysis', async (req, res) => {
  try {
    // Get total properties in Dire Dawa area
    let totalProps;
    try {
      const [rows] = await db.query(`
        SELECT COUNT(*) as count FROM properties 
        WHERE latitude BETWEEN 9.55 AND 9.65 
        AND longitude BETWEEN 41.80 AND 41.92
      `);
      totalProps = rows;
      if (parseInt(totalProps[0]?.count || 0) === 0) {
        const [fallback] = await db.query('SELECT COUNT(*) as count FROM properties');
        totalProps = fallback;
      }
    } catch (e) {
      totalProps = [{ count: 0 }];
    }

    // Get properties by type
    let byType = [];
    try {
      let [rows] = await db.query(`
        SELECT type, COUNT(*) as count, 
          COALESCE(AVG(price), 0) as avg_price,
          COALESCE(MIN(price), 0) as min_price,
          COALESCE(MAX(price), 0) as max_price
        FROM properties 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        GROUP BY type
      `);
      byType = rows;
      if (!byType || byType.length === 0) {
        const [fallback] = await db.query(`
          SELECT type, COUNT(*) as count, 
            COALESCE(AVG(price), 0) as avg_price,
            COALESCE(MIN(price), 0) as min_price,
            COALESCE(MAX(price), 0) as max_price
          FROM properties 
          GROUP BY type
        `);
        byType = fallback;
      }
    } catch (e) {
      console.error('Error in byType query:', e.message);
    }

    // Get average price per area
    let avgPricePerArea = [{ avg_price: 0, avg_area: 0, price_per_sqm: 0 }];
    try {
      const [rows] = await db.query(`
        SELECT 
          COALESCE(ROUND(AVG(price)::numeric, 2), 0) as avg_price,
          COALESCE(ROUND(AVG(area)::numeric, 2), 0) as avg_area,
          CASE 
            WHEN COALESCE(AVG(area), 0) > 0 THEN ROUND((AVG(price / NULLIF(area, 0)))::numeric, 2)
            ELSE 0
          END as price_per_sqm
        FROM properties 
        WHERE area IS NOT NULL AND area > 0
      `);
      avgPricePerArea = rows;
    } catch (e) {
      console.error('Error in price analysis query:', e.message);
    }

    // Get listing type distribution
    let byListingType = [];
    try {
      const [rows] = await db.query(`
        SELECT COALESCE(listing_type, 'sale') as listing_type, COUNT(*) as count
        FROM properties
        GROUP BY COALESCE(listing_type, 'sale')
      `);
      byListingType = rows;
    } catch (e) {
      console.error('Error in listing type query:', e.message);
    }

    // Get recent activity (last 30 days) - PostgreSQL syntax
    let recentActivity = [{ count: 0 }];
    try {
      const [rows] = await db.query(`
        SELECT COUNT(*) as count FROM properties
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      `);
      recentActivity = rows;
    } catch (e) {
      console.error('Error in recent activity query:', e.message);
    }

    // Dire Dawa neighborhood landmarks for reference
    const neighborhoods = [
      { name: 'Kebele 01 (Megala)', lat: 9.5934, lng: 41.8561, description: 'City center / commercial hub' },
      { name: 'Kebele 02 (Ganda Kore)', lat: 9.6015, lng: 41.8502, description: 'Residential area' },
      { name: 'Kebele 04 (Sabiyan)', lat: 9.6108, lng: 41.8480, description: 'Northern residential zone' },
      { name: 'Kebele 06 (Lega Hare)', lat: 9.5870, lng: 41.8650, description: 'Eastern Dire Dawa' },
      { name: 'Dire Dawa University Area', lat: 9.5730, lng: 41.8350, description: 'University & student housing' },
      { name: 'Industrial Zone', lat: 9.6200, lng: 41.8700, description: 'Commercial & industrial properties' },
      { name: 'Train Station Area', lat: 9.5940, lng: 41.8530, description: 'Historic area near railway' },
      { name: 'Kezira', lat: 9.6050, lng: 41.8620, description: 'Traditional market area' }
    ];

    res.json({
      totalProperties: totalProps[0]?.count || 0,
      byType: byType || [],
      priceAnalysis: avgPricePerArea[0] || { avg_price: 0, avg_area: 0, price_per_sqm: 0 },
      byListingType: byListingType || [],
      recentActivity: recentActivity[0]?.count || 0,
      neighborhoods,
      city: 'Dire Dawa',
      region: 'Eastern Ethiopia',
      coordinates: { lat: 9.6009, lng: 41.8596 }
    });
  } catch (error) {
    console.error('Error fetching location analysis:', error);
    res.status(500).json({ error: 'Failed to fetch location analysis' });
  }
});

// Get single property details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [id]
    );
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Add property with map location
router.post('/add-with-location', verifyUser, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      price, 
      type, 
      latitude, 
      longitude, 
      address,
      bedrooms,
      bathrooms,
      area,
      listing_type,
      city
    } = req.body;

    // Create location string from coordinates
    const location = address || `Dire Dawa, ${parseFloat(latitude).toFixed(4)}, ${parseFloat(longitude).toFixed(4)}`;

    const [result] = await db.query(
      `INSERT INTO properties 
       (title, description, price, type, latitude, longitude, location, address, 
        bedrooms, bathrooms, area, listing_type, owner_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)`,
      [title, description, price, type || 'house', latitude, longitude, location, address || location,
       bedrooms || null, bathrooms || null, area || null, listing_type || 'sale', req.user.id]
    );

    // Fetch and return the created property
    const [newProperty] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newProperty[0] || {});
  } catch (error) {
    console.error('Error adding property:', error);
    res.status(500).json({ error: 'Failed to add property', details: error.message });
  }
});

// Update property location
router.put('/:id/location', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;

    const location = address || `${latitude},${longitude}`;

    await db.query(
      `UPDATE properties 
       SET latitude = ?, longitude = ?, location = ?, address = ?
       WHERE id = ?`,
      [latitude, longitude, location, address || location, id]
    );

    const [result] = await db.query(
      'SELECT * FROM properties WHERE id = ?',
      [id]
    );

    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

module.exports = router;
