const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// =============================================
// AI Price Prediction Engine for Dire Dawa
// Implements multivariate linear regression
// trained on the CSV dataset at startup
// =============================================

let modelData = null;
let datasetStats = null;
let isModelReady = false;

// Parse CSV dataset on module load
function initializeModel() {
    try {
        const csvPath = path.join(__dirname, '..', '..', 'AI', 'dire_dawa_real_estate_dataset.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');

        // Parse tab-separated CSV
        const lines = csvContent.trim().split('\n').map(l => l.replace(/\r/g, ''));
        const headers = lines[0].split('\t').map(h => h.trim());

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            if (values.length !== headers.length) continue;
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx]?.trim();
            });
            rows.push(row);
        }

        console.log(`[AI] Loaded ${rows.length} properties from dataset`);

        // Convert binary columns
        const binaryCols = ['near_school', 'near_hospital', 'near_market', 'parking'];
        rows.forEach(row => {
            binaryCols.forEach(col => {
                row[col] = (row[col] || '').toLowerCase() === 'yes' ? 1 : 0;
            });
        });

        // Encode categorical columns
        const propertyTypes = [...new Set(rows.map(r => r.property_type))].sort();
        const conditions = [...new Set(rows.map(r => r.condition))].sort();
        const locations = [...new Set(rows.map(r => r.location_name))].sort();

        const encoders = {
            property_type: Object.fromEntries(propertyTypes.map((v, i) => [v, i])),
            condition: Object.fromEntries(conditions.map((v, i) => [v, i])),
            location_name: Object.fromEntries(locations.map((v, i) => [v, i]))
        };

        // Feature columns for prediction
        const featureColumns = [
            'size_m2', 'bedrooms', 'bathrooms', 'distance_to_center_km',
            'near_school', 'near_hospital', 'near_market', 'parking',
            'security_rating', 'property_type', 'condition', 'location_name'
        ];

        // Build numeric data matrix
        const numericData = rows.map(row => {
            return {
                features: featureColumns.map(col => {
                    if (col === 'property_type') return encoders.property_type[row[col]] || 0;
                    if (col === 'condition') return encoders.condition[row[col]] || 0;
                    if (col === 'location_name') return encoders.location_name[row[col]] || 0;
                    return parseFloat(row[col]) || 0;
                }),
                price: parseFloat(row.price) || 0,
                raw: row
            };
        }).filter(d => d.price > 0);

        // Compute feature statistics for normalization
        const n = numericData.length;
        const featureCount = featureColumns.length;
        const means = new Array(featureCount).fill(0);
        const stds = new Array(featureCount).fill(0);
        let priceMean = 0;
        let priceStd = 0;

        numericData.forEach(d => {
            d.features.forEach((v, i) => { means[i] += v; });
            priceMean += d.price;
        });
        means.forEach((_, i) => { means[i] /= n; });
        priceMean /= n;

        numericData.forEach(d => {
            d.features.forEach((v, i) => { stds[i] += (v - means[i]) ** 2; });
            priceStd += (d.price - priceMean) ** 2;
        });
        stds.forEach((_, i) => { stds[i] = Math.sqrt(stds[i] / n) || 1; });
        priceStd = Math.sqrt(priceStd / n) || 1;

        // Train multivariate linear regression using normal equation
        // X^T * X * w = X^T * y
        // Normalize features first
        const X = numericData.map(d => {
            const normalized = d.features.map((v, i) => (v - means[i]) / stds[i]);
            return [1, ...normalized]; // Add bias term
        });
        const y = numericData.map(d => (d.price - priceMean) / priceStd);

        const cols = featureCount + 1; // +1 for bias

        // X^T * X
        const XtX = Array.from({ length: cols }, () => new Array(cols).fill(0));
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < cols; j++) {
                for (let k = 0; k < cols; k++) {
                    XtX[j][k] += X[i][j] * X[i][k];
                }
            }
        }

        // Add small regularization for numerical stability
        for (let i = 0; i < cols; i++) {
            XtX[i][i] += 0.01;
        }

        // X^T * y
        const Xty = new Array(cols).fill(0);
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < cols; j++) {
                Xty[j] += X[i][j] * y[i];
            }
        }

        // Solve using Gauss-Jordan elimination
        const augmented = XtX.map((row, i) => [...row, Xty[i]]);
        for (let i = 0; i < cols; i++) {
            let maxRow = i;
            for (let k = i + 1; k < cols; k++) {
                if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
            }
            [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];

            const pivot = augmented[i][i];
            if (Math.abs(pivot) < 1e-10) continue;

            for (let j = i; j <= cols; j++) augmented[i][j] /= pivot;
            for (let k = 0; k < cols; k++) {
                if (k === i) continue;
                const factor = augmented[k][i];
                for (let j = i; j <= cols; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }

        const weights = augmented.map(row => row[cols]);

        // Compute R² score
        let ssRes = 0, ssTot = 0;
        for (let i = 0; i < n; i++) {
            let pred = 0;
            for (let j = 0; j < cols; j++) {
                pred += X[i][j] * weights[j];
            }
            ssRes += (y[i] - pred) ** 2;
            ssTot += y[i] ** 2; // y is already centered
        }
        const r2 = 1 - ssRes / (ssTot || 1);

        // Compute MAE
        let totalAbsError = 0;
        for (let i = 0; i < n; i++) {
            let pred = 0;
            for (let j = 0; j < cols; j++) {
                pred += X[i][j] * weights[j];
            }
            const predPrice = pred * priceStd + priceMean;
            totalAbsError += Math.abs(numericData[i].price - predPrice);
        }
        const mae = totalAbsError / n;

        // Compute feature importance (absolute weight values normalized)
        const absWeights = weights.slice(1).map(Math.abs);
        const maxAbsWeight = Math.max(...absWeights) || 1;
        const featureImportance = featureColumns.map((name, i) => ({
            feature: name,
            importance: absWeights[i] / maxAbsWeight,
            rawWeight: weights[i + 1]
        })).sort((a, b) => b.importance - a.importance);

        // Compute dataset statistics
        const locationStats = {};
        const typeStats = {};
        const conditionStats = {};

        rows.forEach(row => {
            const price = parseFloat(row.price) || 0;
            if (price <= 0) return;

            // Location stats
            const loc = row.location_name;
            if (!locationStats[loc]) locationStats[loc] = { count: 0, totalPrice: 0, prices: [], totalSize: 0 };
            locationStats[loc].count++;
            locationStats[loc].totalPrice += price;
            locationStats[loc].prices.push(price);
            locationStats[loc].totalSize += parseFloat(row.size_m2) || 0;

            // Type stats
            const type = row.property_type;
            if (!typeStats[type]) typeStats[type] = { count: 0, totalPrice: 0, prices: [] };
            typeStats[type].count++;
            typeStats[type].totalPrice += price;
            typeStats[type].prices.push(price);

            // Condition stats
            const cond = row.condition;
            if (!conditionStats[cond]) conditionStats[cond] = { count: 0, totalPrice: 0, prices: [] };
            conditionStats[cond].count++;
            conditionStats[cond].totalPrice += price;
            conditionStats[cond].prices.push(price);
        });

        // Sort prices for percentile calculations
        Object.values(locationStats).forEach(s => s.prices.sort((a, b) => a - b));
        Object.values(typeStats).forEach(s => s.prices.sort((a, b) => a - b));
        Object.values(conditionStats).forEach(s => s.prices.sort((a, b) => a - b));

        modelData = {
            weights,
            means,
            stds,
            priceMean,
            priceStd,
            featureColumns,
            encoders,
            r2,
            mae,
            featureImportance,
            datasetSize: n,
            rows
        };

        datasetStats = {
            locationStats,
            typeStats,
            conditionStats,
            locations: locations,
            propertyTypes: propertyTypes,
            conditions: conditions,
            totalProperties: n,
            avgPrice: priceMean,
            minPrice: Math.min(...numericData.map(d => d.price)),
            maxPrice: Math.max(...numericData.map(d => d.price)),
            priceStd
        };

        isModelReady = true;
        console.log(`[AI] Model trained successfully! R² = ${r2.toFixed(4)}, MAE = ${mae.toFixed(0)} ETB`);
    } catch (error) {
        console.error('[AI] Failed to initialize model:', error.message);
    }
}

