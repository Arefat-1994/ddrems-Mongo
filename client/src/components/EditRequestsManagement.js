import React, { useState, useEffect, useCallback } from 'react';
import './EditRequestsManagement.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const EditRequestsManagement = ({ user, onLogout, onSettingsClick }) => {
  const [editRequests, setEditRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

  const fetchEditRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/edit-requests/all`);
      setEditRequests(response.data);
    } catch (error) {
      console.error('Error fetching edit requests:', error);
      alert('Failed to fetch edit requests');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchEditRequests();
  }, [fetchEditRequests]);

  const handleViewDetails = async (request) => {
    try {
      const response = await axios.get(`${API_BASE}/edit-requests/${request.id}`);
      setSelectedRequest(response.data);
      setAdminNotes('');
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      alert('Failed to fetch request details');
    }
  };

  const handleApprove = async () => {
    if (!adminNotes.trim()) {
      alert('Please enter admin notes');
      return;
    }

    setSubmitting(true);
    try {
      await axios.put(`${API_BASE}/edit-requests/${selectedRequest.id}/approve`, {
        admin_id: user.id,
        admin_notes: adminNotes
      });
      alert('✅ Edit request approved successfully!');
      setShowDetailModal(false);
      fetchEditRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      alert('❌ Failed to approve request: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!adminNotes.trim()) {
      alert('Please enter rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      await axios.put(`${API_BASE}/edit-requests/${selectedRequest.id}/reject`, {
        admin_id: user.id,
        admin_notes: adminNotes
      });
      alert('✅ Edit request rejected successfully!');
      setShowDetailModal(false);
      fetchEditRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('❌ Failed to reject request: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = editRequests.filter(req => {
    const matchesSearch = req.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.user_email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    let bg = '#fef3c7', color = '#92400e', icon = '⏳';
    if (status === 'approved') { bg = '#d1fae5'; color = '#065f46'; icon = '✅'; }
    if (status === 'rejected') { bg = '#fee2e2'; color = '#991b1b'; icon = '❌'; }
    return <span className="status-badge" style={{ background: bg, color: color }}>{icon} {status.toUpperCase()}</span>;
  };

  const getProfileTypeBadge = (type) => {
    const colors = {
      customer: '#10b981',
      owner: '#f59e0b',
      broker: '#3b82f6'
    };
    return <span className="profile-type-badge" style={{ background: colors[type] || '#6b7280' }}>{type.toUpperCase()}</span>;
  };

  return (
    <div className="edit-requests-management">
      <PageHeader
        title="Profile Edit Requests"
        subtitle={`Manage user profile edit requests (${filteredRequests.length} total)`}
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
      />

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="status-filter"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading">Loading edit requests...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No edit requests found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Profile Type</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => (
                <tr key={req.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-avatar">{req.user_name.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="user-name">{req.user_name}</div>
                        <div className="user-email">{req.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{getProfileTypeBadge(req.profile_type)}</td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td className="date-cell">{new Date(req.requested_at).toLocaleDateString()}</td>
                  <td className="reason-cell">{req.reason ? req.reason.substring(0, 50) + '...' : 'No reason provided'}</td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={() => handleViewDetails(req)}
                      disabled={req.status !== 'pending'}
                    >
                      👁️ View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAIL MODAL */}
      {showDetailModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>📋 Edit Request Details</h2>
                <p>{selectedRequest.user_name} - {selectedRequest.profile_type.toUpperCase()}</p>
              </div>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Request Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>User</label>
                    <p>{selectedRequest.user_name} ({selectedRequest.user_email})</p>
                  </div>
                  <div className="detail-item">
                    <label>Profile Type</label>
                    <p>{selectedRequest.profile_type}</p>
                  </div>
                  <div className="detail-item">
                    <label>Status</label>
                    <p>{getStatusBadge(selectedRequest.status)}</p>
                  </div>
                  <div className="detail-item">
                    <label>Requested At</label>
                    <p>{new Date(selectedRequest.requested_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Reason for Edit</h3>
                <p className="reason-text">{selectedRequest.reason || 'No reason provided'}</p>
              </div>

              {selectedRequest.requested_changes && (
                <div className="detail-section">
                  <h3>Requested Changes</h3>
                  <div className="changes-list">
                    {Object.entries(JSON.parse(selectedRequest.requested_changes)).map(([key, value]) => (
                      <div key={key} className="change-item">
                        <span className="change-key">{key}:</span>
                        <span className="change-value">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="detail-section">
                  <h3>Admin Response</h3>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter your notes or reason for approval/rejection..."
                    rows="4"
                    className="admin-notes"
                  />
                </div>
              )}
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="modal-footer">
                <button 
                  className="btn-reject"
                  onClick={handleReject}
                  disabled={submitting}
                >
                  ❌ Reject
                </button>
                <button 
                  className="btn-approve"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  ✅ Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRequestsManagement;
