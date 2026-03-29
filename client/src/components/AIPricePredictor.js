import React, { useState, useEffect, useCallback } from 'react';
import './AIPricePredictor.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AIPricePredictor = ({ user }) => {
    const [activeTab, setActiveTab] = useState('predict');
    const [modelInfo, setModelInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Prediction state
    const [predForm, setPredForm] = useState({
        size_m2: 120, bedrooms: 3, bathrooms: 2,
        distance_to_center_km: 2.5, near_school: false,
        near_hospital: false, near_market: false, parking: false,
        security_rating: 3, property_type: 'House',
        condition: 'Good', location_name: 'Kezira'
    });
    const [prediction, setPrediction] = useState(null);
    const [predicting, setPredicting] = useState(false);

    // Analytics state
    const [analytics, setAnalytics] = useState(null);

    // Feature importance state
    const [featureImportance, setFeatureImportance] = useState(null);

    // Location state
    const [locations, setLocations] = useState(null);

    // Fraud detection state
    const [fraudForm, setFraudForm] = useState({
        price: 5000000, size_m2: 120, bedrooms: 3, bathrooms: 2,
        distance_to_center_km: 2.5, near_school: false,
        near_hospital: false, near_market: false, parking: false,
        security_rating: 3, property_type: 'House',
        condition: 'Good', location_name: 'Kezira'
    });
    const [fraudResult, setFraudResult] = useState(null);
    const [checkingFraud, setCheckingFraud] = useState(false);

    const fetchModelInfo = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/ai/model-info`);
            const data = await res.json();
            setModelInfo(data);
            setLoading(false);
        } catch (err) {
            setError('Failed to connect to AI service');
            setLoading(false);
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/ai/analytics`);
            setAnalytics(await res.json());
        } catch (err) { setError('Failed to load analytics'); }
    }, []);

    const fetchImportance = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/ai/feature-importance`);
            setFeatureImportance(await res.json());
        } catch (err) { setError('Failed to load feature importance'); }
    }, []);

    const fetchLocations = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/ai/locations`);
            setLocations(await res.json());
        } catch (err) { setError('Failed to load locations'); }
    }, []);

    // Load model info on mount
    useEffect(() => {
        fetchModelInfo();
    }, [fetchModelInfo]);

    // Load tab data when switching
    useEffect(() => {
        if (activeTab === 'analytics' && !analytics) fetchAnalytics();
        if (activeTab === 'importance' && !featureImportance) fetchImportance();
        if (activeTab === 'locations' && !locations) fetchLocations();
    }, [activeTab, analytics, featureImportance, locations, fetchAnalytics, fetchImportance, fetchLocations]);


    const handlePredict = async () => {
        setPredicting(true);
        setPrediction(null);
        try {
            const params = new URLSearchParams({
                ...predForm,
                near_school: predForm.near_school ? '1' : '0',
                near_hospital: predForm.near_hospital ? '1' : '0',
                near_market: predForm.near_market ? '1' : '0',
                parking: predForm.parking ? '1' : '0',
            });
            const res = await fetch(`${API_BASE}/ai/predict?${params}`);
            setPrediction(await res.json());
        } catch (err) { setError('Prediction failed'); }
        setPredicting(false);
    };

    const handleFraudCheck = async () => {
        setCheckingFraud(true);
        setFraudResult(null);
        try {
            const params = new URLSearchParams({
                ...fraudForm,
                near_school: fraudForm.near_school ? '1' : '0',
                near_hospital: fraudForm.near_hospital ? '1' : '0',
                near_market: fraudForm.near_market ? '1' : '0',
                parking: fraudForm.parking ? '1' : '0',
            });
            const res = await fetch(`${API_BASE}/ai/fraud-check?${params}`);
            setFraudResult(await res.json());
        } catch (err) { setError('Fraud check failed'); }
        setCheckingFraud(false);
    };

    const formatPrice = (p) => {
        if (!p && p !== 0) return '—';
        return new Intl.NumberFormat('en-ET').format(Math.round(p));
    };

    if (loading) {
        return (
            <div className="ai-predictor">
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p>Initializing AI Engine...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'predict', icon: '🎯', label: 'Price Predictor' },
        { id: 'analytics', icon: '📊', label: 'Market Analytics' },
        { id: 'importance', icon: '⚡', label: 'Feature Importance' },
        { id: 'locations', icon: '📍', label: 'Location Pricing' },
        { id: 'fraud', icon: '🛡️', label: 'Fraud Detection' },
    ];

    return (
        <div className="ai-predictor">
            {/* Header */}
            <div className="ai-header">
                <h1>🤖 AI-Powered Real Estate Intelligence</h1>
                <p>Advanced property price prediction & market analysis for Dire Dawa</p>
            </div>

            {/* Model Info Banner */}
            {modelInfo && (
                <div className="model-info-banner">
                    <div className="info-chip">
                        <span className="chip-icon">📚</span>
                        <span>Dataset:</span>
                        <span className="chip-value">{modelInfo.datasetSize} properties</span>
                    </div>
                    <div className="info-chip">
                        <span className="chip-icon">🎯</span>
                        <span>Accuracy:</span>
                        <span className="chip-value">{modelInfo.accuracyPercent}%</span>
                    </div>
                    <div className="info-chip">
                        <span className="chip-icon">📏</span>
                        <span>MAE:</span>
                        <span className="chip-value">{formatPrice(modelInfo.mae)} ETB</span>
                    </div>
                    <div className="info-chip">
                        <span className="chip-icon">🔧</span>
                        <span>Features:</span>
                        <span className="chip-value">{modelInfo.featureCount}</span>
                    </div>
                </div>
            )}

            {error && <div className="error-message">⚠️ {error}</div>}

            {/* Tabs */}
            <div className="ai-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ======= PREDICT TAB ======= */}
            {activeTab === 'predict' && (
                <div className="glass-panel">
                    <h2>🎯 Property Price Prediction</h2>
                    <p style={{ color: '#ffffff', marginBottom: 20, opacity: 0.9 }}>
                        Enter your property details below to get an AI-powered price estimate
                    </p>

                    <div className="prediction-form">
                        <div className="form-group">
                            <label>Size (m²)</label>
                            <input type="number" value={predForm.size_m2}
                                onChange={e => setPredForm({ ...predForm, size_m2: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Bedrooms</label>
                            <input type="number" value={predForm.bedrooms}
                                onChange={e => setPredForm({ ...predForm, bedrooms: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Bathrooms</label>
                            <input type="number" value={predForm.bathrooms}
                                onChange={e => setPredForm({ ...predForm, bathrooms: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Distance to Center (km)</label>
                            <input type="number" step="0.1" value={predForm.distance_to_center_km}
                                onChange={e => setPredForm({ ...predForm, distance_to_center_km: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Security Rating</label>
                            <select value={predForm.security_rating}
                                onChange={e => setPredForm({ ...predForm, security_rating: e.target.value })}>
                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} - {['Very Low', 'Low', 'Medium', 'High', 'Very High'][v - 1]}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Property Type</label>
                            <select value={predForm.property_type}
                                onChange={e => setPredForm({ ...predForm, property_type: e.target.value })}>
                                {(modelInfo?.propertyTypes || ['House', 'Apartment', 'Studio']).map(t =>
                                    <option key={t} value={t}>{t}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Condition</label>
                            <select value={predForm.condition}
                                onChange={e => setPredForm({ ...predForm, condition: e.target.value })}>
                                {(modelInfo?.conditions || ['New', 'Good', 'Old']).map(c =>
                                    <option key={c} value={c}>{c}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <select value={predForm.location_name}
                                onChange={e => setPredForm({ ...predForm, location_name: e.target.value })}>
                                {(modelInfo?.locations || ['Kezira', 'Sabian', 'Goro', 'Addis Ketema', 'Melka Jebdu', 'Industrial Zone']).map(l =>
                                    <option key={l} value={l}>{l}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={predForm.near_school}
                                onChange={e => setPredForm({ ...predForm, near_school: e.target.checked })} />
                            <label>Near School</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={predForm.near_hospital}
                                onChange={e => setPredForm({ ...predForm, near_hospital: e.target.checked })} />
                            <label>Near Hospital</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={predForm.near_market}
                                onChange={e => setPredForm({ ...predForm, near_market: e.target.checked })} />
                            <label>Near Market</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={predForm.parking}
                                onChange={e => setPredForm({ ...predForm, parking: e.target.checked })} />
                            <label>Has Parking</label>
                        </div>

                        <button className={`predict-btn ${predicting ? 'loading' : ''}`} onClick={handlePredict} disabled={predicting}>
                            {predicting ? '⏳ Analyzing...' : '🚀 Predict Price'}
                        </button>
                    </div>

                    {prediction && (
                        <div className="prediction-result">
                            <div className="price-display">
                                <div className="price-label">AI Predicted Price</div>
                                <div className="price-value">{formatPrice(prediction.predictedPrice)}</div>
                                <span className="price-currency">ETB</span>
                                <div className="price-range">
                                    <div className="range-item">
                                        <div className="range-label">Low Estimate</div>
                                        <div className="range-value">{formatPrice(prediction.lowEstimate)} ETB</div>
                                    </div>
                                    <div className="range-item">
                                        <div className="range-label">Confidence</div>
                                        <div className="range-value">{prediction.confidence}%</div>
                                    </div>
                                    <div className="range-item">
                                        <div className="range-label">High Estimate</div>
                                        <div className="range-value">{formatPrice(prediction.highEstimate)} ETB</div>
                                    </div>
                                </div>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon">📐</div>
                                    <div className="stat-value">{formatPrice(prediction.pricePerSqm)}</div>
                                    <div className="stat-label">ETB per m²</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">🏠</div>
                                    <div className="stat-value">{prediction.inputUsed?.size_m2} m²</div>
                                    <div className="stat-label">Property Size</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">🛏️</div>
                                    <div className="stat-value">{prediction.inputUsed?.bedrooms}</div>
                                    <div className="stat-label">Bedrooms</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📍</div>
                                    <div className="stat-value">{prediction.inputUsed?.location_name}</div>
                                    <div className="stat-label">Location</div>
                                </div>
                            </div>

                            {prediction.comparableProperties?.length > 0 && (
                                <>
                                    <h3>🔍 Comparable Properties</h3>
                                    <div className="comparables-grid">
                                        {prediction.comparableProperties.map((comp, i) => (
                                            <div key={i} className="comparable-card">
                                                <div className="comp-price">{formatPrice(comp.price)} ETB</div>
                                                <div className="comp-details">
                                                    <span className="comp-tag">📐 {comp.size_m2} m²</span>
                                                    <span className="comp-tag">🛏️ {comp.bedrooms} bed</span>
                                                    <span className="comp-tag">🚿 {comp.bathrooms} bath</span>
                                                    <span className="comp-tag">📋 {comp.condition}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ======= ANALYTICS TAB ======= */}
            {activeTab === 'analytics' && (
                <div className="glass-panel">
                    <h2>📊 Market Analytics</h2>
                    {!analytics ? (
                        <div className="loading-container"><div className="loading-spinner" /><p>Loading analytics...</p></div>
                    ) : (
                        <>
                            <div className="stats-grid" style={{ marginBottom: 32 }}>
                                <div className="stat-card">
                                    <div className="stat-icon">🏘️</div>
                                    <div className="stat-value">{analytics.totalProperties}</div>
                                    <div className="stat-label">Total Properties</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">💰</div>
                                    <div className="stat-value">{formatPrice(analytics.avgPrice)}</div>
                                    <div className="stat-label">Avg Price (ETB)</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📉</div>
                                    <div className="stat-value">{formatPrice(analytics.minPrice)}</div>
                                    <div className="stat-label">Min Price (ETB)</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📈</div>
                                    <div className="stat-value">{formatPrice(analytics.maxPrice)}</div>
                                    <div className="stat-label">Max Price (ETB)</div>
                                </div>
                            </div>

                            <div className="analytics-section">
                                <h3>📍 Average Price by Location</h3>
                                <div className="bar-chart">
                                    {analytics.locationAnalytics?.map((loc, i) => (
                                        <div key={i} className="bar-row">
                                            <span className="bar-label">{loc.name}</span>
                                            <div className="bar-track">
                                                <div className="bar-fill"
                                                    style={{ width: `${(loc.avgPrice / analytics.maxPrice) * 100}%` }}>
                                                </div>
                                            </div>
                                            <span className="bar-value">{formatPrice(loc.avgPrice)} ETB</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="analytics-section">
                                <h3>🏗️ Average Price by Property Type</h3>
                                <div className="bar-chart">
                                    {analytics.typeAnalytics?.map((type, i) => (
                                        <div key={i} className="bar-row">
                                            <span className="bar-label">{type.name}</span>
                                            <div className="bar-track">
                                                <div className="bar-fill"
                                                    style={{ width: `${(type.avgPrice / analytics.maxPrice) * 100}%` }}>
                                                </div>
                                            </div>
                                            <span className="bar-value">{formatPrice(type.avgPrice)} ETB</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="analytics-section">
                                <h3>🔧 Average Price by Condition</h3>
                                <div className="bar-chart">
                                    {analytics.conditionAnalytics?.map((cond, i) => (
                                        <div key={i} className="bar-row">
                                            <span className="bar-label">{cond.name}</span>
                                            <div className="bar-track">
                                                <div className="bar-fill"
                                                    style={{ width: `${(cond.avgPrice / analytics.maxPrice) * 100}%` }}>
                                                </div>
                                            </div>
                                            <span className="bar-value">{formatPrice(cond.avgPrice)} ETB</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {analytics.priceDistribution?.length > 0 && (
                                <div className="analytics-section">
                                    <h3>📊 Price Distribution</h3>
                                    <div className="distribution-chart">
                                        {analytics.priceDistribution.map((bucket, i) => {
                                            const maxCount = Math.max(...analytics.priceDistribution.map(b => b.count));
                                            const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
                                            return (
                                                <div key={i} className="dist-bar" style={{ height: `${Math.max(height, 4)}%` }}>
                                                    <div className="dist-tooltip">{bucket.range}: {bucket.count} properties</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="dist-labels">
                                        {analytics.priceDistribution.map((bucket, i) => (
                                            <span key={i}>{bucket.range.split(' - ')[0]}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ======= FEATURE IMPORTANCE TAB ======= */}
            {activeTab === 'importance' && (
                <div className="glass-panel">
                    <h2>⚡ Feature Importance</h2>
                    <p style={{ color: '#ffffff', marginBottom: 24, opacity: 0.9 }}>
                        Discover which property features have the most impact on price
                    </p>
                    {!featureImportance ? (
                        <div className="loading-container"><div className="loading-spinner" /><p>Loading feature data...</p></div>
                    ) : (
                        <div className="importance-list">
                            {featureImportance.features?.map((feat, i) => (
                                <div key={i} className="importance-item">
                                    <div className="imp-rank">{i + 1}</div>
                                    <div className="imp-info">
                                        <div className="imp-name">{feat.label}</div>
                                        <div className="imp-bar-container">
                                            <div className="imp-bar" style={{ width: `${feat.percentage}%` }} />
                                        </div>
                                    </div>
                                    <div className="imp-percent">{feat.percentage}%</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ======= LOCATIONS TAB ======= */}
            {activeTab === 'locations' && (
                <div className="glass-panel">
                    <h2>📍 Location-Based Pricing</h2>
                    <p style={{ color: '#ffffff', marginBottom: 24, opacity: 0.9 }}>
                        Compare property prices across Dire Dawa neighborhoods
                    </p>
                    {!locations ? (
                        <div className="loading-container"><div className="loading-spinner" /><p>Loading locations...</p></div>
                    ) : (
                        <div className="location-grid">
                            {locations.locations?.map((loc, i) => (
                                <div key={i} className="location-card">
                                    <div className="loc-name">{loc.name}</div>
                                    <div className="loc-count">{loc.count} properties listed</div>
                                    <div className="loc-stats">
                                        <div className="loc-stat">
                                            <div className="loc-stat-value">{formatPrice(loc.avgPrice)}</div>
                                            <div className="loc-stat-label">Avg Price (ETB)</div>
                                        </div>
                                        <div className="loc-stat">
                                            <div className="loc-stat-value">{formatPrice(loc.avgPricePerSqm)}</div>
                                            <div className="loc-stat-label">Avg ETB/m²</div>
                                        </div>
                                        <div className="loc-stat">
                                            <div className="loc-stat-value">{formatPrice(loc.minPrice)}</div>
                                            <div className="loc-stat-label">Min Price</div>
                                        </div>
                                        <div className="loc-stat">
                                            <div className="loc-stat-value">{formatPrice(loc.maxPrice)}</div>
                                            <div className="loc-stat-label">Max Price</div>
                                        </div>
                                    </div>
                                    <span className={`affordability-badge ${loc.affordabilityIndex > 60 ? 'high' :
                                            loc.affordabilityIndex > 35 ? 'medium' : 'low'
                                        }`}>
                                        {loc.affordabilityIndex > 60 ? '💚 Affordable' :
                                            loc.affordabilityIndex > 35 ? '💛 Moderate' : '🔴 Premium'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ======= FRAUD DETECTION TAB ======= */}
            {activeTab === 'fraud' && (
                <div className="glass-panel">
                    <h2>🛡️ Fraud Detection & Price Verification</h2>
                    <p style={{ color: '#ffffff', marginBottom: 20, opacity: 0.9 }}>
                        Check if a property listing price is within normal market range
                    </p>

                    <div className="prediction-form">
                        <div className="form-group">
                            <label>Listed Price (ETB)</label>
                            <input type="number" value={fraudForm.price}
                                onChange={e => setFraudForm({ ...fraudForm, price: e.target.value })}
                                placeholder="Enter listed price" />
                        </div>
                        <div className="form-group">
                            <label>Size (m²)</label>
                            <input type="number" value={fraudForm.size_m2}
                                onChange={e => setFraudForm({ ...fraudForm, size_m2: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Bedrooms</label>
                            <input type="number" value={fraudForm.bedrooms}
                                onChange={e => setFraudForm({ ...fraudForm, bedrooms: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Bathrooms</label>
                            <input type="number" value={fraudForm.bathrooms}
                                onChange={e => setFraudForm({ ...fraudForm, bathrooms: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Distance to Center (km)</label>
                            <input type="number" step="0.1" value={fraudForm.distance_to_center_km}
                                onChange={e => setFraudForm({ ...fraudForm, distance_to_center_km: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label>Property Type</label>
                            <select value={fraudForm.property_type}
                                onChange={e => setFraudForm({ ...fraudForm, property_type: e.target.value })}>
                                {(modelInfo?.propertyTypes || ['House', 'Apartment', 'Studio']).map(t =>
                                    <option key={t} value={t}>{t}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Condition</label>
                            <select value={fraudForm.condition}
                                onChange={e => setFraudForm({ ...fraudForm, condition: e.target.value })}>
                                {(modelInfo?.conditions || ['New', 'Good', 'Old']).map(c =>
                                    <option key={c} value={c}>{c}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Location</label>
                            <select value={fraudForm.location_name}
                                onChange={e => setFraudForm({ ...fraudForm, location_name: e.target.value })}>
                                {(modelInfo?.locations || ['Kezira', 'Sabian', 'Goro']).map(l =>
                                    <option key={l} value={l}>{l}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Security Rating</label>
                            <select value={fraudForm.security_rating}
                                onChange={e => setFraudForm({ ...fraudForm, security_rating: e.target.value })}>
                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={fraudForm.near_school}
                                onChange={e => setFraudForm({ ...fraudForm, near_school: e.target.checked })} />
                            <label>Near School</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={fraudForm.near_hospital}
                                onChange={e => setFraudForm({ ...fraudForm, near_hospital: e.target.checked })} />
                            <label>Near Hospital</label>
                        </div>
                        <div className="form-group checkbox-group">
                            <input type="checkbox" checked={fraudForm.near_market}
                                onChange={e => setFraudForm({ ...fraudForm, near_market: e.target.checked })} />
                            <label>Near Market</label>
                        </div>

                        <button className={`predict-btn ${checkingFraud ? 'loading' : ''}`} onClick={handleFraudCheck} disabled={checkingFraud}>
                            {checkingFraud ? '⏳ Analyzing...' : '🛡️ Check for Fraud'}
                        </button>
                    </div>

                    {fraudResult && (
                        <div className="fraud-result">
                            <div className={`risk-display ${fraudResult.riskLevel}`}>
                                <div className="risk-score-circle">{fraudResult.riskScore}</div>
                                <div className="risk-level-text">{fraudResult.riskLevel} Risk</div>
                                <p style={{ color: '#c0c0c0', marginBottom: 12 }}>{fraudResult.recommendation}</p>
                                <ul className="alert-list">
                                    {fraudResult.alerts?.map((alert, i) => (
                                        <li key={i}>{alert}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="fraud-comparison">
                                <div className="fraud-price-box">
                                    <div className="fpb-label">Listed Price</div>
                                    <div className="fpb-value" style={{ color: '#ff6fd8' }}>{formatPrice(fraudResult.listedPrice)} ETB</div>
                                </div>
                                <div className="fraud-vs">VS</div>
                                <div className="fraud-price-box">
                                    <div className="fpb-label">AI Predicted (Market Value)</div>
                                    <div className="fpb-value" style={{ color: '#00d2ff' }}>{formatPrice(fraudResult.predictedPrice)} ETB</div>
                                </div>
                            </div>

                            <div className="stats-grid" style={{ marginTop: 20 }}>
                                <div className="stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-value">{fraudResult.deviation > 0 ? '+' : ''}{fraudResult.deviation}%</div>
                                    <div className="stat-label">Price Deviation</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">🎯</div>
                                    <div className="stat-value">{formatPrice(Math.abs(fraudResult.listedPrice - fraudResult.predictedPrice))}</div>
                                    <div className="stat-label">Price Difference (ETB)</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIPricePredictor;