// Initialize on module load
initializeModel();

// Helper: predict price for given features
function predictPrice(input) {
    if (!isModelReady) return null;

    const { featureColumns, encoders, weights, means, stds, priceMean, priceStd } = modelData;

    const features = featureColumns.map(col => {
        if (col === 'property_type') return encoders.property_type[input[col]] || 0;
        if (col === 'condition') return encoders.condition[input[col]] || 0;
        if (col === 'location_name') return encoders.location_name[input[col]] || 0;
        return parseFloat(input[col]) || 0;
    });

    const normalized = features.map((v, i) => (v - means[i]) / stds[i]);
    const x = [1, ...normalized];

    let pred = 0;
    for (let j = 0; j < x.length; j++) {
        pred += x[j] * weights[j];
    }

    const price = pred * priceStd + priceMean;
    return Math.max(price, 0);
}

// =============================================
// API ENDPOINTS
// =============================================

// GET /api/ai/predict - Predict property price
router.get('/predict', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ message: 'AI model is not ready yet' });
        }

        const input = {
            size_m2: req.query.size_m2 || 100,
            bedrooms: req.query.bedrooms || 2,
            bathrooms: req.query.bathrooms || 1,
            distance_to_center_km: req.query.distance_to_center_km || 3,
            near_school: req.query.near_school === '1' || req.query.near_school === 'true' ? 1 : 0,
            near_hospital: req.query.near_hospital === '1' || req.query.near_hospital === 'true' ? 1 : 0,
            near_market: req.query.near_market === '1' || req.query.near_market === 'true' ? 1 : 0,
            parking: req.query.parking === '1' || req.query.parking === 'true' ? 1 : 0,
            security_rating: req.query.security_rating || 3,
            property_type: req.query.property_type || 'House',
            condition: req.query.condition || 'Good',
            location_name: req.query.location_name || 'Kezira'
        };

        const predictedPrice = predictPrice(input);

        // Calculate confidence range (±15% based on model accuracy)
        const confidenceMargin = predictedPrice * 0.15;
        const lowEstimate = Math.max(predictedPrice - confidenceMargin, 0);
        const highEstimate = predictedPrice + confidenceMargin;

        // Find comparable properties
        const comparables = modelData.rows
            .filter(r => r.property_type === input.property_type && r.location_name === input.location_name)
            .slice(0, 5)
            .map(r => ({
                price: parseFloat(r.price),
                size_m2: parseFloat(r.size_m2),
                bedrooms: parseInt(r.bedrooms),
                bathrooms: parseInt(r.bathrooms),
                condition: r.condition,
                location: r.location_name
            }));

        res.json({
            predictedPrice: Math.round(predictedPrice),
            lowEstimate: Math.round(lowEstimate),
            highEstimate: Math.round(highEstimate),
            currency: 'ETB',
            pricePerSqm: Math.round(predictedPrice / (parseFloat(input.size_m2) || 100)),
            confidence: Math.round(modelData.r2 * 100),
            comparableProperties: comparables,
            inputUsed: input
        });
    } catch (error) {
        res.status(500).json({ message: 'Prediction error', error: error.message });
    }
});

