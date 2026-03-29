import React, { useState, useEffect } from 'react';
import './AIAdvisorWidget.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Reusable AI Advisor Widget — embeddable in any dashboard.
 * Shows a quick price prediction form + market stats.
 */
const AIAdvisorWidget = () => {
    const [modelInfo, setModelInfo] = useState(null);
    const [form, setForm] = useState({
        size_m2: 120, bedrooms: 3, bathrooms: 2,
        property_type: 'House', location_name: 'Kezira'
    });
    const [prediction, setPrediction] = useState(null);
    const [predicting, setPredicting] = useState(false);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        fetchWidgetData();
    }, []);

    const fetchWidgetData = async () => {
        try {
            const [infoRes, analyticsRes] = await Promise.all([
                fetch(`${API_BASE}/ai/model-info`).then(r => r.json()).catch(() => null),
                fetch(`${API_BASE}/ai/analytics`).then(r => r.json()).catch(() => null)
            ]);
            setModelInfo(infoRes);
            setAnalytics(analyticsRes);
        } catch (err) {
            console.error('AI widget load error:', err);
        }
    };

    const handleQuickPredict = async () => {
        setPredicting(true);
        try {
            const params = new URLSearchParams({
                size_m2: form.size_m2,
                bedrooms: form.bedrooms,
                bathrooms: form.bathrooms,
                property_type: form.property_type,
                location_name: form.location_name,
                condition: 'Good',
                distance_to_center_km: 3,
                security_rating: 3,
                near_school: '0',
                near_hospital: '0',
                near_market: '0',
                parking: '0'
            });
            const res = await fetch(`${API_BASE}/ai/predict?${params}`);
            setPrediction(await res.json());
        } catch (err) {
            console.error('Quick predict error:', err);
        }
        setPredicting(false);
    };

    const formatPrice = (p) => {
        if (!p && p !== 0) return '—';
        return new Intl.NumberFormat('en-ET').format(Math.round(p));
    };

    if (!modelInfo) return null; // Don't render if AI service unavailable

    return (
        <div className="ai-advisor-widget">
            <div className="ai-widget-header">
                <h3>🤖 AI Price Advisor</h3>
                <span className="ai-widget-badge">AI Powered</span>
            </div>

            {/* Quick Predict Form */}
            <div className="ai-mini-form">
                <div className="mini-field">
                    <label>Location</label>
                    <select value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })}>
                        {(modelInfo?.locations || []).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div className="mini-field">
                    <label>Type</label>
                    <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}>
                        {(modelInfo?.propertyTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="mini-field">
                    <label>Size (m²)</label>
                    <input type="number" value={form.size_m2} onChange={e => setForm({ ...form, size_m2: e.target.value })} />
                </div>
                <div className="mini-field">
                    <label>Bedrooms</label>
                    <input type="number" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} />
                </div>

                <button className="ai-mini-predict-btn" onClick={handleQuickPredict} disabled={predicting}>
                    {predicting ? '⏳ Predicting...' : '🚀 Get AI Price'}
                </button>
            </div>

            {/* Prediction Result */}
            {prediction && (
                <div className="ai-mini-result">
                    <div className="mini-price-label">AI Predicted Price</div>
                    <div className="mini-price-value">{formatPrice(prediction.predictedPrice)} ETB</div>
                    <div className="mini-price-range">
                        <span>Low: {formatPrice(prediction.lowEstimate)}</span>
                        <span>High: {formatPrice(prediction.highEstimate)}</span>
                    </div>
                </div>
            )}

            {/* Market Stats */}
            <div className="ai-market-stats">
                <div className="ai-market-stat">
                    <div className="ms-value">{analytics ? formatPrice(analytics.avgPrice) : '—'}</div>
                    <div className="ms-label">Avg Price (ETB)</div>
                </div>
                <div className="ai-market-stat">
                    <div className="ms-value">{analytics?.totalProperties || '—'}</div>
                    <div className="ms-label">Properties Analyzed</div>
                </div>
                <div className="ai-market-stat">
                    <div className="ms-value">{modelInfo?.accuracyPercent || '—'}%</div>
                    <div className="ms-label">Model Accuracy</div>
                </div>
                <div className="ai-market-stat">
                    <div className="ms-value">{modelInfo?.featureCount || '—'}</div>
                    <div className="ms-label">Features Used</div>
                </div>
            </div>
        </div>
    );
};

