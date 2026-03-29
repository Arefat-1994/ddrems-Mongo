import React, { useState, useEffect, useCallback } from 'react';
import './ProfileApproval.css';
import axios from 'axios';

const ProfileApproval = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE = `http://${window.location.hostname}:5000/api`;

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const fetchData = async (type) => {
        try {
          const res = await axios.get(`${API_BASE}/profiles/${type}`);
          return res.data.map(p => ({ ...p, type }));
        } catch (err) {
          console.warn(`Failed to fetch ${type} profiles:`, err.message);
          return [];
        }
      };

      const results = await Promise.all([
        fetchData('customer'),
        fetchData('owner'),
        fetchData('broker')
      ]);

      const allProfiles = [].concat(...results);

      // Filter by status locally (case-insensitive and handles missing status)
      const filteredProfiles = allProfiles.filter(p => {
        const pStatus = (p.profile_status || p.status || '').toLowerCase();
        const matchesStatus = pStatus === filter.toLowerCase();
        const matchesSearch = !searchTerm || 
          (p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.phone_number?.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.user_email?.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
      });

      setProfiles(filteredProfiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (profile) => {
    if (!window.confirm(`Approve ${profile.full_name}'s profile?`)) return;

    try {
      const adminUser = JSON.parse(localStorage.getItem('user'));
      await axios.post(`${API_BASE}/profiles/approve/${profile.type}/${profile.id}`, {
        adminId: adminUser?.id
      });
      alert('✅ Profile approved successfully!');
      fetchProfiles();
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error approving profile:', error);
      alert('❌ Failed to approve profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleReject = async (profile) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!window.confirm(`Reject ${profile.full_name}'s profile?`)) return;

    try {
      const adminUser = JSON.parse(localStorage.getItem('user'));
      await axios.post(`${API_BASE}/profiles/reject/${profile.type}/${profile.id}`, {
        adminId: adminUser?.id,
        rejectionReason: rejectionReason
      });
      alert('✅ Profile rejected');
      fetchProfiles();
      setSelectedProfile(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting profile:', error);
      alert('❌ Failed to reject profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSuspend = async (profile) => {
    const reason = window.prompt(`Reason for suspending ${profile.full_name}'s profile:`);
    if (reason === null) return; // Cancelled

    try {
      const adminUser = JSON.parse(localStorage.getItem('user'));
      await axios.post(`${API_BASE}/profiles/suspend/${profile.type}/${profile.id}`, {
        adminId: adminUser?.id,
        reason: reason || 'Suspended by admin'
      });
      alert('✅ Profile suspended');
      fetchProfiles();
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error suspending profile:', error);
      alert('❌ Failed to suspend profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const getRoleIcon = (type) => {
    switch (type) {
      case 'customer': return '👤';
      case 'owner': return '🏠';
      case 'broker': return '🤝';
      default: return '📋';
    }
  };

  const getRoleLabel = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return <div className="approval-loading">Loading profiles...</div>;
  }

  return (
    <div className="profile-approval">
      <div className="approval-header">
        <h2>👥 Profile Approval Management</h2>
        <p>Review, approve, and manage user access</p>
      </div>

      <div className="filter-tabs">
        <button
          className={filter === 'pending' ? 'active' : ''}
          onClick={() => setFilter('pending')}
        >
          ⏳ Pending
        </button>
        <button
          className={filter === 'approved' ? 'active' : ''}
          onClick={() => setFilter('approved')}
        >
          ✅ Approved
        </button>
        <button
          className={filter === 'rejected' ? 'active' : ''}
          onClick={() => setFilter('rejected')}
        >
          ❌ Rejected
        </button>
        <button
          className={filter === 'suspended' ? 'active' : ''}
          onClick={() => setFilter('suspended')}
        >
          ⏸️ Suspended
        </button>
      </div>
      
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search profiles by name, phone or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="profile-search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>✕</button>
          )}
          <button className="btn-search-trigger" onClick={fetchProfiles}>
            Search
          </button>
        </div>
        <div className="search-stats">
          Showing {profiles.length} {filter} profiles
        </div>
      </div>

      {profiles.length === 0 ? (
        <div className="no-profiles searching">
          <span className="empty-icon">{searchTerm ? '🔍' : '📭'}</span>
          <p>
            {searchTerm 
              ? `No profiles found matching "${searchTerm}" in ${filter}`
              : `No ${filter} profiles found`
            }
          </p>
          {searchTerm && (
            <button className="btn-secondary" onClick={() => setSearchTerm('')} style={{ marginTop: '15px' }}>
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="profiles-grid">
          {profiles.map(profile => (
            <div key={`${profile.type}-${profile.id}`} className="profile-card">
              <div className="profile-card-header">
                <span className="role-badge">{getRoleIcon(profile.type)} {getRoleLabel(profile.type)}</span>
                <span className={`status-badge ${profile.profile_status}`}>
                  {profile.profile_status}
                </span>
              </div>

              <div className="profile-info">
                <h3>{profile.full_name}</h3>
                <p>📞 {profile.phone_number}</p>
                <p>📧 {profile.user_email || 'No email'}</p>
                {profile.license_number && <p>📜 License: {profile.license_number}</p>}
                <p className="profile-date">
                  📅 Submitted: {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>

              <button
                className="btn-view-details"
                onClick={() => setSelectedProfile(profile)}
              >
                👁️ View Full Info
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedProfile && (
        <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{getRoleIcon(selectedProfile.type)} {selectedProfile.full_name}</h3>
                <span className={`status-badge ${selectedProfile.profile_status}`}>
                  {selectedProfile.profile_status.toUpperCase()}
                </span>
              </div>
              <button className="btn-close" onClick={() => setSelectedProfile(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="profile-detail-grid">
                <div className="detail-column">
                  <div className="detail-section">
                    <h4>User Account Info</h4>
                    <p><strong>DB ID:</strong> {selectedProfile.id}</p>
                    <p><strong>User ID:</strong> {selectedProfile.user_id}</p>
                    <p><strong>Email:</strong> {selectedProfile.user_email || 'N/A'}</p>
                    <p><strong>Name:</strong> {selectedProfile.user_name || 'N/A'}</p>
                  </div>

                  <div className="detail-section">
                    <h4>Profile Information</h4>
                    <p><strong>Full Name:</strong> {selectedProfile.full_name}</p>
                    <p><strong>Phone:</strong> {selectedProfile.phone_number}</p>
                    <p><strong>Address:</strong> {selectedProfile.address || 'N/A'}</p>
                    <p><strong>Role Type:</strong> {getRoleLabel(selectedProfile.type)}</p>
                    {selectedProfile.license_number && (
                      <p><strong>License Number:</strong> {selectedProfile.license_number}</p>
                    )}
                    <p><strong>Created:</strong> {new Date(selectedProfile.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="detail-column">
                  <div className="detail-section">
                    <h4>Documents & Photos</h4>
                    <div className="docs-preview-grid">
                      <div>
                        <p><strong>Profile Photo</strong></p>
                        {selectedProfile.profile_photo ? (
                          <img src={selectedProfile.profile_photo} alt="Profile" className="preview-img" />
                        ) : <p className="no-img">No photo</p>}
                      </div>
                      <div>
                        <p><strong>ID Document</strong></p>
                        {selectedProfile.id_document ? (
                          <img src={selectedProfile.id_document} alt="ID" className="preview-img" />
                        ) : <p className="no-img">No document</p>}
                      </div>
                      {selectedProfile.type === 'owner' && selectedProfile.business_license && (
                        <div>
                          <p><strong>Business License</strong></p>
                          <img src={selectedProfile.business_license} alt="License" className="preview-img" />
                        </div>
                      )}
                      {selectedProfile.type === 'broker' && selectedProfile.broker_license && (
                        <div>
                          <p><strong>Broker License</strong></p>
                          <img src={selectedProfile.broker_license} alt="License" className="preview-img" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {(selectedProfile.profile_status === 'rejected' || selectedProfile.profile_status === 'suspended') && selectedProfile.rejection_reason && (
                <div className="detail-section rejection-info" style={{ marginTop: '20px' }}>
                  <h4>Status Reason</h4>
                  <div className="reason-text">{selectedProfile.rejection_reason}</div>
                </div>
              )}

              <div className="modal-footer-actions">
                <div className="management-actions">
                  <div className="rejection-input">
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Reason for rejection/suspension (optional for approval)..."
                      rows="2"
                    />
                  </div>
                  <div className="btn-group">
                    {selectedProfile.profile_status !== 'approved' && (
                      <button className="btn-approve" onClick={() => handleApprove(selectedProfile)}>
                        ✅ {selectedProfile.profile_status === 'approved' ? 'Re-Approve' : 'Approve'}
                      </button>
                    )}
                    {selectedProfile.profile_status !== 'rejected' && (
                      <button className="btn-reject" onClick={() => handleReject(selectedProfile)}>
                        ❌ {selectedProfile.profile_status === 'rejected' ? 'Keep Rejected' : 'Reject'}
                      </button>
                    )}
                    {selectedProfile.profile_status !== 'suspended' && (
                      <button className="btn-suspend" onClick={() => handleSuspend(selectedProfile)}>
                        ⏸️ {selectedProfile.profile_status === 'suspended' ? 'Keep Suspended' : 'Suspend'}
                      </button>
                    )}
                  </div>
                  <div className="decision-info">
                    <small>💡 You can change the decision at any time. All actions are reversible.</small>
                  </div>
                </div>

                <button className="btn-secondary" onClick={() => setSelectedProfile(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileApproval;