// GET /api/ai/analytics - Market analytics
router.get('/analytics', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ message: 'AI model is not ready yet' });
        }

        const { locationStats, typeStats, conditionStats } = datasetStats;

        // Format location analytics
        const locationAnalytics = Object.entries(locationStats).map(([name, stats]) => ({
            name,
            count: stats.count,
            avgPrice: Math.round(stats.totalPrice / stats.count),
            avgPricePerSqm: Math.round(stats.totalPrice / stats.totalSize),
            minPrice: stats.prices[0],
            maxPrice: stats.prices[stats.prices.length - 1],
            medianPrice: stats.prices[Math.floor(stats.prices.length / 2)]
        })).sort((a, b) => b.avgPrice - a.avgPrice);

        // Format type analytics
        const typeAnalytics = Object.entries(typeStats).map(([name, stats]) => ({
            name,
            count: stats.count,
            avgPrice: Math.round(stats.totalPrice / stats.count),
            minPrice: stats.prices[0],
            maxPrice: stats.prices[stats.prices.length - 1]
        }));

        // Format condition analytics
        const conditionAnalytics = Object.entries(conditionStats).map(([name, stats]) => ({
            name,
            count: stats.count,
            avgPrice: Math.round(stats.totalPrice / stats.count),
            minPrice: stats.prices[0],
            maxPrice: stats.prices[stats.prices.length - 1]
        }));

        // Price distribution buckets
        const allPrices = modelData.rows.map(r => parseFloat(r.price)).filter(p => p > 0);
        const bucketSize = 1000000; // 1M ETB buckets
        const maxBucket = Math.ceil(Math.max(...allPrices) / bucketSize) * bucketSize;
        const priceDistribution = [];
        for (let i = 0; i < maxBucket; i += bucketSize) {
            const count = allPrices.filter(p => p >= i && p < i + bucketSize).length;
            priceDistribution.push({
                range: `${(i / 1000000).toFixed(1)}M - ${((i + bucketSize) / 1000000).toFixed(1)}M`,
                count
            });
        }

        res.json({
            totalProperties: datasetStats.totalProperties,
            avgPrice: Math.round(datasetStats.avgPrice),
            minPrice: datasetStats.minPrice,
            maxPrice: datasetStats.maxPrice,
            locationAnalytics,
            typeAnalytics,
            conditionAnalytics,
            priceDistribution
        });
    } catch (error) {
        res.status(500).json({ message: 'Analytics error', error: error.message });
    }
});

