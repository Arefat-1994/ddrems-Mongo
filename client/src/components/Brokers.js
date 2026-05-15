import React, { useState, useEffect, useCallback } from 'react';
import './Brokers.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const Brokers = ({ user, onLogout, onSettingsClick }) => {
  const [brokers, setBrokers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    account_status: '',
    license_number: ''
  });

  const API_BASE = `${window.API_URL}`;

  const fetchBrokers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/brokers`);
      setBrokers(response.data);
    } catch (error) {
      console.error('Error fetching brokers:', error);
    }
  }, [API_BASE]);

  const handleViewDetails = (broker) => {
    setSelectedBroker(broker);
    setShowViewModal(true);
  };

  const handleEdit = (broker) => {
    setSelectedBroker(broker);
    setEditForm({
      name: broker.name,
      email: broker.email,
      phone: broker.phone || '',
      account_status: broker.account_status || 'active',
      license_number: broker.license_number || ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(`[Brokers] Updating broker ${selectedBroker.user_id}`, editForm);
      await axios.put(`${API_BASE}/brokers/update/${selectedBroker.user_id}`, editForm);
      alert('✅ Broker updated successfully!');
      setShowEditModal(false);
      fetchBrokers();
    } catch (error) {
      console.error('Error updating broker:', error);
      const msg = error.response?.data?.message || error.message;
      alert(`❌ Failed to update broker: ${msg}`);
    }
  };

  useEffect(() => {
    fetchBrokers();
  }, [fetchBrokers]);

  const filteredBrokers = brokers.filter(broker =>
    broker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    broker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (broker.full_name && broker.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="brokers">
      <PageHeader
        title="Brokers Management"
        subtitle="Manage real estate brokers and their performance"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={
          <button className="btn-primary">
            <span>➕</span> Add New Broker
          </button>
        }
      />

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search brokers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="brokers-grid">
        {filteredBrokers.map(broker => (
          <div key={broker.user_id} className="broker-card">
            <div className="broker-header">
              <div className="broker-avatar">
                {broker.profile_photo ? (
                  <img
                    src={`data:image/jpeg;base64,${broker.profile_photo}`}
                    alt={`${broker.full_name || broker.name}'s profile`}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{
                  display: broker.profile_photo ? 'none' : 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  {(broker.full_name || broker.name).charAt(0).toUpperCase()}
                </div>
              </div>
              <span className={`broker-status ${broker.account_status}`}>
                {broker.account_status || 'active'}
              </span>
            </div>
            <div className="broker-info">
              <h3>{broker.full_name || broker.name}</h3>
              <p>📧 {broker.email}</p>
              <p>📱 {broker.profile_phone || broker.phone || 'Not provided'}</p>
              <p>🆔 License: {broker.license_number || 'Not assigned'}</p>
              {broker.address && <p>📍 {broker.address}</p>}
            </div>
            <div className="broker-stats">
              <div className="stat-item">
                <span className="stat-value">{broker.profile_approved ? '✅' : '⏳'}</span>
                <span className="stat-label">Profile</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{broker.profile_status || 'pending'}</span>
                <span className="stat-label">Status</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">⭐ {broker.profile_completed ? 'Complete' : 'Incomplete'}</span>
                <span className="stat-label">Profile</span>
              </div>
            </div>
            <div className="broker-actions">
              <button className="btn-secondary" onClick={() => handleViewDetails(broker)}>View Details</button>
              <button className="btn-icon" onClick={() => handleEdit(broker)}>✏️</button>
            </div>
          </div>
        ))}
      </div>
      {/* VIEW DETAILS MODAL */}
      {showViewModal && selectedBroker && (
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
                  <span style={{ fontSize: '28px' }}>🏢</span> Broker Comprehensive Profile
                </h2>
                <p style={{ margin: '5px 0 0 40px', color: '#64748b', fontSize: '14px' }}>Complete database information and profile details</p>
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
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedBroker.name}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>System ID</label>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>#{selectedBroker.user_id}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9', gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Primary Email</label>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{selectedBroker.email}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Account Status</label>
                      <span style={{
                        fontWeight: '700',
                        color: selectedBroker.account_status === 'active' ? '#166534' : selectedBroker.account_status === 'suspended' ? '#92400e' : '#64748b',
                        textTransform: 'uppercase',
                        fontSize: '12px'
                      }}>
                        {selectedBroker.account_status || 'active'}
                      </span>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Profile Approved</label>
                      <span style={{
                        fontWeight: '700',
                        color: selectedBroker.profile_approved ? '#166534' : '#92400e'
                      }}>
                        {selectedBroker.profile_approved ? '✅ APPROVED' : '⏳ PENDING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Broker Profile */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#166534', marginBottom: '20px', fontSize: '18px' }}>📋 Broker Profile Information</h3>
                  {selectedBroker.profile_id ? (
                    <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '15px', border: '1px solid #bbf7d0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>FULL REGISTERED NAME</label>
                          <div style={{ fontWeight: '700', color: '#064e3b', fontSize: '17px' }}>{selectedBroker.full_name || selectedBroker.name}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PHONE NUMBER</label>
                          <div style={{ fontWeight: '600' }}>{selectedBroker.profile_phone || selectedBroker.phone || 'Not provided'}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>LICENSE NUMBER</label>
                          <div style={{ fontWeight: '600', color: '#1e40af' }}>{selectedBroker.license_number || 'Not assigned'}</div>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>ADDRESS</label>
                          <div style={{ fontSize: '14px' }}>{selectedBroker.address || 'No address on file'}</div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PROFILE STATUS</label>
                          <div style={{ fontWeight: '700', color: selectedBroker.profile_status === 'approved' ? '#166534' : '#854d0e' }}>
                            {selectedBroker.profile_status || 'pending'}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '4px' }}>PROFILE COMPLETED</label>
                          <div style={{ fontWeight: '700', color: selectedBroker.profile_completed ? '#166534' : '#92400e' }}>
                            {selectedBroker.profile_completed ? 'Complete' : 'Incomplete'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fff7ed', padding: '30px', borderRadius: '15px', border: '1px solid #fed7aa', textAlign: 'center' }}>
                      <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
                      <p style={{ margin: 0, color: '#9a3412', fontWeight: '600' }}>No Profile Submitted Yet</p>
                      <p style={{ margin: '5px 0 0 0', color: '#c2410c', fontSize: '13px' }}>The broker has not completed their profile registration details.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Document Gallery */}
              {selectedBroker.profile_id && (
                <div style={{ marginTop: '30px' }}>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b', marginBottom: '20px', fontSize: '18px' }}>📂 Document & Media Gallery</h3>
                  <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '0 0 250px' }}>
                      <h4 style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>PROFILE PHOTOGRAPH</h4>
                      {selectedBroker.profile_photo ? (
                        <div style={{ width: '250px', height: '250px', borderRadius: '15px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <img src={selectedBroker.profile_photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '250px', height: '250px', background: '#f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
                          No Photo Uploaded
                        </div>
                      )}
                    </div>
                    <div style={{ flex: '0 0 250px' }}>
                      <h4 style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>IDENTIFICATION DOCUMENT</h4>
                      {selectedBroker.id_document ? (
                        <div style={{ width: '250px', height: '250px', borderRadius: '15px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <img src={selectedBroker.id_document} alt="ID Document" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#334155' }} />
                        </div>
                      ) : (
                        <div style={{ width: '250px', height: '250px', background: '#f1f5f9', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '2px dashed #cbd5e1' }}>
                          No ID Document Provided
                        </div>
                      )}
                    </div>
                    {selectedBroker.broker_license && (
                      <div style={{ flex: '0 0 250px' }}>
                        <h4 style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>BROKER LICENSE</h4>
                        <div style={{ width: '250px', height: '250px', borderRadius: '15px', overflow: 'hidden', border: '4px solid white', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                          <img src={selectedBroker.broker_license} alt="Broker License" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#334155' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section 4: Registration Info */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', color: '#1e293b', marginBottom: '20px', fontSize: '18px' }}>📅 Registration Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Account Created</label>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                      {new Date(selectedBroker.registered_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      {new Date(selectedBroker.registered_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  {selectedBroker.profile_created_at && (
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Profile Created</label>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>
                        {new Date(selectedBroker.profile_created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        {new Date(selectedBroker.profile_created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ padding: '20px 30px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowViewModal(false)} style={{ padding: '10px 25px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', color: '#475569' }}>Close Window</button>
              <button
                onClick={() => { handleEdit(selectedBroker); setShowViewModal(false); }}
                style={{ padding: '10px 25px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.4)' }}
              >✏️ Edit Broker Info</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedBroker && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '500px',
            width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #f3f4f6' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit Broker Information</h2>
              <button onClick={() => setShowEditModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Full Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>License Number</label>
                  <input
                    type="text"
                    value={editForm.license_number}
                    onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', fontSize: '14px', marginBottom: '6px' }}>Account Status</label>
                  <select
                    value={editForm.account_status}
                    onChange={(e) => setEditForm({ ...editForm, account_status: e.target.value })}
                    style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', background: 'white', boxSizing: 'border-box' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" onClick={() => setShowEditModal(false)}
                  style={{ padding: '11px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                >Cancel</button>
                <button type="submit"
                  style={{ padding: '11px 24px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)' }}
                >Update Broker</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Brokers;
