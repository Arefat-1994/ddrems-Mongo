import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Complaints.css';

const API_BASE = `${window.API_URL}`;

const Complaints = ({ user }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [formData, setFormData] = useState({ subject: '', description: '', category: 'other', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchComplaints(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await axios.get(`${API_BASE}/complaints/user/${user.id}`);
      setComplaints(res.data.complaints || []);
    } catch (err) { console.error('Error fetching complaints:', err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/complaints`, { user_id: user.id, ...formData });
      setNotification({ type: 'success', message: '✅ Complaint submitted successfully!' });
      setFormData({ subject: '', description: '', category: 'other', priority: 'medium' });
      setShowForm(false);
      fetchComplaints();
    } catch (err) {
      setNotification({ type: 'error', message: '❌ Failed to submit complaint' });
    } finally { setSubmitting(false); setTimeout(() => setNotification(null), 4000); }
  };

  const getStatusStyle = (status) => {
    const styles = {
      open: { bg: '#fef3c7', color: '#92400e', label: '🟡 Open' },
      in_progress: { bg: '#dbeafe', color: '#1d4ed8', label: '🔵 In Progress' },
      resolved: { bg: '#d1fae5', color: '#065f46', label: '✅ Resolved' },
      closed: { bg: '#f1f5f9', color: '#475569', label: '⬛ Closed' }
    };
    return styles[status] || styles.open;
  };

  const getPriorityStyle = (priority) => {
    const styles = {
      low: { bg: '#f0fdf4', color: '#166534' },
      medium: { bg: '#fef9c3', color: '#854d0e' },
      high: { bg: '#fee2e2', color: '#991b1b' },
      urgent: { bg: '#fecaca', color: '#7f1d1d' }
    };
    return styles[priority] || styles.medium;
  };

  return (
    <div className="complaints-page">
      <div className="complaints-header">
        <div>
          <h1>📋 My Complaints</h1>
          <p>Submit and track your complaints to the system administration</p>
        </div>
        <button className="btn-new-complaint" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '➕ New Complaint'}
        </button>
      </div>

      {notification && (
        <div className={`complaint-notification ${notification.type}`}>{notification.message}</div>
      )}

      {/* New Complaint Form */}
      {showForm && (
        <div className="complaint-form-card">
          <h3>📝 Submit a New Complaint</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                  <option value="technical">🔧 Technical Issue</option>
                  <option value="billing">💳 Billing / Payment</option>
                  <option value="property">🏠 Property Related</option>
                  <option value="broker">🤝 Broker Related</option>
                  <option value="service">📞 Service Quality</option>
                  <option value="other">📋 Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="urgent">🔴 Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Subject *</label>
              <input type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Brief summary of your issue..." required maxLength="255" />
            </div>
            <div className="form-group">
              <label>Description * ({formData.description.length}/2000)</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe your issue in detail..." rows="6" required maxLength="2000" />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? '⏳ Submitting...' : '📤 Submit Complaint'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Bar */}
      <div className="complaints-stats-bar">
        <div className="cstat"><span className="cstat-num">{complaints.length}</span><span className="cstat-label">Total</span></div>
        <div className="cstat open"><span className="cstat-num">{complaints.filter(c => c.status === 'open').length}</span><span className="cstat-label">Open</span></div>
        <div className="cstat progress"><span className="cstat-num">{complaints.filter(c => c.status === 'in_progress').length}</span><span className="cstat-label">In Progress</span></div>
        <div className="cstat resolved"><span className="cstat-num">{complaints.filter(c => c.status === 'resolved').length}</span><span className="cstat-label">Resolved</span></div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="complaints-loading">⏳ Loading complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="complaints-empty">
          <span style={{ fontSize: '48px' }}>📭</span>
          <h3>No Complaints Yet</h3>
          <p>You haven't submitted any complaints. Click "New Complaint" to get started.</p>
        </div>
      ) : (
        <div className="complaints-list">
          {complaints.map(c => {
            const ss = getStatusStyle(c.status);
            const ps = getPriorityStyle(c.priority);
            return (
              <div key={c.id} className={`complaint-card ${selectedComplaint?.id === c.id ? 'expanded' : ''}`} onClick={() => setSelectedComplaint(selectedComplaint?.id === c.id ? null : c)}>
                <div className="complaint-card-header">
                  <div className="complaint-card-left">
                    <h4>{c.subject}</h4>
                    <div className="complaint-meta">
                      <span style={{ background: ss.bg, color: ss.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{ss.label}</span>
                      <span style={{ background: ps.bg, color: ps.color, padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{c.priority?.toUpperCase()}</span>
                      <span className="complaint-category">📁 {c.category}</span>
                      <span className="complaint-date">📅 {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="expand-icon">{selectedComplaint?.id === c.id ? '▲' : '▼'}</span>
                </div>

                {selectedComplaint?.id === c.id && (
                  <div className="complaint-card-body">
                    <div className="complaint-description">
                      <strong>Description:</strong>
                      <p>{c.description}</p>
                    </div>
                    {c.admin_response && (
                      <div className="admin-response-box">
                        <strong>🛡️ Admin Response:</strong>
                        <p>{c.admin_response}</p>
                        {c.resolved_by_name && <small>Responded by: {c.resolved_by_name} • {c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : ''}</small>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Complaints;
