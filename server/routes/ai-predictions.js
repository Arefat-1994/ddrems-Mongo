const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to AI folder
const AI_FOLDER = path.join(__dirname, '../../AI');

// Middleware: Verify user authentication
const verifyUser = (req, res, next) => {
  const userId = req.query.userId || req.body.userId;
  if (!userId) {
    return res.status(401).json({ 
      message: 'Unauthorized - User ID required', 
      success: false
    });
  }
  req.userId = parseInt(userId);
  next();
};

// Helper function to run Python script
const runPythonScript = (scriptName, args) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [path.join(AI_FOLDER, scriptName), ...args], {
      cwd: AI_FOLDER,
      timeout: 30000
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${stderr}`));
      } else {
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      }
    });

    pythonProcess.on('error', (err) => {
      reject(err);
    });
  });
};

// ============================================================================
// PHASE 5: Customer Dashboard AI Integration
// ============================================================================

// Get AI price prediction for a property
router.post('/predict-price', verifyUser, async (req, res) => {
  try {
    const {
      size_m2,
      bedrooms,
      bathrooms,
      distance_to_center_km,
      near_school,
      near_hospital,
      near_market,
      parking,
      security_rating,
      property_type,
      condition,
      location_name
    } = req.body;

    // Validate required fields
    if (!size_m2 || !bedrooms || !bathrooms) {
      return res.status(400).json({
        message: 'Missing required fields: size_m2, bedrooms, bathrooms',
        success: false
      });
    }

    // Prepare features for prediction
    const features = {
      size_m2: parseInt(size_m2) || 120,
      bedrooms: parseInt(bedrooms) || 2,
      bathrooms: parseInt(bathrooms) || 1,
      distance_to_center_km: parseFloat(distance_to_center_km) || 3,
      distance_to_market_km: 1.2,
      distance_to_railway_km: 3.1,
      distance_to_main_road_km: 0.5,
      near_school: near_school ? 1 : 0,
      near_hospital: near_hospital ? 1 : 0,
      near_market: near_market ? 1 : 0,
      parking: parking ? 1 : 0,
      security_rating: parseInt(security_rating) || 3,
      property_type: property_type || 'Apartment',
      condition: condition || 'Good',
      location_name: location_name || 'Kezira'
    };

    // Create Python script to make prediction
    const predictionScript = `
import sys
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

try:
    # Load models
    model = joblib.load('dire_dawa_price_model.pkl')
    scaler = joblib.load('scaler.pkl')
    feature_names = joblib.load('feature_names.pkl')
    metrics = joblib.load('model_metrics.pkl')
    
    # Get features from stdin
    features_json = sys.stdin.read()
    features = json.loads(features_json)
    
    # Create DataFrame
    df = pd.DataFrame([features])
    
    # Ensure all required features exist
    for col in feature_names:
        if col not in df.columns:
            df[col] = 0
    
    df = df[feature_names]
    
    # Scale features
    df_scaled = scaler.transform(df)
    
    # Make prediction
    predicted_price = model.predict(df_scaled)[0]
    
    # Calculate confidence
    mae = metrics.get('mae', 0)
    confidence = max(0, min(100, (1 - (mae / predicted_price)) * 100)) if predicted_price > 0 else 0
    
    # Prepare response
    result = {
        'success': True,
        'predicted_price': float(predicted_price),
        'confidence': float(confidence),
        'mae': float(mae),
        'model_accuracy': float(metrics.get('r2', 0) * 100),
        'features_used': len(feature_names)
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({
        'success': False,
        'error': str(e)
    }))
    sys.exit(1)
`;

    // Write script to temp file
    const tempScript = path.join(AI_FOLDER, 'temp_predict.py');
    fs.writeFileSync(tempScript, predictionScript);

    // Run prediction
    const pythonProcess = spawn('python', [tempScript], {
      cwd: AI_FOLDER,
      timeout: 10000
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdin.write(JSON.stringify(features));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempScript);
      } catch (e) {
        // Ignore cleanup errors
      }

      if (code !== 0) {
        return res.status(500).json({
          message: 'AI prediction failed',
          error: stderr,
          success: false
        });
      }

      try {
        const result = JSON.parse(stdout);
        if (result.success) {
          res.json({
            ...result,
            success: true
          });
        } else {
          res.status(500).json({
            message: 'AI prediction error',
            error: result.error,
            success: false
          });
        }
      } catch (e) {
        res.status(500).json({
          message: 'Failed to parse AI response',
          error: e.message,
          success: false
        });
      }
    });

    pythonProcess.on('error', (err) => {
      res.status(500).json({
        message: 'AI service error',
        error: err.message,
        success: false
      });
    });

  } catch (error) {
    console.error('Error in AI prediction:', error);
    res.status(500).json({
      message: 'Server error during AI prediction',
      error: error.message,
      success: false
    });
  }
});

// ============================================================================
// PHASE 5: Get AI Advice for Customer
// ============================================================================

router.post('/get-advice', verifyUser, async (req, res) => {
  try {
    const { role, stats } = req.body;

    if (!role) {
      return res.status(400).json({
        message: 'Role is required',
        success: false
      });
    }

    // Prepare role data
    const roleData = {
      stats: stats || {
        properties: { total: 0, avg_price: 0, total_views: 0 },
        users: { total: 0, active: 0 },
        profiles: { pending: 0 },
        pending: { total: 0 },
        verified: { total: 0 },
        transactions: { total_commission: 0 }
      }
    };

    // Create Python script to get advice
    const adviceScript = `
import sys
import json
import joblib
from pathlib import Path

# Import the AI Advice Engine
sys.path.insert(0, '.')
from ai_advice_engine import AIAdviceEngine

try:
    # Get input
    input_data = sys.stdin.read()
    data = json.loads(input_data)
    
    role = data.get('role', 'user')
    role_data = data.get('role_data', {})
    
    # Initialize engine
    engine = AIAdviceEngine()
    
    # Get advice
    advice = engine.get_advice(role, role_data)
    
    print(json.dumps(advice))
    
except Exception as e:
    print(json.dumps({
        'error': str(e),
        'title': 'AI Advice Unavailable',
        'description': 'The AI advice engine encountered an error.',
        'recommendations': ['Please try again later'],
        'metrics': {},
        'alerts': [{'type': 'error', 'message': str(e)}]
    }))
    sys.exit(1)
`;

    // Write script to temp file
    const tempScript = path.join(AI_FOLDER, 'temp_advice.py');
    fs.writeFileSync(tempScript, adviceScript);

    // Run advice engine
    const pythonProcess = spawn('python', [tempScript], {
      cwd: AI_FOLDER,
      timeout: 10000
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdin.write(JSON.stringify({
      role: role,
      role_data: roleData
    }));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempScript);
      } catch (e) {
        // Ignore cleanup errors
      }

      try {
        const advice = JSON.parse(stdout);
        res.json({
          ...advice,
          success: true
        });
      } catch (e) {
        res.status(500).json({
          message: 'Failed to parse AI advice',
          error: e.message,
          success: false
        });
      }
    });

    pythonProcess.on('error', (err) => {
      res.status(500).json({
        message: 'AI service error',
        error: err.message,
        success: false
      });
    });

  } catch (error) {
    console.error('Error getting AI advice:', error);
    res.status(500).json({
      message: 'Server error getting AI advice',
      error: error.message,
      success: false
    });
  }
});

// ============================================================================
// PHASE 6: Get Property Recommendations
// ============================================================================

router.post('/get-recommendations', verifyUser, async (req, res) => {
  try {
    const {
      budget_min,
      budget_max,
      property_type,
      location,
      bedrooms,
      bathrooms,
      preferences
    } = req.body;

    // Validate budget
    if (!budget_min || !budget_max) {
      return res.status(400).json({
        message: 'Budget range is required',
        success: false
      });
    }

    // Create recommendation based on preferences
    const recommendations = {
      budget_min: parseInt(budget_min),
      budget_max: parseInt(budget_max),
      property_type: property_type || 'apartment',
      location: location || 'Kezira',
      bedrooms: parseInt(bedrooms) || 2,
      bathrooms: parseInt(bathrooms) || 1,
      preferences: preferences || {},
      recommendations: [
        {
          title: 'Location Insights',
          description: 'Kezira is a high-demand area with good appreciation potential',
          score: 85
        },
        {
          title: 'Price Recommendation',
          description: `Properties in your budget range (${budget_min/1000000}M - ${budget_max/1000000}M ETB) are fairly priced`,
          score: 78
        },
        {
          title: 'Property Type',
          description: `${property_type} properties are in high demand in this area`,
          score: 82
        },
        {
          title: 'Investment Potential',
          description: 'This property has good rental income potential',
          score: 75
        }
      ],
      next_steps: [
        'Request property access key',
        'Review property documents',
        'Schedule property viewing',
        'Request agreement'
      ]
    };

    res.json({
      ...recommendations,
      success: true
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      message: 'Server error getting recommendations',
      error: error.message,
      success: false
    });
  }
});

module.exports = router;
