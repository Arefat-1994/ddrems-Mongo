import React, { useState, useEffect, useCallback } from 'react';
import './Users.css';
import PageHeader from './PageHeader';
import axios from 'axios';
import AddUserModal from './AddUserModal';

const Users = ({ user, onLogout, initialRole, onSettingsClick }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(initialRole || 'all');
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'banned'
  const [profileCompletionMap, setProfileCompletionMap] = useState({}); // { userId: { completed: bool, profile: obj|null } }

  // Update filter if initialRole changes (e.g. navigation from sidebar)
  useEffect(() => {
    if (initialRole) {
      setRoleFilter(initialRole);
    }
  }, [initialRole]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', status: '' });
  const [userProfile, setUserProfile] = useState(null);

  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/users`);
      setUsers(response.data);
      // Fetch profile completion status for all non-admin users
      fetchProfileCompletionData(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  // Check profile completion for all relevant users
  const fetchProfileCompletionData = async (userList) => {
    const profileMap = {};
    const relevantUsers = userList.filter(u => ['user', 'customer', 'owner', 'broker'].includes((u.role || '').toLowerCase()));
    
    await Promise.all(relevantUsers.map(async (u) => {
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      
      try {
        const res = await axios.get(`${API_BASE}/profiles/${profileType}/${u.id}`);
        const profile = res.data;
        // Check if profile has required fields filled
        const hasFullName = !!profile.full_name;
        const hasPhone = !!profile.phone_number;
        const hasProfilePhoto = !!profile.profile_photo;
        const hasIdDocument = !!profile.id_document;
        const isComplete = hasFullName && hasPhone && hasProfilePhoto && hasIdDocument;
        
        profileMap[u.id] = { completed: isComplete, profile: profile, profileType };
      } catch (err) {
        // No profile found = not completed
        profileMap[u.id] = { completed: false, profile: null, profileType };
      }
    }));
    
    setProfileCompletionMap(profileMap);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleView = async (u) => {
    setSelectedUser(u);
    setUserProfile(null);
    setShowViewModal(true);

    // Try to fetch profile data based on role (case-insensitive)
    const role = (u.role || '').toLowerCase();
    let profileType = role;
    if (role === 'user' || role === 'customer') profileType = 'customer';
    else if (role === 'owner') profileType = 'owner';
    else if (role === 'broker') profileType = 'broker';
    else profileType = null;

    if (profileType) {
      try {
        const res = await axios.get(`${API_BASE}/profiles/${profileType}/${u.id}`);
        setUserProfile(res.data);
      } catch (err) {
        console.warn(`No ${profileType} profile found for user ${u.id}:`, err.message);
        setUserProfile(null);
      }
    }


  };

  const handleEdit = (u) => {
    setSelectedUser(u);
    setEditForm({
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'active'
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(`[Users] Submitting edit for ${selectedUser.id}`, editForm);
      await axios.put(`${API_BASE}/users/update/${selectedUser.id}`, editForm);
      alert('✅ User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      const msg = error.response?.data?.message || error.message;
      alert(`❌ Failed to update user: ${msg}`);
    }
  };

  const handleDelete = async (u) => {
    if (u.id === user.id) {
      alert('❌ You cannot delete your own account!');
      return;
    }
    if (u.role === 'admin' || u.role === 'system_admin') {
      alert('❌ Cannot delete admin accounts!');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${u.name}" (${u.email})? This action cannot be undone.`)) return;

    try {
      await axios.delete(`${API_BASE}/users/${u.id}`);
      alert('✅ User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Failed to delete user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleAccountApproval = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.name}'s account?`)) return;

    try {
      console.log(`[Users] Toggling account status for ${u.id} to ${newStatus}`);
      await axios.put(`${API_BASE}/users/update/${u.id}`, {
        status: newStatus
      });
      alert(`✅ User account ${action}d successfully! They can now ${newStatus === 'active' ? 'login' : 'no longer login'}.`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling account status:', error);
      const msg = error.response?.data?.message || error.message;
      alert(`❌ Failed to update account: ${msg}`);
    }
  };

  const handleToggleProfileApproval = async (u) => {
    // Check if profile is fully completed first
    const profileInfo = profileCompletionMap[u.id];
    if (!profileInfo || !profileInfo.completed) {
      alert('⚠️ Cannot approve this user. Their profile is not fully completed.\n\nThe user must fill in all required profile fields (Full Name, Phone Number, Profile Photo, ID Document) before approval.');
      return;
    }

    const newStatus = u.profile_approved ? false : true;
    const action = newStatus ? 'approve' : 'unapprove';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${u.name}'s detailed profile? This will grant them FULL system access.`)) return;

    try {
      console.log(`[Users] Toggling profile approval for ${u.id} to ${newStatus}`);
      
      // Use the profiles API to properly sync both tables
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      else if (role === 'owner') profileType = 'owner';
      else if (role === 'broker') profileType = 'broker';
      
      if (profileType && profileInfo.profile) {
        const profileId = profileInfo.profile.id || profileInfo.profile._id;
        if (newStatus) {
          // Approve via profiles API (syncs both profile table and users table)
          await axios.post(`${API_BASE}/profiles/approve/${profileType}/${profileId}`, { adminId: user.id });
        } else {
          // Unapprove - update users table and profile table
          await axios.put(`${API_BASE}/users/update/${u.id}`, { profile_approved: false });
          await axios.post(`${API_BASE}/profiles/change-status/${profileType}/${profileId}`, {
            newStatus: 'pending',
            adminId: user.id,
            reason: 'Unapproved by admin from users management'
          });
        }
      } else {
        // Fallback: just update the users table
        await axios.put(`${API_BASE}/users/update/${u.id}`, { profile_approved: newStatus });
      }

      alert(`✅ Profile ${action}d successfully!`);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling profile approval:', error);
      const msg = error.response?.data?.message || error.message;
      alert(`❌ Failed to update profile: ${msg}`);
    }
  };

  const handleRejectProfile = async (u) => {
    const reason = window.prompt(`Enter rejection reason for ${u.name}:`);
    if (reason === null) return; // User cancelled
    if (!reason.trim()) {
      alert('⚠️ Please provide a rejection reason.');
      return;
    }
    
    try {
      const profileInfo = profileCompletionMap[u.id];
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      
      if (profileInfo && profileInfo.profile) {
        const profileId = profileInfo.profile.id || profileInfo.profile._id;
        await axios.post(`${API_BASE}/profiles/reject/${profileType}/${profileId}`, {
          adminId: user.id,
          rejectionReason: reason
        });
      } else {
        await axios.put(`${API_BASE}/users/update/${u.id}`, { profile_approved: false, status: 'rejected' });
      }
      alert(`✅ Profile rejected successfully.`);
      fetchUsers();
    } catch (error) {
      console.error('Error rejecting profile:', error);
      alert(`❌ Failed to reject profile: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleSuspendProfile = async (u) => {
    const reason = window.prompt(`Enter suspension reason for ${u.name}:`);
    if (reason === null) return;
    if (!reason.trim()) {
      alert('⚠️ Please provide a suspension reason.');
      return;
    }
    
    try {
      const profileInfo = profileCompletionMap[u.id];
      const role = (u.role || '').toLowerCase();
      let profileType = role;
      if (role === 'user' || role === 'customer') profileType = 'customer';
      
      if (profileInfo && profileInfo.profile) {
        const profileId = profileInfo.profile.id || profileInfo.profile._id;
        await axios.post(`${API_BASE}/profiles/suspend/${profileType}/${profileId}`, {
          adminId: user.id,
          reason: reason
        });
      } else {
        await axios.put(`${API_BASE}/users/update/${u.id}`, { status: 'suspended' });
      }
      alert(`✅ Profile suspended successfully.`);
      fetchUsers();
    } catch (error) {
      console.error('Error suspending profile:', error);
      alert(`❌ Failed to suspend profile: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleStatusChange = async (u, newStatus) => {
    if (!window.confirm(`Change ${u.name}'s status to ${newStatus}?`)) return;

    try {
      console.log(`[Users] Changing status for ${u.id} to ${newStatus}`);
      await axios.put(`${API_BASE}/users/update/${u.id}`, {
        status: newStatus
      });
      alert(`✅ User status updated to ${newStatus}`);
      fetchUsers();
    } catch (error) {
      console.error('Error changing status:', error);
      const msg = error.response?.data?.message || error.message;
      alert(`❌ Failed to update status: ${msg}`);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const isBanned = u.status === 'suspended' || u.status === 'banned';
    
    if (viewMode === 'banned') {
      return matchesSearch && matchesRole && isBanned;
    }
    return matchesSearch && matchesRole && !isBanned;
  });

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#ef4444', system_admin: '#7c3aed', owner: '#f59e0b',
      broker: '#3b82f6', user: '#10b981', property_admin: '#8b5cf6'
    };
    return colors[role] || '#6b7280';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'active').toLowerCase();
    let bg = '#d1fae5', color = '#065f46';
    if (s === 'inactive') { bg = '#f3f4f6'; color = '#374151'; }
    if (s === 'suspended') { bg = '#fee2e2'; color = '#991b1b'; }
    if (s === 'pending') { bg = '#fef3c7'; color = '#92400e'; }
    return <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: bg, color: color, textTransform: 'uppercase' }}>{s}</span>;
  };

  return (
    <div className="users">
      <PageHeader
        title="Users Management"
        subtitle={`Manage system users and their access (${users.length} total)`}
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={
          (user?.role === 'admin' || user?.role === 'system_admin') && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-primary" 
                onClick={() => { setRoleFilter('broker'); setShowAddModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: '600' }}
              >
                <span>🤝+</span> Add Broker
              </button>
              <button 
                className="btn-primary" 
                onClick={() => { setRoleFilter('property_admin'); setShowAddModal(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', background: '#8b5cf6' }}
              >
                <span>🛡️+</span> Add PropertyAdmin
              </button>
            </div>
          )
        }
      />

      <div className="filters-bar" style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 36px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '10px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: 'white' }}
        >
          <option value="all">All Roles</option>
          <option value="user">Customers</option>
          <option value="owner">Owners</option>
          <option value="broker">Brokers</option>
          <option value="admin">Admins</option>
          <option value="property_admin">Property Admins</option>
          <option value="system_admin">System Admins</option>
        </select>
        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
          <button 
            onClick={() => setViewMode('all')}
            style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: 'none', background: viewMode === 'all' ? '#e2e8f0' : 'transparent', color: viewMode === 'all' ? '#0f172a' : '#64748b' }}
          >
            Active Users
          </button>
          <button 
            onClick={() => setViewMode('banned')}
            style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: 'none', background: viewMode === 'banned' ? '#fee2e2' : 'transparent', color: viewMode === 'banned' ? '#991b1b' : '#64748b' }}
          >
            Banned Accounts
          </button>
        </div>
      </div>

      {/* ORIGINAL TABLE VIEW */}
      <div className="table-container" style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status & Profile</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Joined</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: `linear-gradient(135deg, ${getRoleBadgeColor(u.role)}, ${getRoleBadgeColor(u.role)}cc)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', color: 'white', fontSize: '15px', flexShrink: 0
                    }}>
                      {(u.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{u.name || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{u.email || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                    background: `${getRoleBadgeColor(u.role)}15`, color: getRoleBadgeColor(u.role),
                    textTransform: 'uppercase'
                  }}>
                    {u.role === 'user' ? 'CUSTOMER' : (u.role || '').replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>ACC:</span>
                      {getStatusBadge(u.status)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>PRO:</span>
                      <span style={{
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                        background: u.profile_approved ? '#dcfce7' : '#fef9c3',
                        color: u.profile_approved ? '#166534' : '#854d0e'
                      }}>
                        {u.profile_approved ? 'APPROVED' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>
                  {(() => {
                    if (u.created_at) {
                      const d = new Date(u.created_at);
                      if (!isNaN(d.getTime())) return d.toLocaleDateString();
                    }
                    // Fallback: extract timestamp from MongoDB ObjectId
                    if (u._id && typeof u._id === 'string' && u._id.length === 24) {
                      try {
                        const ts = parseInt(u._id.substring(0, 8), 16) * 1000;
                        const d = new Date(ts);
                        if (!isNaN(d.getTime())) return d.toLocaleDateString();
                      } catch (e) { /* ignore */ }
                    }
                    if (u.id && typeof u.id === 'string' && u.id.length === 24) {
                      try {
                        const ts = parseInt(u.id.substring(0, 8), 16) * 1000;
                        const d = new Date(ts);
                        if (!isNaN(d.getTime())) return d.toLocaleDateString();
                      } catch (e) { /* ignore */ }
                    }
                    return 'N/A';
                  })()}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button onClick={() => handleView(u)}
                      style={{ padding: '7px 11px', background: '#ebf5ff', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#1d4ed8', fontWeight: '600' }}>👁️ View</button>
                    
                    {u.status !== 'active' ? (
                      <button onClick={() => handleToggleAccountApproval(u)}
                        style={{ padding: '7px 11px', background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#047857', fontWeight: '600' }}>✅ Activate Account</button>
                    ) : (
                      !u.profile_approved && !['admin', 'system_admin', 'property_admin'].includes(u.role) && (() => {
                        const profileInfo = profileCompletionMap[u.id];
                        const isProfileComplete = profileInfo && profileInfo.completed;
                        return (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button 
                              onClick={() => isProfileComplete ? handleToggleProfileApproval(u) : alert('⚠️ Cannot approve: Profile is not fully completed.\n\nThe user must fill in all required profile fields (Full Name, Phone Number, Profile Photo, ID Document) before approval.')}
                              style={{ 
                                padding: '7px 11px', 
                                background: isProfileComplete ? '#f0fdf4' : '#f3f4f6', 
                                border: `1px solid ${isProfileComplete ? '#86efac' : '#d1d5db'}`, 
                                borderRadius: '8px', 
                                cursor: isProfileComplete ? 'pointer' : 'not-allowed', 
                                fontSize: '13px', 
                                color: isProfileComplete ? '#166534' : '#9ca3af', 
                                fontWeight: '600',
                                opacity: isProfileComplete ? 1 : 0.7
                              }}
                              title={isProfileComplete ? 'Approve this user profile' : 'Profile not fully completed - cannot approve'}
                            >
                              {isProfileComplete ? '📄 Approve Profile' : '🚫 Profile Incomplete'}
                            </button>
                          </div>
                        );
                      })()
                    )}

                    <button onClick={() => handleEdit(u)}
                      style={{ padding: '7px 11px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#92400e', fontWeight: '600' }}>✏️ Edit</button>
                    
                    {u.status === 'active' && (
                      <button onClick={() => handleStatusChange(u, 'suspended')}
                        style={{ padding: '7px 11px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#c2410c', fontWeight: '600' }}>⏸️ Suspend</button>
                    )}
                    <button onClick={() => handleDelete(u)}
                      style={{ padding: '7px 11px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>🗑️ Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
            <p style={{ fontSize: '18px', fontWeight: '500' }}>No users matching your criteria</p>
            <button onClick={() => { setSearchTerm(''); setRoleFilter('all'); }} style={{ marginTop: '15px', padding: '8px 20px', background: 'none', border: '2px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#64748b' }}>Reset Filters</button>
          </div>
        )}
      </div>

      {/* VIEW MODAL (FULL INFO) */}
      {showViewModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)'
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '20px', padding: '0', maxWidth: '1000px',
            width: '95%', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div>
                <h2 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>👤</span> User Comprehensive Profile
                </h2>
                <p style={{ margin: '5px 0 0 40px', color: '#64748b', fontSize: '14px' }}>Complete database information and linked profile data</p>
              </div>
              <button onClick={() => setShowViewModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '30px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>

                {/* Section 1: Core Account */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b', marginBottom: '20px', fontSize: '18px' }}>🔐 Core Account Details</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Account Name</label>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedUser?.name || 'N/A'}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>System ID</label>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>#{selectedUser?.id || 'N/A'}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Primary Email</label>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedUser?.email || 'N/A'}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>User Role</label>
                      <span style={{ fontWeight: '700', color: getRoleBadgeColor(selectedUser?.role || ''), fontSize: '13px' }}>{(selectedUser?.role || '').toUpperCase()}</span>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Account Status</label>
                      <div style={{ fontWeight: '600' }}>{getStatusBadge(selectedUser?.status || 'active')}</div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Detailed Profile */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#166534', marginBottom: '20px', fontSize: '18px' }}>📋 Detailed Profile Profile</h3>
                  {userProfile ? (
                    <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '15px', border: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>FULL REGISTERED NAME</label>
                          <div style={{ fontWeight: '700', color: '#064e3b', fontSize: '17px' }}>{userProfile.full_name}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PHONE NUMBER</label>
                          <div style={{ fontWeight: '600' }}>{userProfile.phone_number || 'Not provided'}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PROFILE STATUS</label>
                          <div style={{ fontWeight: '700', color: (userProfile?.profile_status || '').toLowerCase() === 'approved' ? '#166534' : '#854d0e' }}>
                            {(userProfile?.profile_status || '').toUpperCase()}
                          </div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>ADDRESS</label>
                          <div style={{ fontSize: '14px' }}>{userProfile.address || 'No address on file'}</div>
                        </div>
                        {userProfile.license_number && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>LICENSE / CREDENTIALS</label>
                            <div style={{ fontWeight: '600', color: '#1e40af' }}>{userProfile.license_number}</div>
                          </div>
                        )}
                        {(userProfile.business_license || userProfile.broker_license) && (
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PROFESSIONAL LICENSE DOCUMENT</label>
                            <div style={{ marginTop: '5px' }}>
                              <a 
                                href={userProfile.business_license || userProfile.broker_license} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ color: '#2563eb', fontSize: '13px', textDecoration: 'underline', fontWeight: '600' }}
                              >
                                🔍 Click to View License Document
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff7ed', padding: '30px', borderRadius: '15px', border: '1px solid #fed7aa', textAlign: 'center' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                      <p style={{ margin: 0, color: '#9a3412', fontWeight: '600' }}>No Profile Submitted Yet</p>
                      <p style={{ margin: '5px 0 0 0', color: '#c2410c', fontSize: '13px' }}>The user has not completed their profile registration details.</p>
                    </div>
                  )}
                </div>
              </div>



              {/* Section 4: Document Gallery */}
              {userProfile && (
                <div style={{ marginTop: '30px' }}>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b', marginBottom: '20px', fontSize: '18px' }}>📂 Document & Media Gallery</h3>
                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '0 0 250px' }}>
                      <h4 style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>PROFILE PHOTOGRAPH</h4>
                      {userProfile.profile_photo ? (
                        <div style={{ width: '250px', height: '250px', borderRadius: '15px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <img src={userProfile.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '250px', height: '250px', background: '#f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
                          No Photo Uploaded
                        </div>
                      )}
                    </div>
                    <div style={{ flex: '1', minWidth: '350px' }}>
                      <h4 style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>IDENTIFICATION / LEGAL DOCUMENTS</h4>
                      {userProfile.id_document ? (
                        <div style={{ width: '100%', height: '250px', borderRadius: '15px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <img src={userProfile.id_document} alt="ID Document" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#334155' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '250px', background: '#f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
                          No ID Document Provided
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ padding: '20px 30px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowViewModal(false)} style={{ padding: '10px 25px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Close Window</button>

              <button
                onClick={() => { handleEdit(selectedUser); setShowViewModal(false); }}
                style={{ padding: '10px 25px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.4)' }}
              >✏️ Edit Account Info</button>

              {!selectedUser?.profile_approved && !['admin', 'system_admin', 'property_admin'].includes(selectedUser?.role) && (() => {
                const profileInfo = profileCompletionMap[selectedUser?.id];
                const isProfileComplete = profileInfo && profileInfo.completed;
                return (
                  <>
                    {isProfileComplete && userProfile ? (
                      <>
                        <button
                          onClick={() => { handleToggleProfileApproval(selectedUser); setShowViewModal(false); }}
                          style={{ padding: '10px 25px', background: '#10b981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}
                        >✅ Approve Profile</button>
                        <button
                          onClick={() => { handleRejectProfile(selectedUser); setShowViewModal(false); }}
                          style={{ padding: '10px 25px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.4)' }}
                        >❌ Reject Profile</button>
                        <button
                          onClick={() => { handleSuspendProfile(selectedUser); setShowViewModal(false); }}
                          style={{ padding: '10px 25px', background: '#f97316', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(249, 115, 22, 0.4)' }}
                        >⏸️ Suspend Profile</button>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px' }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <span style={{ fontSize: '13px', color: '#92400e', fontWeight: '600' }}>
                          {!userProfile ? 'Profile not submitted yet — cannot approve' : 'Profile incomplete — cannot approve'}
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '500px',
            width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f3f4f6' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit User Settings</h2>
              <button onClick={() => setShowEditModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Full Name (Public)</label>
                  <input
                    type="text" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Access Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="user">Customer</option>
                    <option value="owner">Property Owner</option>
                    <option value="broker">Broker</option>
                    <option value="property_admin">Property Admin</option>
                    <option value="admin">Admin</option>
                    <option value="system_admin">System Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="active">Active / Verified</option>
                    <option value="inactive">Inactive / New</option>
                    <option value="suspended">Suspended / Blocked</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowEditModal(false)}
                  style={{ padding: '11px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >Cancel</button>
                <button type="submit"
                  style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)' }}
                >Update Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddModal && (
        <AddUserModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            fetchUsers();
          }}
          initialRole={roleFilter !== 'all' ? roleFilter : 'user'}
        />
      )}
    </div>
  );
};

export default Users;
