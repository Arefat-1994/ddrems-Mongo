import React, { useState } from 'react';
import './AIAdvisorWidget.css';
import axios from 'axios';

const AIAdvisorWidget = () => {
  const [formData, setFormData] = useState({
    location: '',
    propertyType: 'apartment',
    size: '',
    bedrooms: '',
    bathrooms: ''
  });
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketStats, setMarketStats] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!formData.location || !formData.size || !formData.bedrooms) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:5000/api/ai/predict', {
        params: {
          location: formData.location,
          propertyType: formData.propertyType,
          size: parseInt(formData.size),
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseInt(formData.bathrooms) || 1
        }
      });

      if (response.data.success) {
        setPrediction(response.data.prediction);
      } else {
        setError(response.data.message || 'Failed to get prediction');
      }
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err.response?.data?.message || 'Failed to get AI prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleGetMarketStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get('http://localhost:5000/api/ai/market-stats', {
        params: {
          location: formData.location || 'all'
        }
      });

      if (response.data.success) {
        setMarketStats(response.data.stats);
      } else {
        setError(response.data.message || 'Failed to get market stats');
      }
    } catch (err) {
      console.error('Market stats error:', err);
      setError(err.response?.data?.message || 'Failed to get market stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-advisor-widget">
      <div className="ai-widget-header">
        <span className="ai-icon">🤖</span>
        <h3>AI Advisor</h3>
        <span className="ai-badge">Smart Insights</span>
      </div>

      <form onSubmit={handlePredict} className="ai-widget-form">
        <div className="ai-form-group">
          <label>Location *</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g., Addis Ababa"
            required
          />
        </div>

        <div className="ai-form-row">
          <div className="ai-form-group">
            <label>Type</label>
            <select
              name="propertyType"
              value={formData.propertyType}
              onChange={handleInputChange}
            >
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="villa">Villa</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <div className="ai-form-group">
            <label>Size (m²) *</label>
            <input
              type="number"
              name="size"
              value={formData.size}
              onChange={handleInputChange}
              placeholder="e.g., 100"
              required
            />
          </div>
        </div>

        <div className="ai-form-row">
          <div className="ai-form-group">
            <label>Bedrooms *</label>
            <input
              type="number"
              name="bedrooms"
              value={formData.bedrooms}
              onChange={handleInputChange}
              placeholder="e.g., 2"
              required
            />
          </div>

          <div className="ai-form-group">
            <label>Bathrooms</label>
            <input
              type="number"
              name="bathrooms"
              value={formData.bathrooms}
              onChange={handleInputChange}
              placeholder="e.g., 1"
            />
          </div>
        </div>

        <div className="ai-widget-actions">
          <button type="submit" className="btn-predict" disabled={loading}>
            {loading ? '⏳ Predicting...' : '🔮 Predict Price'}
          </button>
          <button
            type="button"
            className="btn-stats"
            onClick={handleGetMarketStats}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '📊 Market Stats'}
          </button>
        </div>
      </form>

      {error && (
        <div className="ai-error-message">
          <span>⚠️</span> {error}
        </div>
      )}

      {prediction && (
        <div className="ai-prediction-result">
          <h4>💰 Price Prediction</h4>
          <div className="prediction-value">
            ETB {prediction.predictedPrice?.toLocaleString() || 'N/A'}
          </div>
          <div className="prediction-details">
            <p>📍 Location: {prediction.location}</p>
            <p>🏠 Type: {prediction.propertyType}</p>
            <p>📐 Size: {prediction.size} m²</p>
            <p>🛏️ Bedrooms: {prediction.bedrooms}</p>
          </div>
          <div className="prediction-confidence">
            <span>Confidence: {prediction.confidence}%</span>
          </div>
        </div>
      )}

      {marketStats && (
        <div className="ai-market-stats">
          <h4>📈 Market Statistics</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Avg Price</span>
              <span className="stat-value">
                ETB {marketStats.averagePrice?.toLocaleString() || 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Min Price</span>
              <span className="stat-value">
                ETB {marketStats.minPrice?.toLocaleString() || 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Max Price</span>
              <span className="stat-value">
                ETB {marketStats.maxPrice?.toLocaleString() || 'N/A'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Properties</span>
              <span className="stat-value">{marketStats.count || 0}</span>
            </div>
          </div>
          {marketStats.topLocations && marketStats.topLocations.length > 0 && (
            <div className="top-locations">
              <span className="locations-label">🏆 Top Locations:</span>
              <div className="locations-list">
                {marketStats.topLocations.slice(0, 3).map((loc, idx) => (
                  <span key={idx} className="location-tag">
                    {loc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAdvisorWidget;
