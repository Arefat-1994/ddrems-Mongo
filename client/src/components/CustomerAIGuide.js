import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CustomerAIGuide.css';

const CustomerAIGuide = ({ user, onClose, onRecommendations }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    budget_min: '',
    budget_max: '',
    property_type: 'apartment',
    location: 'Kezira',
    bedrooms: '2',
    bathrooms: '1',
    near_school: false,
    near_hospital: false,
    near_market: false,
    parking: false
  });
  const [recommendations, setRecommendations] = useState(null);
  const [aiAdvice, setAiAdvice] = useState(null);

  // Step 1: Budget Selection
  const handleBudgetChange = (e) => {
    const { name, value } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Step 2: Property Preferences
  const handlePreferenceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Get AI Recommendations
  const handleGetRecommendations = async () => {
    if (!preferences.budget_min || !preferences.budget_max) {
      alert('Please enter budget range');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'http://localhost:5000/api/ai/get-recommendations',
        {
          budget_min: parseInt(preferences.budget_min),
          budget_max: parseInt(preferences.budget_max),
          property_type: preferences.property_type,
          location: preferences.location,
          bedrooms: parseInt(preferences.bedrooms),
          bathrooms: parseInt(preferences.bathrooms),
          preferences: {
            near_school: preferences.near_school,
            near_hospital: preferences.near_hospital,
            near_market: preferences.near_market,
            parking: preferences.parking
          }
        },
        { params: { userId: user.id } }
      );

      if (response.data.success) {
        setRecommendations(response.data);
        setStep(3);
        if (onRecommendations) {
          onRecommendations(response.data);
        }
      }
    } catch (error) {
      console.error('Error getting recommendations:', error);
      alert('Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-ai-guide">
      <div className="guide-header">
        <h2>🏠 AI Property Guide</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="guide-content">
        {/* Step 1: Budget */}
        {step === 1 && (
          <div className="guide-step">
            <h3>💰 Step 1: What's Your Budget?</h3>
            <p>Tell us your budget range to find properties that match your financial capacity.</p>

            <div className="form-group">
              <label>Minimum Budget (ETB)</label>
              <input
                type="number"
                name="budget_min"
                value={preferences.budget_min}
                onChange={handleBudgetChange}
                placeholder="e.g., 1000000"
                step="100000"
              />
            </div>

            <div className="form-group">
              <label>Maximum Budget (ETB)</label>
              <input
                type="number"
                name="budget_max"
                value={preferences.budget_max}
                onChange={handleBudgetChange}
                placeholder="e.g., 5000000"
                step="100000"
              />
            </div>

            <div className="budget-presets">
              <button onClick={() => setPreferences(prev => ({ ...prev, budget_min: '1000000', budget_max: '2000000' }))}>
                1M - 2M ETB
              </button>
              <button onClick={() => setPreferences(prev => ({ ...prev, budget_min: '2000000', budget_max: '4000000' }))}>
                2M - 4M ETB
              </button>
              <button onClick={() => setPreferences(prev => ({ ...prev, budget_min: '4000000', budget_max: '8000000' }))}>
                4M - 8M ETB
              </button>
              <button onClick={() => setPreferences(prev => ({ ...prev, budget_min: '8000000', budget_max: '15000000' }))}>
                8M+ ETB
              </button>
            </div>

            <button className="btn-primary" onClick={() => setStep(2)}>
              Next: Property Preferences →
            </button>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="guide-step">
            <h3>🏡 Step 2: What Type of Property?</h3>
            <p>Tell us your preferences to get personalized recommendations.</p>

            <div className="form-group">
              <label>Property Type</label>
              <select name="property_type" value={preferences.property_type} onChange={handlePreferenceChange}>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa</option>
                <option value="house">House</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="form-group">
              <label>Location</label>
              <select name="location" value={preferences.location} onChange={handlePreferenceChange}>
                <option value="Kezira">Kezira</option>
                <option value="Downtown">Downtown</option>
                <option value="Sabian">Sabian</option>
                <option value="Gendeberet">Gendeberet</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Bedrooms</label>
                <select name="bedrooms" value={preferences.bedrooms} onChange={handlePreferenceChange}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>

              <div className="form-group">
                <label>Bathrooms</label>
                <select name="bathrooms" value={preferences.bathrooms} onChange={handlePreferenceChange}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </div>
            </div>

            <div className="preferences-section">
              <h4>📍 Nearby Amenities</h4>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="near_school"
                    checked={preferences.near_school}
                    onChange={handlePreferenceChange}
                  />
                  Near School
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="near_hospital"
                    checked={preferences.near_hospital}
                    onChange={handlePreferenceChange}
                  />
                  Near Hospital
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="near_market"
                    checked={preferences.near_market}
                    onChange={handlePreferenceChange}
                  />
                  Near Market
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="parking"
                    checked={preferences.parking}
                    onChange={handlePreferenceChange}
                  />
                  Parking Available
                </label>
              </div>
            </div>

            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="btn-primary" onClick={handleGetRecommendations} disabled={loading}>
                {loading ? 'Getting Recommendations...' : 'Get AI Recommendations →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Recommendations */}
        {step === 3 && recommendations && (
          <div className="guide-step">
            <h3>✨ AI Recommendations for You</h3>
            <p>Based on your preferences, here's what we recommend:</p>

            <div className="recommendations-list">
              {recommendations.recommendations && recommendations.recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-card">
                  <div className="rec-header">
                    <h4>{rec.title}</h4>
                    <span className="rec-score">{rec.score}%</span>
                  </div>
                  <p>{rec.description}</p>
                  <div className="rec-bar">
                    <div className="rec-fill" style={{ width: `${rec.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="next-steps">
              <h4>📋 Next Steps:</h4>
              <ol>
                {recommendations.next_steps && recommendations.next_steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(2)}>
                ← Modify Preferences
              </button>
              <button className="btn-primary" onClick={onClose}>
                Start Browsing Properties →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <div className="guide-progress">
        <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
          <span>1</span>
          <p>Budget</p>
        </div>
        <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
          <span>2</span>
          <p>Preferences</p>
        </div>
        <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
          <span>3</span>
          <p>Recommendations</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerAIGuide;
