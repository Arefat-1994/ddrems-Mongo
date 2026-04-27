import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EditRequestsAdmin.css';

const EditRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  const API_BASE = `http://${window.location.hostname}:5000/api`;

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/edit-requests/all`);
      setRequests(res.data);
    } catch (err) {
      console.error('Error fetching edit requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    const adminNotes = window.prompt(`Add approval note for ${request.user_name} (optional):`);
    if (adminNotes === null) return; // cancelled

    try {
      const adminUser = JSON.parse(localStorage.getItem('user'));
      await axios.put(`${API_BASE}/edit-requests/${request.id}/approve`, {
        admin_id: adminUser?.id,
        admin_notes: adminNotes || 'Approved'
      });
      alert('✅ Edit request approved!');
      fetchRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      alert('❌ Failed to approve request: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleReject = async (request) => {
    const adminNotes = window.prompt(`Reason for rejecting edit request from ${request.user_name}:`);
    if (adminNotes === null) return; // cancelled
    if (!adminNotes.trim()) {
      alert('A rejection reason is required.');
      return;
    }

    try {
      const adminUser = JSON.parse(localStorage.getItem('user'));
      await axios.put(`${API_BASE}/edit-requests/${request.id}/reject`, {
        admin_id: adminUser?.id,
        admin_notes: adminNotes
      });
      alert('✅ Edit request rejected!');
      fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('❌ Failed to reject request: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredRequests = requests.filter(req => req.status === filter);

  if (loading) {
    return <div className="edit-requests-admin"><h3>Loading requests...</h3></div>;
  }

  return (
    <div className="edit-requests-admin">
      <div className="edit-requests-header">
        <h2>✏️ Profile Edit Requests</h2>
        <p>Manage user requests to update their locked profile information.</p>
      </div>

      <div className="requests-filter">
        <button 
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          ⏳ Pending ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          ✅ Approved ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button 
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          ❌ Rejected ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="no-requests">
          <h3>No {filter} requests found</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div className="requests-grid">
          {filteredRequests.map(req => (
            <div key={req.id} className="request-card">
              <div className="request-header">
                <div className="user-info">
                  <h3>{req.user_name}</h3>
                  <span className="user-role">{req.profile_type} Profile</span>
                </div>
                <span className={`status-badge ${req.status}`}>
                  {req.status}
                </span>
              </div>

              <div className="request-body">
                <div className="reason-box">
                  <h4>Requested Reason</h4>
                  <p>"{req.reason}"</p>
                </div>
                <div className="request-date">
                  📅 Requested on: {new Date(req.requested_at).toLocaleDateString()}
                </div>
              </div>

              {req.status === 'pending' && (
                <div className="request-actions">
                  <button className="btn-approve-req" onClick={() => handleApprove(req)}>
                    ✓ Approve Edit
                  </button>
                  <button className="btn-reject-req" onClick={() => handleReject(req)}>
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditRequestsAdmin;
