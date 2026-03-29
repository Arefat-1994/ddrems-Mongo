import React, { useState, useEffect } from 'react';
import './AIPriceComparison.css';
import axios from 'axios';

const AIPriceComparison = ({ property }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAIPrediction();
  }, [property]);

  const fetchAIPrediction = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('http://localhost:5000/api/ai/predict', {
        params: {
          location: property.location,
          propertyType: property.propertyType,
          size: parseInt(property.size),
          bedrooms: parseInt(property.bedrooms),
          bathrooms: parseInt(property.bathrooms) || 1
        }
      });

      if (response.data.success) {
        setPrediction(response.data.prediction);
      } else {
        setError(response.data.message || 'Failed to get prediction');
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError('Unable to fetch AI prediction');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-price-comparison loading">
        <div className="loading-spinner">⏳ Analyzing market price...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-price-comparison error">
        <span className="error-icon">⚠️</span>
        <span className="error-text">{error}</span>
      </div>
    );
  }

  if (!prediction) {
    return null;
  }

  const listedPrice = parseInt(property.price);
  const predictedPrice = prediction.predictedPrice;
  const deviation = ((listedPrice - predictedPrice) / predictedPrice) * 100;
  const deviationAbs = Math.abs(deviation);

  let indicator = 'fair';
  let indicatorColor = '#10b981';
  let indicatorLabel = 'Fair Price';

  if (deviationAbs <= 5) {
    indicator = 'fair';
    indicatorColor = '#10b981';
    indicatorLabel = '✅ Fair Price';
  } else if (deviationAbs <= 15) {
    indicator = 'minor';
    indicatorColor = '#f59e0b';
    indicatorLabel = '⚠️ Minor Discrepancy';
  } else {
    indicator = 'significant';
    indicatorColor = '#ef4444';
    indicatorLabel = '❌ Significant Discrepancy';
  }

  return (
    <div className="ai-price-comparison">
      <div className="price-comparison-header">
        <span className="ai-badge">🤖 AI Market Analysis</span>
      </div>

      <div className="price-comparison-grid">
        {/* Listed Price */}
        <div className="price-card listed">
          <div className="price-label">Listed Price</div>
          <div className="price-value">
            ETB {listedPrice.toLocaleString()}
          </div>
          <div className="price-note">Your asking price</div>
        </div>

        {/* AI Predicted Price */}
        <div className="price-card predicted">
          <div className="price-label">AI Predicted Price</div>
          <div className="price-value">
            ETB {predictedPrice.toLocaleString()}
          </div>
          <div className="price-note">Market estimate</div>
        </div>
      </div>

      {/* Deviation Analysis */}
      <div className="deviation-analysis">
        <div className="deviation-header">
          <span className="deviation-label">Price Deviation</span>
          <span
            className="deviation-value"
            style={{ color: indicatorColor }}
          >
            {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
          </span>
        </div>

        <div className="deviation-bar">
          <div
            className="deviation-fill"
            style={{
              width: `${Math.min(deviationAbs, 100)}%`,
              backgroundColor: indicatorColor
            }}
          />
        </div>

        <div className="deviation-indicator" style={{ borderColor: indicatorColor }}>
          <span className="indicator-icon">{indicatorLabel.split(' ')[0]}</span>
          <span className="indicator-text">{indicatorLabel}</span>
        </div>
      </div>

      {/* Interpretation */}
      <div className="price-interpretation">
        {deviation > 0 ? (
          <div className="interpretation-item above-market">
            <span className="interpretation-icon">📈</span>
            <div className="interpretation-text">
              <strong>Above Market</strong>
              <p>
                Your price is {deviationAbs.toFixed(1)}% higher than the market average.
                Consider reducing the price to attract more buyers.
              </p>
            </div>
          </div>
        ) : (
          <div className="interpretation-item below-market">
            <span className="interpretation-icon">📉</span>
            <div className="interpretation-text">
              <strong>Below Market</strong>
              <p>
                Your price is {deviationAbs.toFixed(1)}% lower than the market average.
                You could potentially increase the price.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Confidence */}
      <div className="prediction-confidence">
        <span className="confidence-label">Prediction Confidence:</span>
        <span className="confidence-value">{prediction.confidence}%</span>
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{ width: `${prediction.confidence}%` }}
          />
        </div>
      </div>

      {/* Market Insights */}
      <div className="market-insights">
        <h4>📊 Market Insights</h4>
        <div className="insights-grid">
          <div className="insight-item">
            <span className="insight-label">Location</span>
            <span className="insight-value">{property.location}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Type</span>
            <span className="insight-value">{property.propertyType}</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Size</span>
            <span className="insight-value">{property.size} m²</span>
          </div>
          <div className="insight-item">
            <span className="insight-label">Bedrooms</span>
            <span className="insight-value">{property.bedrooms}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIPriceComparison;
