import React, { useState, useEffect, useCallback } from 'react';
import './OwnersManagement.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const OwnersManagement = ({ user, onLogout, onSettingsClick }) => {
  const [owners, setOwners] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

  const fetchOwners = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`);
      const ownersList = response.data.filter(u => u.role === 'owner');
      setOwners(ownersList);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const handleViewProfile = async (o) => {
    setSelectedOwner(o);
    setLoading(true);
    setShowViewModal(true);

    try {
      const res = await axios.get(`${API_BASE}/profiles/owner/${o.id}`);
      setOwnerProfile(res.data);
    } catch (err) {
      console.warn(`No profile found for owner ${o.id}:`, err.message);
      setOwnerProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (o, profile) => {
    setSelectedOwner(o);
    setOwnerProfile(profile);
    setEditForm({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      address: profile?.address || '',
      business_license: profile?.business_license || ''
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (ownerProfile?.id) {
        await axios.put(`${API_BASE}/profiles/owner/${ownerProfile.id}`, editForm);
        alert('✅ Profile updated successfully!');
        setShowEditModal(false);
        handleViewProfile(selectedOwner);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ Failed to update profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveProfile = async (o, profile) => {
    if (!window.confirm(`Approve ${o.name}'s profile?`)) return;

    try {
      if (profile?.id) {
        await axios.put(`${API_BASE}/profiles/owner/${profile.id}`, {
          profile_status: 'approved'
        });
        await axios.put(`${API_BASE}/users/update/${o.id}`, {
          profile_approved: true,
          profile_completed: true
        });
        alert('✅ Profile approved successfully!');
        handleViewProfile(o);
        fetchOwners();
      }
    } catch (error) {
      console.error('Error approving profile:', error);
      alert('❌ Failed to approve profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectProfile = async (o, profile) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      if (profile?.id) {
        await axios.put(`${API_BASE}/profiles/owner/${profile.id}`, {
          profile_status: 'rejected',
          rejection_reason: reason
        });
        alert('✅ Profile rejected successfully!');
        handleViewProfile(o);
        fetchOwners();
      }
    } catch (error) {
      console.error('Error rejecting profile:', error);
      alert('❌ Failed to reject profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredOwners = owners.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    let bg = '#fef3c7', color = '#92400e', icon = '⏳';
    if (status === 'approved') { bg = '#d1fae5'; color = '#065f46'; icon = '✅'; }
    if (status === 'rejected') { bg = '#fee2e2'; color = '#991b1b'; icon = '❌'; }
    return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: bg, color: color, textTransform: 'uppercase' }}>{icon} {status}</span>;
  };

  return (
    <div className="owners-management">
      <PageHeader
        title="Owners Management"
        subtitle={`Manage and approve owner profiles (${owners.length} total owners)`}
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
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Owner</th>
              <th>Email</th>
              <th>Profile Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOwners.map(o => (
              <tr key={o.id}>
                <td>
                  <div className="owner-cell">
                    <div className="owner-avatar" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706cc)' }}>
                      {o.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="owner-name">{o.name}</div>
                    </div>
                  </div>
                </td>
                <td className="email-cell">{o.email}</td>
                <td>
                  {o.profile_approved ? getStatusBadge('approved') : getStatusBadge('pending')}
                </td>
                <td className="date-cell">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => handleViewProfile(o)}
                      title="View Profile"
                    >
                      👁️ View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOwners.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No owners matching your criteria</p>
            <button onClick={() => setSearchTerm('')}>Reset Search</button>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedOwner && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>🏢 Owner Profile</h2>
                <p>{selectedOwner.name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="loading">Loading profile...</div>
              ) : ownerProfile ? (
                <div className="profile-details">
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Full Name</label>
                        <p>{ownerProfile.full_name}</p>
                      </div>
                      <div className="detail-item">
                        <label>Phone Number</label>
                        <p>{ownerProfile.phone_number}</p>
                      </div>
                      <div className="detail-item">
                        <label>Address</label>
                        <p>{ownerProfile.address}</p>
                      </div>
                      <div className="detail-item">
                        <label>Status</label>
                        <p>{getStatusBadge(ownerProfile.profile_status)}</p>
                      </div>
                    </div>
                  </div>

                  {ownerProfile.profile_photo && (
                    <div className="detail-section">
                      <h3>Profile Photo</h3>
                      <img src={ownerProfile.profile_photo} alt="Profile" className="profile-image" />
                    </div>
                  )}

                  {ownerProfile.id_document && (
                    <div className="detail-section">
                      <h3>ID Document</h3>
                      <img src={ownerProfile.id_document} alt="ID Document" className="document-image" />
                    </div>
                  )}

                  {ownerProfile.business_license && (
                    <div className="detail-section">
                      <h3>Business License</h3>
                      <img src={ownerProfile.business_license} alt="License" className="document-image" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-profile">
                  <p>No profile found for this owner</p>
                </div>
              )}
            </div>

            {ownerProfile && (
              <div className="modal-footer">
                <button 
                  className="btn-edit"
                  onClick={() => handleEditProfile(selectedOwner, ownerProfile)}
                >
                  ✏️ Edit Profile
                </button>
                {ownerProfile.profile_status === 'pending' && (
                  <>
                    <button 
                      className="btn-approve"
                      onClick={() => handleApproveProfile(selectedOwner, ownerProfile)}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleRejectProfile(selectedOwner, ownerProfile)}
                    >
                      ❌ Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedOwner && ownerProfile && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>✏️ Edit Profile</h2>
                <p>{selectedOwner.name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="edit-form">
              <div className="form-section">
                <h3>Personal Information</h3>
                
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={editForm.full_name}
                    onChange={handleEditChange}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={editForm.phone_number}
                    onChange={handleEditChange}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={editForm.address}
                    onChange={handleEditChange}
                    placeholder="Enter address"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Business License</label>
                  <input
                    type="text"
                    name="business_license"
                    value={editForm.business_license}
                    onChange={handleEditChange}
                    placeholder="Enter business license"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? '⏳ Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnersManagement;