// GET /api/ai/feature-importance - Feature importance
router.get('/feature-importance', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ message: 'AI model is not ready yet' });
        }

        const featureLabels = {
            size_m2: 'Property Size (m²)',
            bedrooms: 'Number of Bedrooms',
            bathrooms: 'Number of Bathrooms',
            distance_to_center_km: 'Distance to Center (km)',
            near_school: 'Near School',
            near_hospital: 'Near Hospital',
            near_market: 'Near Market',
            parking: 'Has Parking',
            security_rating: 'Security Rating',
            property_type: 'Property Type',
            condition: 'Property Condition',
            location_name: 'Location/Neighborhood'
        };

        const importance = modelData.featureImportance.map(f => ({
            ...f,
            label: featureLabels[f.feature] || f.feature,
            percentage: Math.round(f.importance * 100)
        }));

        res.json({ features: importance });
    } catch (error) {
        res.status(500).json({ message: 'Feature importance error', error: error.message });
    }
});

// GET /api/ai/locations - Location-based pricing
router.get('/locations', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ message: 'AI model is not ready yet' });
        }

        const { locationStats } = datasetStats;

        const locations = Object.entries(locationStats).map(([name, stats]) => {
            const avgPrice = stats.totalPrice / stats.count;
            const avgSize = stats.totalSize / stats.count;

            // Calculate price trend (compare top half vs bottom half by price)
            const midIdx = Math.floor(stats.prices.length / 2);
            const lowerHalf = stats.prices.slice(0, midIdx);
            const upperHalf = stats.prices.slice(midIdx);
            const lowerAvg = lowerHalf.reduce((a, b) => a + b, 0) / (lowerHalf.length || 1);
            const upperAvg = upperHalf.reduce((a, b) => a + b, 0) / (upperHalf.length || 1);

            return {
                name,
                count: stats.count,
                avgPrice: Math.round(avgPrice),
                avgPricePerSqm: Math.round(avgPrice / avgSize),
                avgSize: Math.round(avgSize),
                minPrice: stats.prices[0],
                maxPrice: stats.prices[stats.prices.length - 1],
                medianPrice: stats.prices[Math.floor(stats.prices.length / 2)],
                priceRange: stats.prices[stats.prices.length - 1] - stats.prices[0],
                affordabilityIndex: Math.round((1 - (avgPrice / datasetStats.maxPrice)) * 100)
            };
        }).sort((a, b) => b.avgPrice - a.avgPrice);

        res.json({ locations });
    } catch (error) {
        res.status(500).json({ message: 'Location pricing error', error: error.message });
    }
});

