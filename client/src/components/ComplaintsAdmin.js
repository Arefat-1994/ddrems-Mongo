import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ComplaintsAdmin.css';

const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;

const ComplaintsAdmin = ({ user }) => {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('in_progress');
  const [responding, setResponding] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => { fetchAll(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterPriority, filterCategory]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [complaintsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/complaints/admin/all?status=${filterStatus}&priority=${filterPriority}&category=${filterCategory}`),
        axios.get(`${API_BASE}/complaints/admin/stats`)
      ]);
      setComplaints(complaintsRes.data.complaints || []);
      setStats(statsRes.data || {});
    } catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  const handleRespond = async () => {
    if (!responseText.trim() || !selectedComplaint) return;
    setResponding(true);
    try {
      await axios.put(`${API_BASE}/complaints/${selectedComplaint.id}/respond`, {
        admin_response: responseText, admin_id: user.id, status: responseStatus
      });
      setNotification({ type: 'success', message: '✅ Response sent successfully!' });
      setSelectedComplaint(null);
      setResponseText('');
      fetchAll();
    } catch (err) {
      setNotification({ type: 'error', message: '❌ Failed to respond' });
    } finally { setResponding(false); setTimeout(() => setNotification(null), 4000); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`${API_BASE}/complaints/${id}/status`, { status: newStatus, admin_id: user.id });
      setNotification({ type: 'success', message: `Status updated to ${newStatus}` });
      fetchAll();
    } catch (err) {
      setNotification({ type: 'error', message: '❌ Failed to update status' });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const getStatusBadge = (status) => {
    const s = { open: { bg: '#fef3c7', color: '#92400e', icon: '🟡' }, in_progress: { bg: '#dbeafe', color: '#1d4ed8', icon: '🔵' }, resolved: { bg: '#d1fae5', color: '#065f46', icon: '✅' }, closed: { bg: '#f1f5f9', color: '#475569', icon: '⬛' } };
    return s[status] || s.open;
  };

  const getPriorityBadge = (p) => {
    const s = { low: '#22c55e', medium: '#eab308', high: '#f97316', urgent: '#ef4444' };
    return s[p] || s.medium;
  };

  const getRoleBadge = (role) => {
    const s = { user: { bg: '#fef3c7', color: '#92400e', label: 'Customer' }, broker: { bg: '#dbeafe', color: '#1d4ed8', label: 'Broker' }, owner: { bg: '#d1fae5', color: '#065f46', label: 'Owner' } };
    return s[role] || { bg: '#f1f5f9', color: '#475569', label: role };
  };

  return (
    <div className="complaints-admin-page">
      <div className="ca-header">
        <div>
          <h1>🛡️ Complaint Management</h1>
          <p>Review and resolve user complaints</p>
        </div>
      </div>

      {notification && <div className={`ca-notification ${notification.type}`}>{notification.message}</div>}

      {/* Stats */}
      <div className="ca-stats-grid">
        <div className="ca-stat-card"><span className="ca-stat-icon" style={{ background: '#fee2e2' }}>🔴</span><div><h3>{stats.urgent || 0}</h3><p>Urgent</p></div></div>
        <div className="ca-stat-card"><span className="ca-stat-icon" style={{ background: '#fef3c7' }}>🟡</span><div><h3>{stats.open || 0}</h3><p>Open</p></div></div>
        <div className="ca-stat-card"><span className="ca-stat-icon" style={{ background: '#dbeafe' }}>🔵</span><div><h3>{stats.in_progress || 0}</h3><p>In Progress</p></div></div>
        <div className="ca-stat-card"><span className="ca-stat-icon" style={{ background: '#d1fae5' }}>✅</span><div><h3>{stats.resolved || 0}</h3><p>Resolved</p></div></div>
        <div className="ca-stat-card"><span className="ca-stat-icon" style={{ background: '#f1f5f9' }}>📊</span><div><h3>{stats.total || 0}</h3><p>Total</p></div></div>
      </div>

      {/* Filters */}
      <div className="ca-filters">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">🟡 Open</option>
          <option value="in_progress">🔵 In Progress</option>
          <option value="resolved">✅ Resolved</option>
          <option value="closed">⬛ Closed</option>
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="all">All Priority</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="technical">🔧 Technical</option>
          <option value="billing">💳 Billing</option>
          <option value="property">🏠 Property</option>
          <option value="broker">🤝 Broker</option>
          <option value="service">📞 Service</option>
          <option value="other">📋 Other</option>
        </select>
      </div>

      {/* Complaints Table */}
      {loading ? (
        <div className="ca-loading">⏳ Loading complaints...</div>
      ) : complaints.length === 0 ? (
        <div className="ca-empty"><span style={{ fontSize: '48px' }}>📭</span><h3>No Complaints Found</h3><p>No complaints match the current filters.</p></div>
      ) : (
        <div className="ca-complaints-list">
          {complaints.map(c => {
            const sb = getStatusBadge(c.status);
            const rb = getRoleBadge(c.user_role);
            return (
              <div key={c.id} className={`ca-complaint-card ${selectedComplaint?.id === c.id ? 'selected' : ''}`}>
                <div className="ca-card-top" onClick={() => setSelectedComplaint(selectedComplaint?.id === c.id ? null : c)}>
                  <div className="ca-card-priority-bar" style={{ background: getPriorityBadge(c.priority) }}></div>
                  <div className="ca-card-content">
                    <div className="ca-card-row1">
                      <h4>#{c.id} — {c.subject}</h4>
                      <span className="ca-expand-btn">{selectedComplaint?.id === c.id ? '▲' : '▼'}</span>
                    </div>
                    <div className="ca-card-tags">
                      <span style={{ background: sb.bg, color: sb.color }} className="ca-tag">{sb.icon} {c.status?.replace('_', ' ')}</span>
                      <span className="ca-tag" style={{ background: '#fff', border: `2px solid ${getPriorityBadge(c.priority)}`, color: getPriorityBadge(c.priority) }}>{c.priority}</span>
                      <span className="ca-tag" style={{ background: rb.bg, color: rb.color }}>{rb.label}</span>
                      <span className="ca-tag-plain">👤 {c.user_name}</span>
                      <span className="ca-tag-plain">📧 {c.user_email}</span>
                      <span className="ca-tag-plain">📁 {c.category}</span>
                      <span className="ca-tag-plain">📅 {new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {selectedComplaint?.id === c.id && (
                  <div className="ca-card-expanded">
                    <div className="ca-description-section">
                      <strong>📄 Description:</strong>
                      <p>{c.description}</p>
                    </div>

                    {c.admin_response && (
                      <div className="ca-prev-response">
                        <strong>🛡️ Previous Response:</strong>
                        <p>{c.admin_response}</p>
                        {c.resolved_by_name && <small>By {c.resolved_by_name} • {c.resolved_at ? new Date(c.resolved_at).toLocaleString() : ''}</small>}
                      </div>
                    )}

                    {/* Status Quick Actions */}
                    <div className="ca-status-actions">
                      <span className="ca-action-label">Change Status:</span>
                      {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                        <button key={s} className={`ca-status-btn ${c.status === s ? 'active' : ''}`}
                          onClick={() => handleStatusChange(c.id, s)} disabled={c.status === s}>
                          {getStatusBadge(s).icon} {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>

                    {/* Response Form */}
                    <div className="ca-response-form">
                      <h5>✍️ Send Response</h5>
                      <textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Type your response to this complaint..." rows="4" />
                      <div className="ca-response-actions">
                        <select value={responseStatus} onChange={e => setResponseStatus(e.target.value)}>
                          <option value="in_progress">Set In Progress</option>
                          <option value="resolved">Mark Resolved</option>
                          <option value="closed">Close Complaint</option>
                        </select>
                        <button className="ca-send-btn" onClick={handleRespond} disabled={responding || !responseText.trim()}>
                          {responding ? '⏳ Sending...' : '📤 Send Response'}
                        </button>
                      </div>
                    </div>
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

export default ComplaintsAdmin;
