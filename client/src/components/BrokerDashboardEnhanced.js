import React, { useState, useEffect } from 'react';
import './BrokerDashboard.css';
import axios from 'axios';
import MessageNotificationWidget from './MessageNotificationWidget';
import AIPriceComparison from './AIPriceComparison';

const BrokerDashboardEnhanced = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    rejectedRequests: 0
  });

  useEffect(() => {
    fetchBrokerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const fetchBrokerData = async () => {
    setLoading(true);
    try {
      // Fetch broker profile
      const profileRes = await axios.get(`http://localhost:5000/api/profiles/broker/${user.id}`);
      setBrokerProfile(profileRes.data);

      // Fetch incoming requests (Dual Tables)
      const [agreementsRes, keysRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/agreement-requests/broker/${user.id}`),
        axios.get(`http://localhost:5000/api/key-requests/broker/${user.id}`)
      ]);

      const combined = [
        ...agreementsRes.data.map(r => ({ ...r, request_type: 'agreement' })),
        ...keysRes.data.map(r => ({ ...r, request_type: 'key' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setIncomingRequests(combined);

      // Calculate stats
      const stats = {
        totalRequests: combined.length,
        pendingRequests: combined.filter(r => r.status === 'pending').length,
        acceptedRequests: combined.filter(r => r.status === 'accepted').length,
        rejectedRequests: combined.filter(r => r.status === 'rejected').length
      };
      setStats(stats);

      // Fetch notifications
      const notifRes = await axios.get(`http://localhost:5000/api/notifications/user/${user.id}`);
      setNotifications(notifRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching broker data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowProfileModal(true);
  };

  const handleViewPayment = (request) => {
    setSelectedRequest(request);
    setShowPaymentModal(true);
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.put(`http://localhost:5000/api/agreement-requests/${requestId}/respond`, {
        status: 'accepted',
        responded_by: user.id,
        response_message: 'Request accepted'
      });
      alert('✅ Request accepted successfully!');
      fetchBrokerData();
    } catch (error) {
      alert('❌ Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      await axios.put(`http://localhost:5000/api/agreement-requests/${requestId}/respond`, {
        status: 'rejected',
        responded_by: user.id,
        response_message: reason
      });
      alert('✅ Request rejected');
      fetchBrokerData();
    } catch (error) {
      alert('❌ Failed to reject request');
    }
  };

  if (loading) {
    return <div className="broker-dashboard-loading">Loading broker dashboard...</div>;
  }

  return (
    <div className="broker-dashboard-enhanced">
      {/* Header */}
      <div className="broker-header">
        <div className="broker-header-content">
          <div className="broker-profile-section">
            {brokerProfile?.profile_photo ? (
              <img src={brokerProfile.profile_photo} alt="Profile" className="broker-profile-photo" />
            ) : (
              <div className="broker-profile-placeholder">👤</div>
            )}
            <div className="broker-info">
              <h1>{brokerProfile?.full_name || user.name}</h1>
              <p className="broker-email">{user.email}</p>
              <p className="broker-license">License: {brokerProfile?.license_number || 'Not provided'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setActiveTab('notifications')}
            />
            <button className="btn-logout" onClick={onLogout}>Logout</button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="broker-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📋 Requests ({stats.pendingRequests})
        </button>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
      </div>

      {/* Content */}
      <div className="broker-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <h2>Dashboard Overview</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <h3>{stats.totalRequests}</h3>
                  <p>Total Requests</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <h3>{stats.pendingRequests}</h3>
                  <p>Pending</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>{stats.acceptedRequests}</h3>
                  <p>Accepted</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">❌</div>
                <div className="stat-info">
                  <h3>{stats.rejectedRequests}</h3>
                  <p>Rejected</p>
                </div>
              </div>
            </div>

            {/* Recent Requests */}
            <div className="recent-requests">
              <h3>Recent Requests</h3>
              {incomingRequests.slice(0, 3).map(request => (
                <div key={request.id} className="request-card">
                  <div className="request-header">
                    <h4>{request.property_title}</h4>
                    <span className={`status-badge ${request.status}`}>{request.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', background: request.request_type === 'key' ? '#e0f2fe' : '#f3e8ff', color: request.request_type === 'key' ? '#0369a1' : '#7e22ce', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {request.request_type?.toUpperCase()}
                    </span>
                    <p className="request-customer" style={{ margin: 0 }}>From: {request.customer_name}</p>
                  </div>
                  <p className="request-location">📍 {request.property_location}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="requests-section">
            <h2>Agreement Requests</h2>
            {incomingRequests.length === 0 ? (
              <div className="empty-state">
                <p>No incoming requests</p>
              </div>
            ) : (
              <div className="requests-list">
                {incomingRequests.map(request => (
                  <div key={request.id} className="request-item">
                    <div className="request-main">
                      <div className="request-details">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3>{request.property_title}</h3>
                          <span style={{ fontSize: '12px', background: request.request_type === 'key' ? '#e0f2fe' : '#f3e8ff', color: request.request_type === 'key' ? '#0369a1' : '#7e22ce', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            {request.request_type === 'key' ? '🔑 KEY' : '🤝 AGREEMENT'}
                          </span>
                        </div>
                        <p className="customer-name" style={{ marginTop: '8px' }}>👤 {request.customer_name}</p>
                        <p className="customer-email">📧 {request.customer_email}</p>
                        <p className="property-location">📍 {request.property_location}</p>
                        <p className="request-message">💬 {request.request_message}</p>
                        {request.key_code && (
                          <p style={{ fontWeight: 'bold', color: '#0369a1', marginTop: '10px' }}>🔑 Generated Key: {request.key_code}</p>
                        )}
                      </div>
                      <div className="request-status">
                        <span className={`status-badge ${request.status}`}>{request.status}</span>
                        <p className="request-date">{new Date(request.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn-view"
                        onClick={() => handleViewDetails(request)}
                      >
                        👁️ View Details
                      </button>
                      {request.status === 'pending' && request.request_type === 'agreement' && (
                        <>
                          <button
                            className="btn-payment"
                            onClick={() => handleViewPayment(request)}
                          >
                            💳 Payment
                          </button>
                          <button
                            className="btn-accept"
                            onClick={() => handleAcceptRequest(request.id)}
                          >
                            ✅ Accept
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleRejectRequest(request.id)}
                          >
                            ❌ Reject
                          </button>
                        </>
                      )}
                      {request.status === 'pending' && request.request_type === 'key' && (
                        <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                          Awaiting Admin Response
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <h2>My Profile</h2>
            <div className="profile-card">
              <div className="profile-photo-section">
                {brokerProfile?.profile_photo ? (
                  <img src={brokerProfile.profile_photo} alt="Profile" className="profile-photo-large" />
                ) : (
                  <div className="profile-photo-placeholder">📷 No photo</div>
                )}
                <button className="btn-change-photo">Change Photo</button>
              </div>
              <div className="profile-info">
                <div className="info-group">
                  <label>Full Name</label>
                  <p>{brokerProfile?.full_name || 'Not provided'}</p>
                </div>
                <div className="info-group">
                  <label>Email</label>
                  <p>{user.email}</p>
                </div>
                <div className="info-group">
                  <label>Phone</label>
                  <p>{brokerProfile?.phone_number || 'Not provided'}</p>
                </div>
                <div className="info-group">
                  <label>Address</label>
                  <p>{brokerProfile?.address || 'Not provided'}</p>
                </div>
                <div className="info-group">
                  <label>License Number</label>
                  <p>{brokerProfile?.license_number || 'Not provided'}</p>
                </div>
                <div className="info-group">
                  <label>Profile Status</label>
                  <p className={`status-badge ${brokerProfile?.profile_status}`}>
                    {brokerProfile?.profile_status}
                  </p>
                </div>
              </div>
            </div>
            <button className="btn-edit-profile">✏️ Edit Profile</button>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="notifications-section">
            <h2>Notifications</h2>
            {notifications.length === 0 ? (
              <div className="empty-state">
                <p>No notifications</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map(notif => (
                  <div key={notif.id} className="notification-item">
                    <div className="notification-icon">🔔</div>
                    <div className="notification-content">
                      <h4>{notif.title}</h4>
                      <p>{notif.message}</p>
                      <small>{new Date(notif.created_at).toLocaleString()}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfileModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Details</h2>
              <button className="close-btn" onClick={() => setShowProfileModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-item">
                <strong>Property:</strong> {selectedRequest.property_title}
              </div>
              <div className="detail-item">
                <strong>Location:</strong> {selectedRequest.property_location}
              </div>
              <div className="detail-item">
                <strong>Price:</strong> {selectedRequest.property_price?.toLocaleString()}
              </div>
              <div className="detail-item">
                <strong>Customer:</strong> {selectedRequest.customer_name}
              </div>
              <div className="detail-item">
                <strong>Email:</strong> {selectedRequest.customer_email}
              </div>
              <div className="detail-item">
                <strong>Message:</strong> {selectedRequest.request_message}
              </div>
              <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <AIPriceComparison propertyData={{
                  price: selectedRequest.property_price,
                  type: selectedRequest.property_type || 'apartment',
                  location: selectedRequest.property_location,
                  area: selectedRequest.property_area || 120,
                  bedrooms: selectedRequest.property_bedrooms || 2,
                  bathrooms: selectedRequest.property_bathrooms || 1
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Payment Confirmation</h2>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="payment-info">
                <h3>Payment Details</h3>
                <div className="detail-item">
                  <strong>Property:</strong> {selectedRequest.property_title}
                </div>
                <div className="detail-item">
                  <strong>Amount:</strong> {selectedRequest.property_price?.toLocaleString()}
                </div>
                <div className="detail-item">
                  <strong>Customer:</strong> {selectedRequest.customer_name}
                </div>
                <div className="payment-status">
                  <p>⏳ Awaiting payment confirmation from customer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerDashboardEnhanced;