// GET /api/ai/fraud-check - Check for potentially fraudulent pricing
router.get('/fraud-check', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ message: 'AI model is not ready yet' });
        }

        const listedPrice = parseFloat(req.query.price);
        const input = {
            size_m2: req.query.size_m2 || 100,
            bedrooms: req.query.bedrooms || 2,
            bathrooms: req.query.bathrooms || 1,
            distance_to_center_km: req.query.distance_to_center_km || 3,
            near_school: req.query.near_school === '1' || req.query.near_school === 'true' ? 1 : 0,
            near_hospital: req.query.near_hospital === '1' || req.query.near_hospital === 'true' ? 1 : 0,
            near_market: req.query.near_market === '1' || req.query.near_market === 'true' ? 1 : 0,
            parking: req.query.parking === '1' || req.query.parking === 'true' ? 1 : 0,
            security_rating: req.query.security_rating || 3,
            property_type: req.query.property_type || 'House',
            condition: req.query.condition || 'Good',
            location_name: req.query.location_name || 'Kezira'
        };

        if (!listedPrice || listedPrice <= 0) {
            return res.status(400).json({ message: 'Please provide a valid price parameter' });
        }

        const predictedPrice = predictPrice(input);
        const deviation = ((listedPrice - predictedPrice) / predictedPrice) * 100;
        const absDeviation = Math.abs(deviation);

        let riskLevel = 'low';
        let riskScore = 0;
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
            riskScore = 10;
            alerts.push('Price is within normal market range');
        }

        if (deviation < -40) {
            alerts.push('⚠️ Price is significantly below market - potential bait listing');
        }
        if (deviation > 40) {
            alerts.push('⚠️ Price is significantly above market - potential overvaluation');
        }

        // Check size vs price ratio
        const pricePerSqm = listedPrice / (parseFloat(input.size_m2) || 100);
        const avgPricePerSqm = datasetStats.avgPrice / 120; // avg size ~120 m²
        if (pricePerSqm > avgPricePerSqm * 2.5) {
            alerts.push('Price per square meter is unusually high');
            riskScore = Math.min(riskScore + 15, 100);
        }
        if (pricePerSqm < avgPricePerSqm * 0.3) {
            alerts.push('Price per square meter is unusually low');
            riskScore = Math.min(riskScore + 15, 100);
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

// GET /api/ai/model-info - Model metadata
router.get('/model-info', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ message: 'AI model is not ready yet' });
        }

        res.json({
            modelType: 'Multivariate Linear Regression',
            datasetSource: 'Dire Dawa Real Estate Dataset',
            datasetSize: modelData.datasetSize,
            features: modelData.featureColumns,
            featureCount: modelData.featureColumns.length,
            r2Score: Math.round(modelData.r2 * 10000) / 10000,
            accuracyPercent: Math.round(modelData.r2 * 100),
            mae: Math.round(modelData.mae),
            maeCurrency: 'ETB',
            avgPrice: Math.round(modelData.priceMean),
            maePercentOfAvg: Math.round((modelData.mae / modelData.priceMean) * 100 * 10) / 10,
            locations: datasetStats.locations,
            propertyTypes: datasetStats.propertyTypes,
            conditions: datasetStats.conditions,
            status: 'ready',
            trainedAt: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ message: 'Model info error', error: error.message });
    }
});

