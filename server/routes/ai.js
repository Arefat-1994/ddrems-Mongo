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
        const csvPath = path.join(__dirname, '../../AI/dire_dawa_real_estate_dataset.csv');
        const raw = fs.readFileSync(csvPath, 'utf8');
        const lines = raw.trim().split('\n').map(l => l.replace(/\r/g, ''));
        const headers = lines[0].split('\t');

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split('\t');
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
            const aiDir = path.join(__dirname, '../../AI');
            const scriptPath = path.join(aiDir, 'predict_bedrooms.py');

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

        res.json({
            predictedPrice: Math.round(pyResult.totalPrice),
            lowEstimate: Math.round(pyResult.lowEstimate),
            highEstimate: Math.round(pyResult.highEstimate),
            currency: 'ETB',
            pricePerSqm: Math.round(pyResult.pricePerSqm),
            confidence: pyResult.confidence,
            modelType: pyResult.modelType,
            modelName: pyResult.fallback ? 'Statistical Fallback Engine' : 'Scikit-Learn Pipeline',
            accuracyR2: pyResult.confidence,
            fallback: !!pyResult.fallback
        });
    } catch (error) {
        res.status(500).json({ message: 'Prediction error', error: error.message });
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

