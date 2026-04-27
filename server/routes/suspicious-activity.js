const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Helper: Get the AI model's predict function from the ai.js module
let aiModule = null;
const getAIModule = () => {
  if (!aiModule) {
    try {
      aiModule = require('./ai');
    } catch (e) {
      console.error('Failed to load AI module:', e.message);
    }
  }
  return aiModule;
};

// GET /api/suspicious-activity/scan - Scan all properties for suspicious pricing
router.get('/scan', async (req, res) => {
  try {
    const ai = getAIModule();
    if (!ai || !ai.predict) {
      return res.status(500).json({ message: 'AI Engine unavailable' });
    }

    // Fetch all properties from database
    const [properties] = await db.query(`
      SELECT p.*, u.name as owner_name, b.name as broker_name,
        (SELECT image_url FROM property_images WHERE property_id = p.id AND image_type = 'main' LIMIT 1) as main_image,
        pv.verification_status
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN users b ON p.broker_id = b.id AND b.role = 'broker'
      LEFT JOIN property_verification pv ON p.id = pv.property_id
      ORDER BY p.created_at DESC
    `);

    // Check each property against AI prediction directly
    const suspiciousProperties = [];
    const typeMap = { 
      apartment: 'Apartment', 
      villa: 'Villa', 
      house: 'House', 
      land: 'Land', 
      commercial: 'Commercial', 
      shop: 'Shop' 
    };

    // Use Promise.all to run predictions in parallel for much better performance
    // However, to avoid overwhelming the system with too many spawned processes, 
    // we'll process in chunks of 5
    const CHUNK_SIZE = 5;
    for (let i = 0; i < properties.length; i += CHUNK_SIZE) {
      const chunk = properties.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (property) => {
        if (!property.price || property.price <= 0) return;

        try {
          const locationName = (property.location || '').split(',')[0].trim() || 'Kezira';
          const propertyType = typeMap[property.type] || property.type || 'House';
          
          // CALL DIRECTLY - No HTTP overhead, no socket leak
          const pyResult = await ai.predict(
            locationName,
            property.bedrooms || 2,
            property.area || 120,
            'sell'
          );

          const predictedPrice = pyResult.totalPrice;
          const listedPrice = property.price;
          const deviation = ((listedPrice - predictedPrice) / predictedPrice) * 100;
          const absDeviation = Math.abs(deviation);

          let riskLevel = 'low';
          let riskScore = 15;
          let alerts = [];

          if (absDeviation > 50) {
            riskLevel = 'high';
            riskScore = 90;
            alerts.push(`Price deviates ${Math.round(absDeviation)}% from market value - very suspicious`);
          } else if (absDeviation > 30) {
            riskLevel = 'medium';
            riskScore = 60;
            alerts.push(`Price deviates ${Math.round(absDeviation)}% from market value - warrants investigation`);
          }

          if (riskLevel === 'high' || riskLevel === 'medium') {
            suspiciousProperties.push({
              ...property,
              riskLevel,
              riskScore,
              deviation: Math.round(deviation * 10) / 10,
              predictedPrice: Math.round(predictedPrice),
              alerts,
              recommendation: riskLevel === 'high' ? 'High risk detected! Immediate investigation required.' : 'Significant price discrepancy. Manual verification recommended.'
            });
          }
        } catch (aiError) {
          console.error(`AI direct check failed for property ${property.id}:`, aiError.message);
        }
      }));
    }

    // Sort by risk score (highest first)
    suspiciousProperties.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      total: suspiciousProperties.length,
      totalProperties: properties.length,
      properties: suspiciousProperties,
      scannedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error scanning for suspicious activity:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/suspicious-activity/count - Quick count of suspicious properties
router.get('/count', async (req, res) => {
  try {
    const ai = getAIModule();
    if (!ai || !ai.predict) {
      return res.json({ count: 0, total: 0 });
    }

    const [properties] = await db.query(`
      SELECT p.id, p.price, p.area, p.bedrooms, p.type, p.location
      FROM properties p
      WHERE p.price > 0
    `);

    let suspiciousCount = 0;
    const typeMap = { 
      apartment: 'Apartment', 
      villa: 'Villa', 
      house: 'House', 
      land: 'Land', 
      commercial: 'Commercial', 
      shop: 'Shop' 
    };

    // Process in chunks to avoid overwhelming the system
    const CHUNK_SIZE = 5;
    for (let i = 0; i < properties.length; i += CHUNK_SIZE) {
      const chunk = properties.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (property) => {
        try {
          const locationName = (property.location || '').split(',')[0].trim() || 'Kezira';
          const propertyType = typeMap[property.type] || property.type || 'House';

          const pyResult = await ai.predict(
            locationName,
            property.bedrooms || 2,
            property.area || 120,
            'sell'
          );

          const predictedPrice = pyResult.totalPrice;
          const deviation = Math.abs(((property.price - predictedPrice) / predictedPrice) * 100);

          if (deviation > 30) {
            suspiciousCount++;
          }
        } catch (aiError) {
          // Skip failed checks
        }
      }));
    }

    res.json({ count: suspiciousCount, total: properties.length });

  } catch (error) {
    console.error('Error counting suspicious activity:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;

