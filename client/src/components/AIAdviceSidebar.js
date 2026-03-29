import React, { useState } from 'react';
import './AIAdviceSidebar.css';
import axios from 'axios';

const AIAdviceSidebar = ({ user, onClose }) => {
  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const getAIAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:5000/api/ai/advice', {
        params: {
          role: user?.role,
          userId: user?.id
        }
      });

      if (response.data.success) {
        setAdvice(response.data.advice);
        setExpanded(true);
      } else {
        setError(response.data.message || 'Failed to get AI advice');
      }
    } catch (err) {
      console.error('AI Advice error:', err);
      setError(err.response?.data?.message || 'Failed to fetch AI advice');
    } finally {
      setLoading(false);
    }
  };

  const getAdviceIcon = () => {
    if (!user?.role) return '🤖';
    
    const icons = {
      'admin': '👨‍💼',
      'system_admin': '🔧',
      'property_admin': '📋',
      'broker': '🤝',
      'owner': '🏠',
      'user': '👤'
    };
    
    return icons[user.role] || '🤖';
  };

  const getAdviceTitle = () => {
    if (!user?.role) return 'AI Advice';
    
    const titles = {
      'admin': 'Admin Insights',
      'system_admin': 'System Insights',
      'property_admin': 'Property Insights',
      'broker': 'Broker Insights',
      'owner': 'Owner Insights',
      'user': 'Customer Insights'
    };
    
    return titles[user.role] || 'AI Advice';
  };

  return (
    <div className={`ai-advice-sidebar ${expanded ? 'expanded' : 'collapsed'}`}>
      {/* Header */}
      <div className="ai-advice-header">
        <div className="ai-advice-title">
          <span className="ai-advice-icon">{getAdviceIcon()}</span>
          {expanded && <h3>{getAdviceTitle()}</h3>}
        </div>
        <button
          className="ai-advice-toggle"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? '✕' : '⚡'}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="ai-advice-content">
          {!advice ? (
            <div className="ai-advice-empty">
              <p>Get personalized AI insights for your role</p>
              <button
                className="btn-get-advice"
                onClick={getAIAdvice}
                disabled={loading}
              >
                {loading ? '⏳ Loading...' : '✨ Get Advice'}
              </button>
            </div>
          ) : (
            <div className="ai-advice-result">
              <div className="advice-item">
                <h4>💡 <span className="label">Insight Title:</span> {advice.title}</h4>
                <p><strong><span className="label">Explanation:</span></strong> {advice.description}</p>
              </div>

              {advice.recommendations && advice.recommendations.length > 0 && (
                <div className="advice-recommendations">
                  <h5>📌 <span className="label">Actionable Recommendations:</span></h5>
                  <ul>
                    {advice.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {advice.metrics && (
                <div className="advice-metrics">
                  <h5>📊 <span className="label">Key Performance Metrics:</span></h5>
                  <div className="metrics-grid">
                    {Object.entries(advice.metrics).map(([key, value]) => (
                      <div key={key} className="metric-item">
                        <span className="metric-label">{key}:</span>
                        <span className="metric-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {advice.alerts && advice.alerts.length > 0 && (
                <div className="advice-alerts">
                  <h5>⚠️ <span className="label">Critical Alerts:</span></h5>
                  {advice.alerts.map((alert, idx) => (
                    <div key={idx} className={`alert alert-${alert.type}`}>
                      <strong>Status:</strong> {alert.message}
                    </div>
                  ))}
                </div>
              )}

              <button
                className="btn-refresh-advice"
                onClick={getAIAdvice}
                disabled={loading}
              >
                {loading ? '⏳ Refreshing...' : '🔄 Refresh AI Advice'}
              </button>
            </div>
          )}

          {error && (
            <div className="ai-advice-error">
              <p>⚠️ {error}</p>
              <button onClick={getAIAdvice} disabled={loading}>
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAdviceSidebar;
