import React, { useState, useEffect, useCallback } from 'react';
import './UserProfileManagement.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const UserProfileManagement = ({ user, onLogout, onSettingsClick }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewProfile = async (u) => {
    setSelectedUser(u);
    setLoading(true);
    setShowViewModal(true);

    try {
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      else if (role === 'owner') profileType = 'owner';
      else if (role === 'broker') profileType = 'broker';
      else profileType = null;

      if (profileType) {
        const res = await axios.get(`${API_BASE}/profiles/${profileType}/${u.id}`);
        setUserProfile(res.data);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.warn(`No profile found for user ${u.id}:`, err.message);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = (u, profile) => {
    setSelectedUser(u);
    setUserProfile(profile);
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
      const role = (selectedUser.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      else if (role === 'owner') profileType = 'owner';
      else if (role === 'broker') profileType = 'broker';

      if (profileType && userProfile?.id) {
        await axios.put(`${API_BASE}/profiles/${profileType}/${userProfile.id}`, editForm);
        alert('✅ Profile updated successfully!');
        setShowEditModal(false);
        handleViewProfile(selectedUser);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ Failed to update profile: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveProfile = async (u, profile) => {
    if (!window.confirm(`Approve ${u.name}'s profile?`)) return;

    try {
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      else if (role === 'owner') profileType = 'owner';
      else if (role === 'broker') profileType = 'broker';

      if (profileType && profile?.id) {
        await axios.put(`${API_BASE}/profiles/${profileType}/${profile.id}`, {
          profile_status: 'approved'
        });
        await axios.put(`${API_BASE}/users/update/${u.id}`, {
          profile_approved: true,
          profile_completed: true
        });
        alert('✅ Profile approved successfully!');
        handleViewProfile(u);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error approving profile:', error);
      alert('❌ Failed to approve profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRejectProfile = async (u, profile) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      else if (role === 'owner') profileType = 'owner';
      else if (role === 'broker') profileType = 'broker';

      if (profileType && profile?.id) {
        await axios.put(`${API_BASE}/profiles/${profileType}/${profile.id}`, {
          profile_status: 'rejected',
          rejection_reason: reason
        });
        alert('✅ Profile rejected successfully!');
        handleViewProfile(u);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error rejecting profile:', error);
      alert('❌ Failed to reject profile: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#ef4444', system_admin: '#7c3aed', owner: '#f59e0b',
      broker: '#3b82f6', user: '#10b981', property_admin: '#8b5cf6'
    };
    return colors[role] || '#6b7280';
  };

  const getProfileStatusBadge = (status) => {
    let bg = '#fef3c7', color = '#92400e', icon = '⏳';
    if (status === 'approved') { bg = '#d1fae5'; color = '#065f46'; icon = '✅'; }
    if (status === 'rejected') { bg = '#fee2e2'; color = '#991b1b'; icon = '❌'; }
    return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: bg, color: color, textTransform: 'uppercase' }}>{icon} {status}</span>;
  };

  return (
    <div className="user-profile-management">
      <PageHeader
        title="User Profile Management"
        subtitle={`Manage and approve user profiles (${users.length} total users)`}
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
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="user">Customers</option>
          <option value="owner">Owners</option>
          <option value="broker">Brokers</option>
        </select>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Profile Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar" style={{ background: `linear-gradient(135deg, ${getRoleBadgeColor(u.role)}, ${getRoleBadgeColor(u.role)}cc)` }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="user-name">{u.name}</div>
                      <div className="user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="role-badge" style={{ background: `${getRoleBadgeColor(u.role)}15`, color: getRoleBadgeColor(u.role) }}>
                    {u.role === 'user' ? 'CUSTOMER' : u.role.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  {u.profile_approved ? getProfileStatusBadge('approved') : getProfileStatusBadge('pending')}
                </td>
                <td className="date-cell">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-view"
                      onClick={() => handleViewProfile(u)}
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
        {filteredUsers.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p>No users matching your criteria</p>
            <button onClick={() => { setSearchTerm(''); setRoleFilter('all'); }}>Reset Filters</button>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>👤 User Profile</h2>
                <p>{selectedUser.name} ({selectedUser.role})</p>
              </div>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {loading ? (
                <div className="loading">Loading profile...</div>
              ) : userProfile ? (
                <div className="profile-details">
                  <div className="detail-section">
                    <h3>Personal Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <label>Full Name</label>
                        <p>{userProfile.full_name}</p>
                      </div>
                      <div className="detail-item">
                        <label>Phone Number</label>
                        <p>{userProfile.phone_number}</p>
                      </div>
                      <div className="detail-item">
                        <label>Address</label>
                        <p>{userProfile.address}</p>
                      </div>
                      <div className="detail-item">
                        <label>Status</label>
                        <p>{getProfileStatusBadge(userProfile.profile_status)}</p>
                      </div>
                    </div>
                  </div>

                  {userProfile.profile_photo && (
                    <div className="detail-section">
                      <h3>Profile Photo</h3>
                      <img src={userProfile.profile_photo} alt="Profile" className="profile-image" />
                    </div>
                  )}

                  {userProfile.id_document && (
                    <div className="detail-section">
                      <h3>ID Document</h3>
                      <img src={userProfile.id_document} alt="ID Document" className="document-image" />
                    </div>
                  )}

                  {userProfile.business_license && (
                    <div className="detail-section">
                      <h3>Business License</h3>
                      <img src={userProfile.business_license} alt="License" className="document-image" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-profile">
                  <p>No profile found for this user</p>
                </div>
              )}
            </div>

            {userProfile && (
              <div className="modal-footer">
                <button 
                  className="btn-edit"
                  onClick={() => handleEditProfile(selectedUser, userProfile)}
                >
                  ✏️ Edit Profile
                </button>
                {userProfile.profile_status === 'pending' && (
                  <>
                    <button 
                      className="btn-approve"
                      onClick={() => handleApproveProfile(selectedUser, userProfile)}
                    >
                      ✅ Approve
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleRejectProfile(selectedUser, userProfile)}
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
      {showEditModal && selectedUser && userProfile && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>✏️ Edit Profile</h2>
                <p>{selectedUser.name}</p>
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

                {selectedUser.role === 'owner' && (
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
                )}
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

export default UserProfileManagement;
