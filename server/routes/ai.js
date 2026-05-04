const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// =============================================
// AI Price Prediction Engine using Scikit-Learn Python
// with JavaScript fallback using CSV dataset
// =============================================

// ---- JavaScript Fallback Engine ----
// Pre-compute lookup tables from the CSV so predictions work even if Python fails
let fallbackData = null;

function loadFallbackData() {
    try {
        const csvPath = path.join(__dirname, '../../ML price/dataset for sale 1.csv');
        if (!fs.existsSync(csvPath)) {
            console.warn('[AI] Fallback CSV not found at:', csvPath);
            return;
        }
        const raw = fs.readFileSync(csvPath, 'utf8');
        const lines = raw.trim().split('\n').map(l => l.replace(/\r/g, ''));
        const headers = lines[0].split(',');

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length < headers.length) continue;
            const row = {};
            headers.forEach((h, idx) => { row[h.trim()] = cols[idx]?.trim(); });
            rows.push(row);
        }

        // Build lookup: { location -> { bedrooms -> { avgPricePerSqm, count } } }
        const lookup = {};
        let globalSum = 0, globalCount = 0;

        rows.forEach(r => {
            const loc = (r.location_name || '').toLowerCase();
            const price = parseFloat(r.price) || 0;
            const size = parseFloat(r.size_m2) || 1;
            const beds = parseInt(r.bedrooms) || 0;
            const bedKey = beds >= 3 ? '3+' : String(beds);
            const pricePerSqm = price / size;

            if (!lookup[loc]) lookup[loc] = {};
            if (!lookup[loc][bedKey]) lookup[loc][bedKey] = { sum: 0, count: 0 };
            lookup[loc][bedKey].sum += pricePerSqm;
            lookup[loc][bedKey].count += 1;

            globalSum += pricePerSqm;
            globalCount += 1;
        });

        // Compute averages
        const avgLookup = {};
        for (const loc of Object.keys(lookup)) {
            avgLookup[loc] = {};
            for (const bed of Object.keys(lookup[loc])) {
                avgLookup[loc][bed] = lookup[loc][bed].sum / lookup[loc][bed].count;
            }
        }

        const globalAvg = globalCount > 0 ? globalSum / globalCount : 15000;

        fallbackData = { avgLookup, globalAvg };
        console.log('[AI] Fallback data loaded from CSV:', Object.keys(avgLookup).length, 'locations');
    } catch (err) {
        console.error('[AI] Could not load fallback CSV data:', err.message);
        fallbackData = { avgLookup: {}, globalAvg: 15000 };
    }
}

// Load on startup
loadFallbackData();