// GET /api/ai/advice - Role-based AI advice (using Python AI Engine)
router.get('/advice', async (req, res) => {
    try {
        const role = req.query.role || 'user';
        const userId = req.query.userId;
        const db = require('../config/db');
        const AIAdviceService = require('../services/ai-advice-service');

        // Get advice from AI service (which uses Python AI engine)
        const advice = await AIAdviceService.getAdvice(role, userId, db);

        res.json({
            success: true,
            advice
        });
    } catch (error) {
        console.error('[API] AI advice error:', error);
        res.status(500).json({ 
            success: false,
            message: 'AI advice error', 
            error: error.message 
        });
    }
});

// POST /api/ai/get-recommendations - Get AI recommendations based on customer preferences
router.post('/get-recommendations', (req, res) => {
    try {
        if (!isModelReady) {
            return res.status(503).json({ success: false, message: 'AI model is not ready yet' });
        }

        const { budget_min, budget_max, property_type, location, bedrooms, bathrooms, preferences } = req.body;

        // Filter properties matching criteria
        const matchingProperties = modelData.rows.filter(row => {
            const price = parseFloat(row.price);
            const beds = parseInt(row.bedrooms);
            const baths = parseInt(row.bathrooms);
            const type = row.property_type;
            const loc = row.location_name;

            const priceMatch = price >= budget_min && price <= budget_max;
            const typeMatch = !property_type || type === property_type;
            const locMatch = !location || loc === location;
            const bedsMatch = !bedrooms || beds >= bedrooms;
            const bathsMatch = !bathrooms || baths >= bathrooms;

            let amenitiesMatch = true;
            if (preferences) {
                if (preferences.near_school && row.near_school !== 'yes') amenitiesMatch = false;
                if (preferences.near_hospital && row.near_hospital !== 'yes') amenitiesMatch = false;
                if (preferences.near_market && row.near_market !== 'yes') amenitiesMatch = false;
                if (preferences.parking && row.parking !== 'yes') amenitiesMatch = false;
            }

            return priceMatch && typeMatch && locMatch && bedsMatch && bathsMatch && amenitiesMatch;
        });

        // Score properties based on match quality
        const scoredProperties = matchingProperties.map(prop => {
            let score = 50; // Base score

            // Price match bonus
            const priceRange = budget_max - budget_min;
            const propPrice = parseFloat(prop.price);
            const priceDeviation = Math.abs(propPrice - (budget_min + priceRange / 2)) / (priceRange / 2);
            score += Math.max(0, 30 * (1 - priceDeviation));

            // Amenities bonus
            let amenityCount = 0;
            if (preferences) {
                if (preferences.near_school && prop.near_school === 'yes') amenityCount++;
                if (preferences.near_hospital && prop.near_hospital === 'yes') amenityCount++;
                if (preferences.near_market && prop.near_market === 'yes') amenityCount++;
                if (preferences.parking && prop.parking === 'yes') amenityCount++;
            }
            score += amenityCount * 5;

            return {
                ...prop,
                score: Math.min(100, Math.round(score))
            };
        }).sort((a, b) => b.score - a.score).slice(0, 5);

        // Generate recommendations
        const recommendations = scoredProperties.map((prop, idx) => ({
            title: prop.property_type + ' in ' + prop.location_name,
            description: `${prop.bedrooms} bedrooms, ${prop.bathrooms} bathrooms, ${prop.size_m2}m². Price: ${(parseFloat(prop.price) / 1000000).toFixed(2)}M ETB`,
            score: prop.score
        }));

        // Generate next steps
        const nextSteps = [
            'Browse the recommended properties in our listings',
            'Add your favorite properties to favorites',
            'Request access keys to view property documents',
            'Contact property owners for more information',
            'Schedule property viewings'
        ];

        res.json({
            success: true,
            recommendations,
            next_steps: nextSteps,
            total_matches: matchingProperties.length,
            criteria: {
                budget_min,
                budget_max,
                property_type,
                location,
                bedrooms,
                bathrooms
            }
        });
    } catch (error) {
        console.error('[API] Recommendations error:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error generating recommendations', 
            error: error.message 
        });
    }
});

module.exports = router;