/**
 * AI Price Comparison — for property creation preview.
 * Pass the property details and it fetches AI predicted price.
 */
export const AIPriceComparison = ({ propertyData }) => {
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (propertyData) fetchPrediction();
    }, [propertyData?.type, propertyData?.location, propertyData?.area, propertyData?.bedrooms, propertyData?.bathrooms, propertyData?.price]);

    const fetchPrediction = async () => {
        setLoading(true);
        try {
            // Map property form fields to AI API fields
            const locationName = (propertyData.location || '').split(',')[0].trim();
            const typeMap = { apartment: 'Apartment', villa: 'Villa', house: 'House', land: 'Land', commercial: 'Commercial' };

            const params = new URLSearchParams({
                size_m2: propertyData.area || 120,
                bedrooms: propertyData.bedrooms || 2,
                bathrooms: propertyData.bathrooms || 1,
                property_type: typeMap[propertyData.type] || propertyData.type || 'House',
                location_name: locationName || 'Kezira',
                condition: 'Good',
                distance_to_center_km: 3,
                security_rating: 3,
                near_school: '0',
                near_hospital: '0',
                near_market: '0',
                parking: '0'
            });

            const res = await fetch(`${API_BASE}/ai/predict?${params}`);
            const data = await res.json();
            setPrediction(data);
        } catch (err) {
            console.error('AI price comparison error:', err);
        }
        setLoading(false);
    };

    const formatPrice = (p) => {
        if (!p && p !== 0) return '—';
        return new Intl.NumberFormat('en-ET').format(Math.round(p));
    };

    const listedPrice = parseFloat(propertyData?.price) || 0;
    const predictedPrice = prediction?.predictedPrice || 0;
    const deviation = predictedPrice > 0 ? ((listedPrice - predictedPrice) / predictedPrice * 100) : 0;
    const absDeviation = Math.abs(deviation);

    let deviationClass = 'fair';
    let deviationText = '✅ Fair Price — within market range';
    if (absDeviation > 30) {
        deviationClass = 'significant';
        deviationText = `⚠️ ${deviation > 0 ? 'Over' : 'Under'}priced by ${absDeviation.toFixed(0)}% — significant deviation`;
    } else if (absDeviation > 15) {
        deviationClass = 'minor';
        deviationText = `💡 ${deviation > 0 ? 'Slightly above' : 'Slightly below'} market by ${absDeviation.toFixed(0)}%`;
    }

    if (loading) {
        return (
            <div className="ai-price-comparison">
                <h3>🤖 AI Price Analysis</h3>
                <div className="ai-loading-mini">
                    <span className="mini-spinner"></span> Analyzing market data...
                </div>
            </div>
        );
    }

    if (!prediction) return null;

    return (
        <div className="ai-price-comparison">
            <h3>🤖 AI Price Analysis</h3>

            <div className="price-compare-grid">
                <div className="price-box listed">
                    <div className="pb-label">Your Listed Price</div>
                    <div className="pb-value">{formatPrice(listedPrice)} ETB</div>
                </div>
                <div className="price-vs">VS</div>
                <div className="price-box predicted">
                    <div className="pb-label">AI Predicted Price</div>
                    <div className="pb-value">{formatPrice(predictedPrice)} ETB</div>
                </div>
            </div>

            <div className={`deviation-indicator ${deviationClass}`}>
                {deviationText}
            </div>
        </div>
    );
};

export default AIAdvisorWidget;