function jsFallbackPredict(location, bedrooms, area, modelType) {
    if (!fallbackData) loadFallbackData();

    const locKey = (location || '').toLowerCase().split('(')[0].trim();
    const bedKey = parseInt(bedrooms) >= 3 ? '3+' : String(parseInt(bedrooms) || 1);
    const sqm = parseFloat(area) || 120;

    let pricePerSqm = fallbackData.globalAvg;

    // Try exact match first
    if (fallbackData.avgLookup[locKey] && fallbackData.avgLookup[locKey][bedKey]) {
        pricePerSqm = fallbackData.avgLookup[locKey][bedKey];
    } else if (fallbackData.avgLookup[locKey]) {
        // Average across all bedrooms for this location
        const vals = Object.values(fallbackData.avgLookup[locKey]);
        pricePerSqm = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    // Rent is typically ~0.5-1% of sell price per month
    if (modelType === 'rent') {
        pricePerSqm = pricePerSqm * 0.007; // ~0.7% monthly
    }

    const margin = pricePerSqm * 0.15;
    const totalPrice = pricePerSqm * sqm;

    return {
        success: true,
        predictedPrice: Math.round(pricePerSqm * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100,
        lowEstimate: Math.round(Math.max(pricePerSqm - margin, 0) * sqm * 100) / 100,
        highEstimate: Math.round((pricePerSqm + margin) * sqm * 100) / 100,
        pricePerSqm: Math.round(pricePerSqm * 100) / 100,
        confidence: 75, // Lower confidence for JS fallback
        modelType: modelType || 'sell',
        fallback: true
    };
}

// ---- Python ML Engine ----
const runPythonPrediction = (location, bedrooms, area, modelType) => {
    return new Promise((resolve, reject) => {
        try {
            const aiDir = path.join(__dirname, '../../ML price');
            const scriptPath = path.join(aiDir, 'predict_price.py');

            // Verify directory and script exist
            if (!fs.existsSync(aiDir)) {
                return reject(new Error(`AI directory not found at ${aiDir}`));
            }
            if (!fs.existsSync(scriptPath)) {
                return reject(new Error(`Python script not found at ${scriptPath}`));
            }

            // Try different python commands (common on Windows/Linux)
            const pythonCommands = ['python', 'py', 'python3'];
            let commandToUse = 'python';

            // Heuristic to check available command could be added here, 
            // but spawn will trigger 'error' event if command is not found.
            
            const startProcess = (cmdIndex) => {
                if (cmdIndex >= pythonCommands.length) {
                    return reject(new Error('No python executable found (tried python, py, python3)'));
                }

                const cmd = pythonCommands[cmdIndex];
                const pythonProcess = spawn(cmd, [scriptPath], {
                    cwd: aiDir,
                    timeout: 15000
                });

                let stdout = '';
                let stderr = '';

                const inputData = {
                    location: location || 'Kezira',
                    bedrooms: bedrooms ? bedrooms.toString() : '2',
                    area: parseFloat(area) || 120,
                    model_type: modelType || 'sell'
                };

                pythonProcess.stdin.write(JSON.stringify(inputData));
                pythonProcess.stdin.end();

                pythonProcess.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                pythonProcess.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                pythonProcess.on('close', (code) => {
                    if (code !== 0) {
                        console.error(`[AI] Python script (${cmd}) exited with code:`, code);
                        console.error('[AI] Python stderr:', stderr);
                        reject(new Error(`Python processing failed: ${stderr.substring(0, 200)}`));
                        return;
                    }
                    
                    try {
                        const result = JSON.parse(stdout);
                        if (!result.success) {
                            reject(new Error(result.error || 'Prediction failed'));
                            return;
                        }
                        resolve(result);
                    } catch (e) {
                        console.error('[AI] JSON Parse Error. stdout:', stdout);
                        reject(new Error('Failed to parse Python output'));
                    }
                });

                pythonProcess.on('error', (err) => {
                    if (err.code === 'ENOENT') {
                        // Try next command
                        startProcess(cmdIndex + 1);
                    } else {
                        console.error('[AI] Process error:', err.message);
                        reject(err);
                    }
                });
            };

            startProcess(0);
        } catch (error) {
            reject(error);
        }
    });
};

// ---- Combined prediction: try Python first, fallback to JS ----
const predict = async (location, bedrooms, area, modelType) => {
    try {
        const result = await runPythonPrediction(location, bedrooms, area, modelType);
        return result;
    } catch (pyError) {
        console.warn('[AI] Python prediction failed, using JS fallback:', pyError.message);
        return jsFallbackPredict(location, bedrooms, area, modelType);
    }
};

// GET /api/ai/predict - Predict property price via Python Model (with JS fallback)
router.get('/predict', async (req, res) => {
    try {
        const { location_name, bedrooms, size_m2, prediction_type } = req.query;
        // prediction_type could be 'sell' or 'rent'
        const typeStr = prediction_type && prediction_type.toLowerCase().includes('rent') ? 'rent' : 'sell';

        const pyResult = await predict(
            location_name, 
            bedrooms, 
            size_m2, 
            typeStr
        );

        // Normalize response from predict_price.py vs old script
        const totalPrice = pyResult.predicted_price || pyResult.totalPrice || 0;
        const lowEstimate = pyResult.low_estimate || pyResult.lowEstimate || (totalPrice * 0.85);
        const highEstimate = pyResult.high_estimate || pyResult.highEstimate || (totalPrice * 1.15);

        res.json({
            predictedPrice: Math.round(totalPrice),
            lowEstimate: Math.round(lowEstimate),
            highEstimate: Math.round(highEstimate),
            currency: 'ETB',
            pricePerSqm: pyResult.pricePerSqm || Math.round(totalPrice / (parseFloat(size_m2) || 120)),
            confidence: pyResult.confidence || 85,
            modelType: pyResult.listing_type || pyResult.modelType || typeStr,
            modelName: pyResult.fallback ? 'Statistical Fallback Engine' : (pyResult.model_name || 'RandomForest ML Engine'),
            accuracyR2: pyResult.confidence || 85,
            fallback: !!pyResult.fallback,
            location_stats: pyResult.location_stats || {}
        });
    } catch (error) {
        res.status(500).json({ message: 'Prediction error', error: error.message });
    }
});

// POST /api/ai/predict-property - ML Price Prediction using RandomForest from ML price/ datasets
router.post('/predict-property', async (req, res) => {
    try {
        const {
            latitude, longitude, location_name,
            bedrooms, bathrooms, property_type, condition,
            near_school, near_hospital, near_market,
            parking, security_rating, listing_type, size_m2
        } = req.body;

        // Validate minimum required fields
        if (!bedrooms && !location_name) {
            return res.status(400).json({
                success: false,
                message: 'At least bedrooms or location_name is required'
            });
        }

        const inputData = {
            latitude: parseFloat(latitude) || 9.6009,
            longitude: parseFloat(longitude) || 41.8596,
            location_name: location_name || 'Kezira',
            bedrooms: parseInt(bedrooms) || 2,
            bathrooms: parseInt(bathrooms) || 1,
            property_type: (property_type || 'apartment').toLowerCase(),
            condition: (condition || 'good').toLowerCase(),
            near_school: near_school ? 1 : 0,
            near_hospital: near_hospital ? 1 : 0,
            near_market: near_market ? 1 : 0,
            parking: parking ? 1 : 0,
            security_rating: parseInt(security_rating) || 3,
            listing_type: (listing_type || 'sale').toLowerCase() === 'rent' ? 'rent' : 'sale',
            size_m2: parseFloat(size_m2) || 120
        };

        // Try ML prediction via Python script first
        const mlPriceDir = path.join(__dirname, '../../ML price');
        const scriptPath = path.join(mlPriceDir, 'predict_price.py');

        if (fs.existsSync(scriptPath)) {
            try {
                const mlResult = await new Promise((resolve, reject) => {
                    const pythonCommands = ['python', 'py', 'python3'];
                    
                    const trySpawn = (index) => {
                        if (index >= pythonCommands.length) {
                            return reject(new Error('No python executable found'));
                        }
                        
                        const cmd = pythonCommands[index];
                        const proc = spawn(cmd, [scriptPath], {
                            cwd: mlPriceDir,
                            timeout: 30000
                        });

                        let stdout = '';
                        let stderr = '';

                        proc.stdin.write(JSON.stringify(inputData));
                        proc.stdin.end();

                        proc.stdout.on('data', (data) => { stdout += data.toString(); });
                        proc.stderr.on('data', (data) => { stderr += data.toString(); });

                        proc.on('close', (code) => {
                            if (code !== 0) {
                                reject(new Error(`Python exited with code ${code}: ${stderr}`));
                            } else {
                                try {
                                    resolve(JSON.parse(stdout));
                                } catch (e) {
                                    reject(new Error(`Failed to parse ML output: ${stdout}`));
                                }
                            }
                        });

                        proc.on('error', (err) => {
                            if (err.code === 'ENOENT') {
                                trySpawn(index + 1);
                            } else {
                                reject(err);
                            }
                        });
                    };
                    
                    trySpawn(0);
                });

                if (mlResult.success) {
                    return res.json({
                        success: true,
                        predicted_price: Math.round(mlResult.total_price || mlResult.predicted_price),
                        low_estimate: Math.round(mlResult.low_estimate),
                        high_estimate: Math.round(mlResult.high_estimate),
                        price_per_sqm: Math.round(mlResult.final_price_per_sqm || mlResult.predicted_price_per_sqm),
                        gis_price_per_sqm: Math.round(mlResult.gis_adjusted_price_per_sqm),
                        ml_base_price_per_sqm: Math.round(mlResult.predicted_price_per_sqm),
                        amenity_multiplier: mlResult.amenity_multiplier,
                        distance_to_center: mlResult.distance_to_center_km,
                        neighborhood_avg: mlResult.neighborhood_avg_price,
                        confidence: mlResult.confidence,
                        listing_type: mlResult.listing_type,
                        model_name: mlResult.model_name || 'Hybrid ML+GIS RandomForest',
                        dataset_size: mlResult.dataset_size,
                        location_stats: mlResult.location_stats || {},
                        is_ml: true,
                        is_gis: true,
                        currency: 'ETB'
                    });
                }
            } catch (pyError) {
                console.warn('[AI] ML price prediction failed, falling back to CSV engine:', pyError.message);
            }
        }

        // Fallback to JS CSV-based prediction
        const listingType = inputData.listing_type === 'rent' ? 'rent' : 'sell';
        const fallbackResult = jsFallbackPredict(
            inputData.location_name,
            inputData.bedrooms,
            size_m2 || 120,
            listingType
        );

        return res.json({
            success: true,
            predicted_price: Math.round(fallbackResult.totalPrice),
            low_estimate: Math.round(fallbackResult.lowEstimate),
            high_estimate: Math.round(fallbackResult.highEstimate),
            confidence: fallbackResult.confidence,
            listing_type: inputData.listing_type,
            model_name: 'Statistical Fallback Engine',
            dataset_size: 0,
            location_stats: {},
            is_ml: false,
            is_gis: false,
            price_per_sqm: Math.round(fallbackResult.totalPrice / (parseFloat(size_m2) || 120)),
            ml_base_price_per_sqm: Math.round(fallbackResult.totalPrice / (parseFloat(size_m2) || 120)),
            gis_price_per_sqm: 0,
            amenity_multiplier: 1.0,
            distance_to_center: 0,
            neighborhood_avg: 0,
            currency: 'ETB'
        });

    } catch (error) {
        console.error('[AI] Prediction error:', error);
        res.status(500).json({
            success: false,
            message: 'Prediction error',
            error: error.message
        });
    }
});

// GET /api/ai/fraud-check - Check for potentially fraudulent pricing
router.get('/fraud-check', async (req, res) => {
    try {
        const listedPrice = parseFloat(req.query.price);
        const { location_name, bedrooms, size_m2 } = req.query;
        // Always assume 'sell' model for fraud check unless specified
        const pyResult = await predict(location_name, bedrooms, size_m2, 'sell');
        
        const predictedPrice = pyResult.totalPrice;

        if (!listedPrice || listedPrice <= 0) {
            return res.status(400).json({ message: 'Please provide a valid price parameter' });
        }

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
        } else if (absDeviation > 15) {
            riskLevel = 'low';
            riskScore = 30;
            alerts.push(`Price deviates ${Math.round(absDeviation)}% from market value - minor discrepancy`);
        } else {
            riskLevel = 'safe';
            riskScore = 5;
            alerts.push('Price is within normal market range');
        }

        if (deviation < -40) {
            alerts.push('⚠️ Price is significantly below market - potential bait listing');
        }
        if (deviation > 40) {
            alerts.push('⚠️ Price is significantly above market - potential overvaluation');
        }

        res.json({
            listedPrice: Math.round(listedPrice),
            predictedPrice: Math.round(predictedPrice),
            deviation: Math.round(deviation * 10) / 10,
            riskLevel,
            riskScore,
            alerts,
            recommendation: riskLevel === 'safe' ? 'This listing appears to be fairly priced.' :
                riskLevel === 'low' ? 'Minor price discrepancy detected. Consider a second review.' :
                riskLevel === 'medium' ? 'Significant price discrepancy. Manual verification recommended.' :
                'High risk detected! Immediate investigation required.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Fraud check error', error: error.message });
    }
});

// Provide a mock model-info for the frontend widgets that might depend on it
router.get('/model-info', (req, res) => {
    res.json({
        modelType: 'Scikit-Learn Gradient Boosting Pipeline',
        datasetSource: 'Dire Dawa Real Estate Dataset',
        datasetSize: 60,
        accuracyPercent: 85,
        mae: 0,
        locations: ['Kezira', 'Sabian', 'Goro', 'Addis Ketema', 'Melka Jebdu', 'Industrial Zone'],
        propertyTypes: ['House', 'Apartment', 'Commercial', 'Villa', 'Land', 'Shop', 'Office', 'Warehouse'],
        conditions: ['Excellent', 'Good', 'Fair'],
        status: 'ready'
    });
});

// Export the predict function for direct use by other routes
router.predict = predict;
router.runPythonPrediction = runPythonPrediction;

module.exports = router;

