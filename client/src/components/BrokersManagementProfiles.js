import React, { useState, useEffect, useCallback } from 'react';
import './BrokersManagementProfiles.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const BrokersManagementProfiles = ({ user, onLogout }) => {
  const [brokers, setBrokers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;

  const fetchBrokers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`);
      const brokersList = response.data.filter(u => u.role === 'broker');
      setBrokers(brokersList);
    } catch (error) {
      console.error('Error fetching brokers:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers]);

  const handleViewProfile = async (b) => {
    setSelectedBroker(b);
    setLoading(true);
    setShowViewModal(true);

    try {
      const res = await axios.get(`${API_BASE}/profiles/broker/${b.id}`);
      setBrokerProfile(res.data);
    } catch (err) {
      console.warn(`No profile found for broker ${b.id}:`, err.message);
      setBrokerProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (b, profile) => {
    setSelectedBroker(b);
    setBrokerProfile(profile);
    setEditForm({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      address: profile?.address || '',
      broker_license: profile?.broker_license || '',
      license_number: profile?.license_number || ''
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
      if (brokerProfile?.id) {
        await axios.put(`${API_BASE}/profiles/broker/${brokerProfile.id}`, editForm);
        alert('✅ Profile updated successfully!');
        setShowEditModal(false);
        handleViewProfile(selectedBroker);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ Failed to update profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveProfile = async (b, profile) => {
    if (!window.confirm(`Approve ${b.name}'s profile?`)) return;

    try {
      if (profile?.id) {
        await axios.put(`${API_BASE}/profiles/broker/${profile.id}`, {
          profile_status: 'approved'
        });
        await axios.put(`${API_BASE}/users/update/${b.id}`, {
          profile_approved: true,
          profile_completed: true
        });
        alert('✅ Profile approved successfully!');
        handleViewProfile(b);
        fetchBrokers();
      }
    } catch (error) {
      console.error('Error approving profile:', error);
      alert('❌ Failed to approve profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectProfile = async (b, profile) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      if (profile?.id) {
        await axios.put(`${API_BASE}/profiles/broker/${profile.id}`, {
          profile_status: 'rejected',
          rejection_reason: reason
        });
        alert('✅ Profile rejected successfully!');
        handleViewProfile(b);
        fetchBrokers();
      }
    } catch (error) {
      console.error('Error rejecting profile:', error);
      alert('❌ Failed to reject profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredBrokers = brokers.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status) => {
    let bg = '#fef3c7', color = '#92400e', icon = '⏳';
    if (status === 'approved') { bg = '#d1fae5'; color = '#065f46'; icon = '✅'; }
    if (status === 'rejected') { bg = '#fee2e2'; color = '#991b1b'; icon = '❌'; }
    return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: bg, color: color, textTransform: 'uppercase' }}>{icon} {status}</span>;
  };

  return (
    <div className="brokers-management-profiles">
      <PageHeader
        title="Brokers Profile Management"
        subtitle={`Manage and approve broker profiles (${brokers.length} total brokers)`}
        user={user}
        onLogout={onLogout}
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
              <th>Broker</th>
              <th>Email</th>
              <th>Profile Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBrokers.map(b => (
              <tr key={b.id}>
                <td>
                  <div className="broker-cell">
                    <div className="broker-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563ebcc)' }}>
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="broker-name">{b.name}</div>
                    </div>
                  </div>
                </td>
                <td className="email-cell">{b.email}</td>
                <td>
                  {b.profile_approved ? getStatusBadge('approved') : getStatusBadge('pending')}
                </td>
                <td className="date-cell">
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => handleViewProfile(b)}
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
        {filteredBrokers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No brokers matching your criteria</p>
            <button onClick={() => setSearchTerm('')}>Reset Search</button>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedBroker && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>🤝 Broker Profile</h2>
                <p>{selectedBroker.name}</p>
              </div>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="loading">Loading profile...</div>
              ) : brokerProfile ? (
                <div className="profile-details">
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Full Name</label>
                        <p>{brokerProfile.full_name}</p>
                      </div>
                      <div className="detail-item">
                        <label>Phone Number</label>
                        <p>{brokerProfile.phone_number}</p>
                      </div>
                      <div className="detail-item">
                        <label>Address</label>
                        <p>{brokerProfile.address}</p>
                      </div>
                      <div className="detail-item">
                        <label>License Number</label>
                        <p>{brokerProfile.license_number}</p>
                      </div>
                      <div className="detail-item">
                        <label>Status</label>
                        <p>{getStatusBadge(brokerProfile.profile_status)}</p>
                      </div>
                    </div>
                  </div>

                  {brokerProfile.profile_photo && (
                    <div className="detail-section">
                      <h3>Profile Photo</h3>
                      <img src={brokerProfile.profile_photo} alt="Profile" className="profile-image" />
                    </div>
                  )}

                  {brokerProfile.id_document && (
                    <div className="detail-section">
                      <h3>ID Document</h3>
                      <img src={brokerProfile.id_document} alt="ID Document" className="document-image" />
                    </div>
                  )}

                  {brokerProfile.broker_license && (
                    <div className="detail-section">
                      <h3>Broker License</h3>
                      <img src={brokerProfile.broker_license} alt="License" className="document-image" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-profile">
                  <p>No profile found for this broker</p>
                </div>
              )}
            </div>

            {brokerProfile && (
              <div className="modal-footer">
                <button 
                  className="btn-edit"
                  onClick={() => handleEditProfile(selectedBroker, brokerProfile)}
                >
                  ✏️ Edit Profile
                </button>
                {brokerProfile.profile_status === 'pending' && (
                  <>
                    <button 
                      className="btn-approve"
                      onClick={() => handleApproveProfile(selectedBroker, brokerProfile)}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleRejectProfile(selectedBroker, brokerProfile)}
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
      {showEditModal && selectedBroker && brokerProfile && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>✏️ Edit Profile</h2>
                <p>{selectedBroker.name}</p>
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
                  <label>License Number</label>
                  <input
                    type="text"
                    name="license_number"
                    value={editForm.license_number}
                    onChange={handleEditChange}
                    placeholder="Enter license number"
                  />
                </div>

                <div className="form-group">
                  <label>Broker License</label>
                  <input
                    type="text"
                    name="broker_license"
                    value={editForm.broker_license}
                    onChange={handleEditChange}
                    placeholder="Enter broker license"
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

export default BrokersManagementProfiles;
