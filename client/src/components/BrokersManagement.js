import React, { useState, useEffect } from 'react';
import './BrokersManagement.css';
import AddBroker from './AddBroker';
import axios from 'axios';

const BrokersManagement = ({ onBack }) => {
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroker, setSelectedBroker] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', email: '', role: 'broker', status: 'active',
    full_name: '', profile_phone: '', address: '', license_number: ''
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', email: '', password: '', phone: '',
    full_name: '', address: '', license_number: ''
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/brokers`);
      setBrokers(response.data);
    } catch (error) {
      console.error('Error fetching brokers:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewBrokerDetails = async (broker) => {
    setSelectedBroker(broker);


    setShowDetailModal(true);
  };

  const handleEdit = (broker) => {
    setSelectedBroker(broker);
    setEditForm({
      name: broker.name || '',
      email: broker.email || '',
      role: 'broker', // Forcing broker role here
      status: broker.account_status || 'active',
      full_name: broker.full_name || '',
      profile_phone: broker.profile_phone || '',
      address: broker.address || '',
      license_number: broker.license_number || ''
    });
    setShowEditModal(true);
  };

  const handleAddBroker = async (e) => {
    e.preventDefault();
    try {
      // Create user account
      const userResponse = await axios.post(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/auth/register`, {
        name: addForm.name,
        email: addForm.email,
        phone: addForm.phone,
        password: addForm.password,
        role: 'broker'
      });

      // Create broker profile
      await axios.post(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/brokers`, {
        user_id: userResponse.data.userId,
        full_name: addForm.full_name,
        phone: addForm.phone,
        address: addForm.address,
        license_number: addForm.license_number
      });

      alert('✅ Broker account created successfully!');
      setShowAddModal(false);
      setAddForm({
        name: '', email: '', password: '', phone: '',
        full_name: '', address: '', license_number: ''
      });
      fetchBrokers();
    } catch (error) {
      console.error('Error creating broker:', error);
      alert('❌ Failed to create broker account. Please try again.');
    }
  };

  const handleEditBroker = async (e) => {
    e.preventDefault();
    try {
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;

      // 1. Update User Account
      await axios.put(`${API_BASE}/users/update/${selectedBroker.user_id}`, {
        name: editForm.name,
        email: editForm.email,
        status: editForm.status
      });

      // 2. Update Broker Profile if it exists
      if (selectedBroker.profile_id) {
        await axios.put(`${API_BASE}/profiles/broker/${selectedBroker.profile_id}`, {
          full_name: editForm.full_name,
          phone_number: editForm.profile_phone,
          address: editForm.address,
          license_number: editForm.license_number,
          // Sending existing documents to prevent them from being cleared
          profile_photo: selectedBroker.profile_photo,
          id_document: selectedBroker.id_document,
          broker_license: selectedBroker.broker_license
        });
      }

      alert('✅ Broker information updated successfully!');
      setShowEditModal(false);
      fetchBrokers();
    } catch (error) {
      console.error('Error updating broker:', error);
      alert('❌ Failed to update broker: ' + (error.response?.data?.message || error.message));
    }
  };

  const getProfileStatusBadge = (status) => {
    const badges = {
      approved: { label: 'Approved', color: '#10b981', emoji: '✅' },
      pending: { label: 'Pending', color: '#f59e0b', emoji: '⏳' },
      rejected: { label: 'Rejected', color: '#ef4444', emoji: '❌' },
      null: { label: 'Not Created', color: '#6b7280', emoji: '📝' }
    };
    return badges[status] || badges.null;
  };

  const getAccountStatusBadge = (status) => {
    const badges = {
      active: { label: 'Active', color: '#10b981', emoji: '✅' },
      inactive: { label: 'Inactive', color: '#6b7280', emoji: '⏸️' },
      suspended: { label: 'Suspended', color: '#ef4444', emoji: '🚫' }
    };
    return badges[status] || badges.active;
  };

  const filteredBrokers = brokers
    .filter(broker => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'approved') return broker.profile_status === 'approved';
      if (filterStatus === 'pending') return broker.profile_status === 'pending';
      if (filterStatus === 'no_profile') return !broker.profile_id;
      if (filterStatus === 'active') return broker.account_status === 'active';
      return true;
    })
    .filter(broker => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        broker.name?.toLowerCase().includes(search) ||
        broker.email?.toLowerCase().includes(search) ||
        broker.full_name?.toLowerCase().includes(search) ||
        broker.license_number?.toLowerCase().includes(search)
      );
    });

  if (loading) {
    return <div className="brokers-loading">Loading brokers...</div>;
  }

  return (
    <div className="brokers-management">
      <div className="brokers-header">
        <div>
          <button className="btn-back" onClick={onBack}>← Back to Dashboard</button>
          <h2>🤝 Brokers Management</h2>
          <p>Manage broker accounts and profiles</p>
        </div>
        <button className="btn-add-broker" onClick={() => setShowAddBroker(true)}>
          ➕ Add New Broker
        </button>
      </div>

      {/* Stats Cards */}
      <div className="brokers-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>🤝</div>
          <div className="stat-content">
            <h3>{brokers.length}</h3>
            <p>Total Brokers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}>✅</div>
          <div className="stat-content">
            <h3>{brokers.filter(b => b.profile_status === 'approved').length}</h3>
            <p>Approved Profiles</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>⏳</div>
          <div className="stat-content">
            <h3>{brokers.filter(b => b.profile_status === 'pending').length}</h3>
            <p>Pending Approval</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e0e7ff', color: '#6366f1' }}>🏠</div>
          <div className="stat-content">
            <h3>{brokers.reduce((sum, b) => sum + (parseInt(b.total_properties) || 0), 0)}</h3>
            <p>Total Properties</p>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="brokers-controls">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search by name, email, or license number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="filter-buttons">
          <button
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => setFilterStatus('all')}
          >
            All ({brokers.length})
          </button>
          <button
            className={filterStatus === 'approved' ? 'active' : ''}
            onClick={() => setFilterStatus('approved')}
          >
            ✅ Approved
          </button>
          <button
            className={filterStatus === 'pending' ? 'active' : ''}
            onClick={() => setFilterStatus('pending')}
          >
            ⏳ Pending
          </button>
          <button
            className={filterStatus === 'no_profile' ? 'active' : ''}
            onClick={() => setFilterStatus('no_profile')}
          >
            📝 No Profile
          </button>
          <button
            className={filterStatus === 'active' ? 'active' : ''}
            onClick={() => setFilterStatus('active')}
          >
            ✅ Active Accounts
          </button>
        </div>
      </div>

      {/* Brokers Table */}
      <div className="brokers-table-container">
        <table className="brokers-table">
          <thead>
            <tr>
              <th>Photo</th>
              <th>Broker Info</th>
              <th>Contact</th>
              <th>License</th>
              <th>Profile Status</th>
              <th>Account Status</th>
              <th>Properties</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBrokers.length === 0 ? (
              <tr>
                <td colSpan="9" className="no-data">
                  <div className="empty-state">
                    <span className="empty-icon">🤝</span>
                    <p>No brokers found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredBrokers.map(broker => {
                const profileBadge = getProfileStatusBadge(broker.profile_status);
                const accountBadge = getAccountStatusBadge(broker.account_status);

                return (
                  <tr key={broker.user_id}>
                    <td>
                      {broker.profile_photo ? (
                        <img
                          src={broker.profile_photo}
                          alt={broker.name}
                          className="broker-photo"
                        />
                      ) : (
                        <div className="broker-photo-placeholder">👤</div>
                      )}
                    </td>
                    <td>
                      <div className="broker-info">
                        <strong>{broker.full_name || broker.name}</strong>
                        <span className="broker-id">ID: {broker.user_id}</span>
                      </div>
                    </td>
                    <td>
                      <div className="contact-info">
                        <div>📧 {broker.email}</div>
                        <div>📞 {broker.profile_phone || broker.phone || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <span className="license-number">
                        {broker.license_number || 'Not provided'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: profileBadge.color, color: 'white' }}
                      >
                        {profileBadge.emoji} {profileBadge.label}
                      </span>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ background: accountBadge.color, color: 'white' }}
                      >
                        {accountBadge.emoji} {accountBadge.label}
                      </span>
                    </td>
                    <td>
                      <div className="properties-count">
                        <div>🏠 {broker.total_properties || 0} total</div>
                        <div>✅ {broker.active_properties || 0} active</div>
                      </div>
                    </td>
                    <td>
                      <span className="date-text">
                        {new Date(broker.registered_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="btn-view"
                          onClick={() => viewBrokerDetails(broker)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          👁️ View
                        </button>

                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(broker)}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Broker Detail Modal */}
      {showDetailModal && selectedBroker && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤝 Broker Details</h2>
              <button className="close-btn" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="broker-detail-grid">
                {/* Profile Photo */}
                <div className="detail-section">
                  <h3>Profile Photo</h3>
                  {selectedBroker.profile_photo ? (
                    <img
                      src={selectedBroker.profile_photo}
                      alt={selectedBroker.name}
                      className="detail-photo"
                    />
                  ) : (
                    <div className="no-photo">No photo uploaded</div>
                  )}
                </div>

                {/* Basic Information */}
                <div className="detail-section">
                  <h3>Basic Information</h3>
                  <div className="detail-item">
                    <strong>Full Name:</strong> {selectedBroker.full_name || selectedBroker.name}
                  </div>
                  <div className="detail-item">
                    <strong>Email:</strong> {selectedBroker.email}
                  </div>
                  <div className="detail-item">
                    <strong>Phone:</strong> {selectedBroker.profile_phone || selectedBroker.phone || 'N/A'}
                  </div>
                  <div className="detail-item">
                    <strong>Address:</strong> {selectedBroker.address || 'Not provided'}
                  </div>
                  <div className="detail-item">
                    <strong>User ID:</strong> {selectedBroker.user_id}
                  </div>
                </div>

                {/* License Information */}
                <div className="detail-section">
                  <h3>License Information</h3>
                  <div className="detail-item">
                    <strong>License Number:</strong> {selectedBroker.license_number || 'Not provided'}
                  </div>
                  {selectedBroker.broker_license && (
                    <div className="detail-item">
                      <strong>License Document:</strong>
                      <img
                        src={selectedBroker.broker_license}
                        alt="Broker License"
                        className="detail-document"
                      />
                    </div>
                  )}
                </div>

                {/* ID Document */}
                {selectedBroker.id_document && (
                  <div className="detail-section">
                    <h3>ID Document</h3>
                    <img
                      src={selectedBroker.id_document}
                      alt="ID Document"
                      className="detail-document"
                    />
                  </div>
                )}

                {/* Status Information */}
                <div className="detail-section">
                  <h3>Status Information</h3>
                  <div className="detail-item">
                    <strong>Profile Status:</strong>{' '}
                    <span style={{ color: getProfileStatusBadge(selectedBroker.profile_status).color }}>
                      {getProfileStatusBadge(selectedBroker.profile_status).emoji}{' '}
                      {getProfileStatusBadge(selectedBroker.profile_status).label}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Account Status:</strong>{' '}
                    <span style={{ color: getAccountStatusBadge(selectedBroker.account_status).color }}>
                      {getAccountStatusBadge(selectedBroker.account_status).emoji}{' '}
                      {getAccountStatusBadge(selectedBroker.account_status).label}
                    </span>
                  </div>
                  <div className="detail-item">
                    <strong>Profile Approved:</strong> {selectedBroker.profile_approved ? 'Yes' : 'No'}
                  </div>
                  <div className="detail-item">
                    <strong>Profile Completed:</strong> {selectedBroker.profile_completed ? 'Yes' : 'No'}
                  </div>
                  {selectedBroker.rejection_reason && (
                    <div className="detail-item rejection">
                      <strong>Rejection Reason:</strong> {selectedBroker.rejection_reason}
                    </div>
                  )}
                </div>



                {/* Statistics */}
                <div className="detail-section">
                  <h3>Statistics</h3>
                  <div className="detail-item">
                    <strong>Total Properties:</strong> {selectedBroker.total_properties || 0}
                  </div>
                  <div className="detail-item">
                    <strong>Active Properties:</strong> {selectedBroker.active_properties || 0}
                  </div>
                  <div className="detail-item">
                    <strong>Total Agreements:</strong> {selectedBroker.total_agreements || 0}
                  </div>
                </div>

                {/* Dates */}
                <div className="detail-section">
                  <h3>Important Dates</h3>
                  <div className="detail-item">
                    <strong>Registered:</strong>{' '}
                    {new Date(selectedBroker.registered_at).toLocaleString()}
                  </div>
                  {selectedBroker.profile_created_at && (
                    <div className="detail-item">
                      <strong>Profile Created:</strong>{' '}
                      {new Date(selectedBroker.profile_created_at).toLocaleString()}
                    </div>
                  )}
                  {selectedBroker.profile_updated_at && (
                    <div className="detail-item">
                      <strong>Profile Updated:</strong>{' '}
                      {new Date(selectedBroker.profile_updated_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-edit" onClick={() => { handleEdit(selectedBroker); setShowDetailModal(false); }} style={{
                background: '#f59e0b', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
              }}>
                ✏️ Edit Broker Info
              </button>
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Broker Modal */}
      {showEditModal && selectedBroker && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px',
            width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f3f4f6' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit Broker Settings</h2>
              <button onClick={() => setShowEditModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <form onSubmit={handleEditBroker}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Account Information</h4>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Username (Public)</label>
                  <input
                    type="text" value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '13px', textTransform: 'uppercase' }}>Profile Information</h4>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Full Name (Real)</label>
                  <input
                    type="text" value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="text" value={editForm.profile_phone}
                    onChange={(e) => setEditForm({ ...editForm, profile_phone: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>License Number</label>
                  <input
                    type="text" value={editForm.license_number}
                    onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Address</label>
                  <input
                    type="text" value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
              </div>

              {!selectedBroker.profile_id && (
                <div style={{ marginTop: '15px', padding: '10px', background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', fontSize: '13px', color: '#9a3412' }}>
                  ⚠️ This broker hasn't completed their profile yet. Editing profile fields will only work once a profile record is created by the user.
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowEditModal(false)}
                  style={{ padding: '11px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >Cancel</button>
                <button type="submit"
                  style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)' }}
                >Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Broker Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Add New Broker</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddBroker} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                    required
                    placeholder="Enter broker's full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                    placeholder="broker@company.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    required
                    placeholder="+251912345678"
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    required
                    placeholder="Enter secure password"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    value={addForm.address}
                    onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                    rows="3"
                    placeholder="Enter broker's address"
                  />
                </div>
                <div className="form-group">
                  <label>License Number *</label>
                  <input
                    type="text"
                    value={addForm.license_number}
                    onChange={(e) => setAddForm({ ...addForm, license_number: e.target.value })}
                    required
                    placeholder="Enter broker license number"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  ➕ Create Broker Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Broker Modal */}
      {showAddBroker && (
        <AddBroker
          onClose={() => setShowAddBroker(false)}
          onSuccess={fetchBrokers}
        />
      )}
    </div>
  );
};

export default BrokersManagement;
