import React, { useState, useEffect } from 'react';
import './BrokerDashboard.css';
import axios from 'axios';
import DashboardHeader from './DashboardHeader';
import MessageNotificationWidget from './MessageNotificationWidget';
import BrowseProperties from './BrowseProperties';
import BrokerEngagement from './BrokerEngagement';
import AgreementManagement from './AgreementManagement';

const BrokerDashboardEnhanced = ({ user, onLogout, setCurrentPage }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [brokerProfile, setBrokerProfile] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissions, setCommissions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [commSummary, setCommSummary] = useState({ total_paid: 0, total_pending: 0, total_amount: 0 });
  const [brokerEngagements, setBrokerEngagements] = useState([]);
  const [selectedEngagementToView, setSelectedEngagementToView] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [brokerHolds, setBrokerHolds] = useState([]);
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
      const profileRes = await axios.get(`http://${window.location.hostname}:5000/api/profiles/broker/${user.id}`);
      setBrokerProfile(profileRes.data);

      // Fetch incoming requests
      const agreementsRes = await axios.get(`http://${window.location.hostname}:5000/api/agreement-requests/broker/${user.id}`);

      const combined = [
        ...agreementsRes.data.map(r => ({ ...r, request_type: 'agreement' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      setIncomingRequests(combined);

      // Calculate stats
      const calculatedStats = {
        totalRequests: combined.length,
        pendingRequests: combined.filter(r => r.status === 'pending').length,
        acceptedRequests: combined.filter(r => r.status === 'accepted').length,
        rejectedRequests: combined.filter(r => r.status === 'rejected').length
      };
      setStats(calculatedStats);

      // Fetch notifications
      const notifRes = await axios.get(`http://${window.location.hostname}:5000/api/notifications/user/${user.id}`);
      setNotifications(notifRes.data.slice(0, 5));

      // Fetch Commissions (with resilient error handling)
      try {
        const commRes = await axios.get(`http://${window.location.hostname}:5000/api/commissions/broker/${user.id}`);
        setCommissions(Array.isArray(commRes.data) ? commRes.data : []);
      } catch (commErr) { console.warn('Commission fetch failed:', commErr.message); }

      try {
        const summaryRes = await axios.get(`http://${window.location.hostname}:5000/api/commissions/broker/${user.id}/summary`);
        setCommSummary(summaryRes.data || { total_paid: 0, total_pending: 0, total_amount: 0 });
      } catch (sumErr) { console.warn('Summary fetch failed:', sumErr.message); }

      // Fetch Broker Engagements for Agreements tab
      try {
        const engRes = await axios.get(`http://${window.location.hostname}:5000/api/broker-engagement/broker/${user.id}`);
        setBrokerEngagements(engRes.data.engagements || []);
      } catch (engErr) { console.warn('Engagements fetch failed:', engErr.message); }

      // Fetch Customers
      try {
        const custRes = await axios.get(`http://${window.location.hostname}:5000/api/broker-engagement/broker/${user.id}/customers`);
        setCustomers(custRes.data.customers || []);
      } catch (custErr) { console.warn('Customers fetch failed:', custErr.message); }

      // Fetch Broker Holds
      try {
        const holdsRes = await axios.get(`http://${window.location.hostname}:5000/api/broker-bookings?broker_id=${user.id}`);
        setBrokerHolds(holdsRes.data);
      } catch (err) { console.warn('Holds fetch failed:', err.message); }

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
      await axios.put(`http://${window.location.hostname}:5000/api/agreement-requests/${requestId}/respond`, {
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
      await axios.put(`http://${window.location.hostname}:5000/api/agreement-requests/${requestId}/respond`, {
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
      <DashboardHeader
        user={user}
        onLogout={onLogout}
        dashboardTitle="🏢 Broker Dashboard"
        onSettingsClick={() => setCurrentPage && setCurrentPage('settings')}
      />

      {/* Action Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '15px 30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <MessageNotificationWidget 
          userId={user?.id}
          onNavigateToMessages={() => setCurrentPage('messages')}
        />
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
          disabled={brokerProfile?.profile_status !== 'approved'}
        >
          📋 Requests ({stats.pendingRequests}) {brokerProfile?.profile_status !== 'approved' && '🔒'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'engagements' ? 'active' : ''}`}
          onClick={() => setActiveTab('engagements')}
          disabled={brokerProfile?.profile_status !== 'approved'}
        >
          🤝 Engagements {brokerProfile?.profile_status !== 'approved' && '🔒'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
          disabled={brokerProfile?.profile_status !== 'approved'}
        >
          👥 Customers {brokerProfile?.profile_status !== 'approved' && '🔒'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'agreements' ? 'active' : ''}`}
          onClick={() => setActiveTab('agreements')}
          disabled={brokerProfile?.profile_status !== 'approved'}
        >
          📑 Agreements {brokerProfile?.profile_status !== 'approved' && '🔒'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'commissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('commissions')}
          disabled={brokerProfile?.profile_status !== 'approved'}
        >
          💰 Commissions {brokerProfile?.profile_status !== 'approved' && '🔒'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'holds' ? 'active' : ''}`}
          onClick={() => setActiveTab('holds')}
          disabled={brokerProfile?.profile_status !== 'approved'}
        >
          ⏱️ Holds {brokerProfile?.profile_status !== 'approved' && '🔒'}
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
        {/* Status Alerts */}
        <div style={{ padding: '0 30px', marginTop: '20px' }}>
          {brokerProfile?.profile_status === 'pending' && activeTab !== 'profile' && (
            <div className="alert alert-info">
              ⏳ Your broker profile is currently <strong>pending approval</strong> from the system administrator. You will have full access once approved.
            </div>
          )}
          {brokerProfile?.profile_status === 'rejected' && activeTab !== 'profile' && (
            <div className="alert alert-danger" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <strong>❌ Profile Rejected</strong>
                <p style={{ margin: '5px 0 0 0' }}>{brokerProfile?.rejection_reason || 'Please review your documents and resubmit.'}</p>
              </div>
              <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setActiveTab('profile')}>Update Profile</button>
            </div>
          )}
          {brokerProfile?.profile_status === 'suspended' && activeTab !== 'profile' && (
            <div className="alert alert-warning">
              ⏸️ Your account has been suspended by an administrator. Please contact support.
            </div>
          )}
        </div>

        {/* Profile Gate */}
        {brokerProfile?.profile_status !== 'approved' && activeTab !== 'profile' && activeTab !== 'notifications' && (
          <div className="profile-gate" style={{ padding: '60px 20px', textAlign: 'center', background: 'white', borderRadius: '15px', margin: '20px 30px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔐</div>
            <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>Profile Approval Required</h2>
            <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 20px' }}>
              Access to the property marketplace and agreement requests is restricted until your broker profile is verified and approved by the system admin.
            </p>
            <button className="btn-primary" onClick={() => setActiveTab('profile')}>
              Go to Profile Settings
            </button>
          </div>
        )}

        {/* Tab Content (vetted by gate above) */}
        {(brokerProfile?.profile_status === 'approved' || activeTab === 'profile' || activeTab === 'notifications') && (
          <>
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

            {/* Engagements Tab */}
            {activeTab === 'engagements' && (
              <div className="engagements-section" style={{ padding: '0 30px' }}>
                <BrokerEngagement 
                  user={user} 
                  onLogout={onLogout} 
                  openEngagement={selectedEngagementToView} 
                />
              </div>
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <div className="customers-section" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h2>My Customers</h2>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>{customers.length} unique customers</span>
                </div>
                {customers.length === 0 ? (
                  <div className="empty-state">
                    <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
                    <p>You haven't been hired by any customers yet.</p>
                  </div>
                ) : (
                  <div className="customers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {customers.map(cust => (
                      <div key={cust.id} className="stat-card" style={{ display: 'block', height: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                          <div style={{ width: '50px', height: '50px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                            👤
                          </div>
                          <div>
                            <h4 style={{ margin: 0 }}>{cust.name}</h4>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{cust.email}</p>
                          </div>
                        </div>
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                            <span>Engagements:</span>
                            <strong>{cust.engagement_count}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span>Latest Status:</span>
                            <span className={`status-badge ${cust.latest_status}`}>{cust.latest_status?.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                        <button className="btn-view" style={{ width: '100%', marginTop: '15px' }} onClick={() => {
                            setActiveTab('engagements');
                        }}>View History</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Agreements Tab — Broker Agreement Progress Tracker */}
            {activeTab === 'agreements' && (
              <div style={{ padding: '30px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>📑 My Agreements</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Track your engagement progress, agreements, and deal status</p>
                  </div>
                </div>

                {/* Summary Stats */}
                {(() => {
                  const completed = brokerEngagements.filter(e => e.status === 'completed').length;
                  const active = brokerEngagements.filter(e => !['completed', 'cancelled', 'declined', 'rejected'].includes(e.status)).length;
                  const total = brokerEngagements.length;
                  const totalValue = brokerEngagements.reduce((s, e) => s + Number(e.agreed_price || e.current_offer || 0), 0);
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                      {[
                        { label: 'All', count: total, color: '#3b82f6', bg: '#eff6ff', icon: '📋' },
                        { label: 'Active', count: active, color: '#f59e0b', bg: '#fffbeb', icon: '⏳' },
                        { label: 'Completed', count: completed, color: '#10b981', bg: '#ecfdf5', icon: '🎉' },
                        { label: 'Deal Volume', count: `${(totalValue / 1000).toFixed(0)}K`, color: '#8b5cf6', bg: '#f5f3ff', icon: '💰' },
                      ].map((stat, i) => (
                        <div key={i} style={{ background: stat.bg, padding: '18px 16px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${stat.color}20` }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>{stat.icon}</div>
                          <div style={{ fontSize: '28px', fontWeight: '700', color: stat.color }}>{stat.count}</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: stat.color }}>{stat.label}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Separated Engagements List */}
                {(() => {
                  if (brokerEngagements.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '60px', color: '#64748b', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📑</div>
                        <h3>No engagements found</h3>
                        <p>Browse properties and start engaging with buyers to see your agreements here.</p>
                      </div>
                    );
                  }

                  const inProgressList = brokerEngagements.filter(eng => !['completed', 'cancelled', 'rejected', 'declined', 'broker_declined'].includes(eng.status));
                  const completedList = brokerEngagements.filter(eng => eng.status === 'completed');

                  const renderEngagementCard = (eng, isNested = false) => {
                    const statusMap = {
                      'created': { emoji: '📝', label: 'Created', color: '#64748b' },
                      'pending_broker_acceptance': { emoji: '⏳', label: 'Pending Acceptance', color: '#f59e0b' },
                      'broker_accepted': { emoji: '✅', label: 'Accepted', color: '#10b981' },
                      'broker_declined': { emoji: '❌', label: 'Declined', color: '#ef4444' },
                      'draft_offer_sent': { emoji: '📋', label: 'Draft Sent', color: '#f59e0b' },
                      'broker_negotiating': { emoji: '🤝', label: 'Broker Negotiating', color: '#3b82f6' },
                      'buyer_approved_draft': { emoji: '👍', label: 'Buyer Approved', color: '#10b981' },
                      'pending_buyer_approval': { emoji: '⏳', label: 'Pending Approval', color: '#f59e0b' },
                      'buyer_rejected_draft': { emoji: '👎', label: 'Buyer Rejected', color: '#ef4444' },
                      'price_presented': { emoji: '💰', label: 'Price Presented', color: '#8b5cf6' },
                      'owner_accepted': { emoji: '🤝', label: 'Owner Accepted', color: '#10b981' },
                      'owner_counter': { emoji: '🔄', label: 'Owner Counter', color: '#f97316' },
                      'owner_counter_offered': { emoji: '🔄', label: 'Owner Counter-Offered', color: '#f97316' },
                      'broker_reviewing_counter': { emoji: '🔍', label: 'Reviewing Counter', color: '#8b5cf6' },
                      'owner_rejected': { emoji: '❌', label: 'Owner Rejected', color: '#ef4444' },
                      'awaiting_buyer_authorization': { emoji: '🔔', label: 'Awaiting Authorization', color: '#dc2626' },
                      'broker_finalizing': { emoji: '✅', label: 'Broker Finalizing', color: '#22c55e' },
                      'agreement_generated': { emoji: '📄', label: 'Agreement Ready', color: '#3b82f6' },
                      'pending_signatures': { emoji: '✍️', label: 'Pending Signatures', color: '#6366f1' },
                      'fully_signed': { emoji: '🔒', label: 'Fully Signed', color: '#6366f1' },
                      'payment_submitted': { emoji: '💳', label: 'Payment Submitted', color: '#f97316' },
                      'payment_verified': { emoji: '✅', label: 'Payment Verified', color: '#14b8a6' },
                      'payment_rejected': { emoji: '❌', label: 'Payment Rejected', color: '#ef4444' },
                      'handover_confirmed': { emoji: '🔑', label: 'Handover Confirmed', color: '#22c55e' },
                      'completed': { emoji: '🎉', label: 'Completed', color: '#059669' },
                    };
                    const badge = statusMap[eng.status] || { emoji: '❓', label: eng.status, color: '#6b7280' };
                    const isRental = eng.engagement_type === 'rent';
                    const price = Number(eng.agreed_price || eng.current_offer || eng.starting_offer || 0);
                    const brokerComm = eng.broker_commission_amount ? Number(eng.broker_commission_amount) : Math.round(price * 0.02 * 100) / 100;
                    const isCompleted = eng.status === 'completed';

                    // Progress calculation
                    const progressSteps = ['created', 'pending_broker_acceptance', 'broker_accepted', 'broker_negotiating', 'pending_buyer_approval', 'owner_counter_offered', 'awaiting_buyer_authorization', 'broker_finalizing', 'agreement_generated', 'pending_signatures', 'fully_signed', 'payment_submitted', 'payment_verified', 'handover_confirmed', 'completed'];
                    const stepIndex = progressSteps.indexOf(eng.status);
                    const progress = stepIndex >= 0 ? Math.round(((stepIndex + 1) / progressSteps.length) * 100) : (isCompleted ? 100 : 10);

                    return (
                      <div key={eng.id} style={{ background: '#fff', border: isNested ? 'none' : '1px solid #e2e8f0', borderRadius: '12px', padding: isNested ? '15px' : '20px', boxShadow: isNested ? 'none' : '0 1px 3px rgba(0,0,0,0.05)' }}>
                        {/* Card Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>
                              Engagement #{eng.id}
                            </h3>
                            <span style={{
                              background: badge.color + '15',
                              color: badge.color,
                              padding: '4px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              border: `1px solid ${badge.color}30`
                            }}>
                              {badge.emoji} {badge.label}
                            </span>
                            <span style={{
                              background: isRental ? '#dbeafe' : '#fef3c7',
                              color: isRental ? '#1d4ed8' : '#92400e',
                              padding: '3px 10px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {isRental ? '🔑 Rental' : '🏷️ Sale'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ marginBottom: '15px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                            <span>Progress Tracker</span>
                            <span>Progress: {progress}%</span>
                            <span style={{ fontWeight: '700', color: badge.color }}>Step: {badge.label}</span>
                          </div>
                          <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${badge.color}, ${badge.color}cc)`, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>

                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>🏠 Property: </span>
                            <span style={{ fontWeight: '600' }}>{eng.property_title || 'N/A'}</span>
                          </div>
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>👤 Buyer/Tenant: </span>
                            <span style={{ fontWeight: '600' }}>{eng.buyer_name || 'N/A'}</span>
                          </div>
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>🏢 Owner/Landlord: </span>
                            <span style={{ fontWeight: '600' }}>{eng.owner_name || 'N/A'}</span>
                          </div>
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: '#64748b' }}>💰 {isRental ? 'Rent' : 'Price'}: </span>
                            <span style={{ fontWeight: '700', color: '#059669' }}>
                              {price.toLocaleString()} ETB{isRental ? '/mo' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Commission Info */}
                        <div style={{
                          background: isCompleted ? '#ecfdf5' : '#fffbeb',
                          border: `1px solid ${isCompleted ? '#bbf7d0' : '#fde68a'}`,
                          borderRadius: '8px',
                          padding: '10px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px',
                          marginTop: '10px'
                        }}>
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ fontWeight: '600', color: isCompleted ? '#15803d' : '#92400e' }}>
                              {isCompleted ? '✅ Commission Earned' : '📊 Projected Commission'}:
                            </span>
                            <span style={{ fontWeight: '700', marginLeft: '8px', color: isCompleted ? '#059669' : '#d97706', fontSize: '15px' }}>
                              {brokerComm.toLocaleString()} ETB
                            </span>
                            {(eng.broker_commission_pct || eng.system_commission_pct) ? (
                              <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>({eng.broker_commission_pct || 2}%)</span>
                            ) : null}
                          </div>
                          {isCompleted && eng.funds_released_at && (
                            <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '500' }}>
                              Paid: {new Date(eng.funds_released_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Timeline */}
                        <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', gap: '16px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>📅 Created: {new Date(eng.created_at).toLocaleDateString()}</span>
                          {eng.completed_at && <span>✅ Completed: {new Date(eng.completed_at).toLocaleDateString()}</span>}
                          <span onClick={() => {
                            setSelectedEngagementToView(eng);
                            setActiveTab('engagements');
                          }} style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>
                            👁️ View Full Workflow & Details →
                          </span>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div style={{ display: 'grid', gap: '40px' }}>
                      {/* In Progress Section */}
                      <div>
                        <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          ⏳ In-Progress Engagements <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '14px', padding: '2px 8px', borderRadius: '12px' }}>{inProgressList.length}</span>
                        </h3>
                        {inProgressList.length === 0 ? (
                          <p style={{ color: '#94a3b8', background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>No active engagements right now.</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '16px' }}>
                            {inProgressList.map(eng => (
                              <div key={eng.id} style={{ 
                                background: '#fff', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '16px', 
                                transition: 'all 0.3s ease',
                                cursor: 'default',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                              }}>
                                 {renderEngagementCard(eng, true)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Completed Section with Happy Messages */}
                      <div>
                        <h3 style={{ borderBottom: '2px solid #34d399', paddingBottom: '10px', marginBottom: '20px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🎉 Completed Deals <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '14px', padding: '2px 8px', borderRadius: '12px' }}>{completedList.length}</span>
                        </h3>
                        {completedList.length === 0 ? (
                          <p style={{ color: '#94a3b8', background: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>No completed deals yet. Keep closing!</p>
                        ) : (
                          <div style={{ display: 'grid', gap: '20px' }}>
                            {completedList.map(eng => (
                              <div key={eng.id} style={{ 
                                background: '#fff', 
                                border: '1px solid #34d399', 
                                borderRadius: '16px', 
                                padding: '0', 
                                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05)', 
                                position: 'relative', 
                                overflow: 'hidden',
                                animation: 'fadeInUp 0.6s ease-out'
                              }}>
                                <div style={{ 
                                    padding: '24px', 
                                    background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', 
                                    color: '#fff'
                                }}>
                                  <div style={{ position: 'absolute', bottom: '-20px', right: '-10px', fontSize: '120px', opacity: 0.15, zIndex: 0, transform: 'rotate(-15deg)' }}>🤝</div>
                                  <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <h3 style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px', fontWeight: '800' }}>
                                          ✨ COMPLETED DEAL <span className="handshake-animation">🤝</span> ✨
                                        </h3>
                                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                                          CONGRATULATIONS!
                                        </div>
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '16px', lineHeight: '1.6', fontWeight: '500' }}>
                                      Excellent achievement! Property <strong style={{color: '#fff', textDecoration: 'underline'}}>{eng.property_title}</strong> is officially finalized. 
                                      Your earned commission: <strong style={{ fontSize: '18px', color: '#fff', background: 'rgba(0,0,0,0.2)', padding: '2px 8px', borderRadius: '4px' }}>{Number(eng.broker_commission_amount || (Number(eng.agreed_price || 0) * 0.02)).toLocaleString()} ETB</strong>
                                    </p>
                                  </div>
                                </div>
                                <div style={{ padding: '5px' }}>
                                    {renderEngagementCard(eng, true)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                </div>
            )}

          {/* Commissions Tab — Full Broker Commission Management */}
            {activeTab === 'commissions' && (
              <div className="commissions-section" style={{ padding: '30px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>💰 Commission Management</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Track your earnings, pipeline, and commission history</p>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>Commission Rate: 2%</span>
                  </div>
                </div>

                {/* Summary Cards & Bonus Tracker */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '24px', borderRadius: '14px', color: '#fff', gridColumn: '1 / -1', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.05, zIndex: 0 }}>🎁</div>
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                      <div>
                        <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: '#38bdf8' }}>🎁 5-Property Bonus Tracker</div>
                        <div style={{ fontSize: '24px', fontWeight: '800' }}>{commSummary.properties_to_bonus || 0} / 5 Properties Completed</div>
                        <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '5px' }}>Eligible Value: {Number(commSummary.bonus_eligible_value || 0).toLocaleString()} ETB</div>
                      </div>
                      <div style={{ flexGrow: 1, maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span>Progress</span>
                          <span>{Math.round(((commSummary.properties_to_bonus || 0) / 5) * 100)}%</span>
                        </div>
                        <div style={{ height: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${((commSummary.properties_to_bonus || 0) / 5) * 100}%`, background: 'linear-gradient(90deg, #38bdf8, #818cf8)', borderRadius: '5px', transition: 'width 0.5s ease' }} />
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '6px', textAlign: 'right' }}>Complete {5 - (commSummary.properties_to_bonus || 0)} more to earn 2% bonus!</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', padding: '24px', borderRadius: '14px', color: '#fff' }}>
                    <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>💰 Deal Commission</div>
                    <div style={{ fontSize: '28px', fontWeight: '800' }}>{Number(commSummary.deal_commission || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>ETB</div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)', padding: '24px', borderRadius: '14px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 5, right: 5, fontSize: '40px', opacity: 0.15 }}>🎁</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>🎁 Bonus Earned</div>
                      <div style={{ fontSize: '28px', fontWeight: '800' }}>{Number(commSummary.bonus_earned || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '13px', opacity: 0.9 }}>ETB</div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', padding: '24px', borderRadius: '14px', color: '#fff', gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>💵 Total Earnings</div>
                    <div style={{ fontSize: '36px', fontWeight: '800' }}>{Number(commSummary.total_earned || commSummary.total_paid || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>ETB (Deals + Bonuses)</div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #d97706, #f59e0b)', padding: '24px', borderRadius: '14px', color: '#fff' }}>
                    <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>⏳ Pending Deals</div>
                    <div style={{ fontSize: '28px', fontWeight: '800' }}>{Number(commSummary.projected_earnings || 0).toLocaleString()}</div>
                    <div style={{ fontSize: '13px', opacity: 0.9 }}>ETB from {commSummary.pending_deals || 0} active deals</div>
                  </div>
                </div>

                {/* Engagement Pipeline — Active Deals */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', marginBottom: '25px' }}>
                  <h3 style={{ margin: '0 0 20px', color: '#1e293b', fontSize: '16px' }}>📈 Active Pipeline — Projected Commissions</h3>
                  {(() => {
                    // Filter engagements that have agreed_price but aren't completed yet
                    const inProgressComm = incomingRequests.filter(r => 
                      r.request_type === 'agreement' && 
                      r.status !== 'completed' && r.status !== 'rejected' && r.status !== 'cancelled' &&
                      r.property_price
                    );
                    
                    if (inProgressComm.length === 0 && commissions.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
                          <p>No active deals in the pipeline. Browse properties to start new engagements!</p>
                        </div>
                      );
                    }

                    if (inProgressComm.length > 0) {
                      return (
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {inProgressComm.map(eng => {
                            const price = Number(eng.property_price || 0);
                            const projectedComm = Math.round(price * 0.02 * 100) / 100;
                            const statusColors = {
                              pending: '#f59e0b',
                              accepted: '#10b981',
                              pending_admin_review: '#8b5cf6',
                              owner_accepted: '#10b981',
                              payment_submitted: '#f97316',
                            };
                            return (
                              <div key={eng.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <div>
                                  <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{eng.property_title}</div>
                                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                    📍 {eng.property_location} • 👤 {eng.customer_name}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#059669' }}>+{projectedComm.toLocaleString()} ETB</div>
                                  <span style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: (statusColors[eng.status] || '#6b7280') + '15',
                                    color: statusColors[eng.status] || '#6b7280',
                                    fontWeight: '600'
                                  }}>
                                    {(eng.status || 'pending').replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                        <p>No active pipeline deals — all deals are completed!</p>
                      </div>
                    );
                  })()}
                </div>

                {/* Commission History Table */}
                <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '16px' }}>📋 Commission History</h3>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{commissions.length} record(s)</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Property</th>
                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Parties</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deal Value</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rate</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Commission</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right', fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>
                            <div style={{ fontSize: '36px', marginBottom: '10px' }}>💰</div>
                            <p style={{ fontWeight: '600', marginBottom: '4px' }}>No commissions yet</p>
                            <p style={{ fontSize: '13px' }}>Your commission will appear here once a deal is completed and funds are released.</p>
                          </td>
                        </tr>
                      ) : (
                        commissions.map(comm => {
                          const isPaid = comm.status === 'paid' || !comm.status;
                          return (
                            <tr key={comm.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                              <td style={{ padding: '16px' }}>
                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{comm.property_title || 'Property'}</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                  {comm.property_location ? `📍 ${comm.property_location}` : `Engagement #${comm.broker_engagement_id}`}
                                </div>
                              </td>
                              <td style={{ padding: '16px', fontSize: '13px' }}>
                                <div>👤 {comm.buyer_name || 'Buyer'}</div>
                                <div style={{ color: '#64748b' }}>🏢 {comm.owner_name || 'Owner'}</div>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: '11px',
                                  padding: '3px 10px',
                                  borderRadius: '10px',
                                  background: (comm.engagement_type === 'rent' || comm.property_listing_type === 'rent') ? '#dbeafe' : '#fef3c7',
                                  color: (comm.engagement_type === 'rent' || comm.property_listing_type === 'rent') ? '#1d4ed8' : '#92400e',
                                  fontWeight: '600'
                                }}>
                                  {(comm.engagement_type === 'rent' || comm.property_listing_type === 'rent') ? '🔑 Rental' : '🏷️ Sale'}
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', fontWeight: '500' }}>
                                {Number(comm.agreement_amount || 0).toLocaleString()} ETB
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <span style={{ background: '#ecfdf5', color: '#059669', padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}>
                                  {comm.broker_pct || comm.owner_commission_percentage || 2}%
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', fontSize: '15px', color: '#059669' }}>
                                {Number(comm.broker_amount || comm.owner_commission || 0).toLocaleString()} ETB
                              </td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 12px',
                                  borderRadius: '10px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  background: isPaid ? '#ecfdf5' : '#fffbeb',
                                  color: isPaid ? '#059669' : '#d97706',
                                  border: `1px solid ${isPaid ? '#bbf7d0' : '#fde68a'}`
                                }}>
                                  {isPaid ? '✅ Paid' : '⏳ Pending'}
                                </span>
                              </td>
                              <td style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>
                                {comm.calculated_at ? new Date(comm.calculated_at).toLocaleDateString() : 
                                 comm.funds_released_at ? new Date(comm.funds_released_at).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Commission Breakdown Footer */}
                {commissions.length > 0 && (
                  <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Total Deal Volume</span>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>
                        {Number(commSummary.total_deal_value || commissions.reduce((s, c) => s + Number(c.agreement_amount || 0), 0)).toLocaleString()} ETB
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Avg Commission Rate</span>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#7c3aed' }}>
                        {(commSummary.avg_commission_rate || 2).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Highest Earning</span>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
                        {Number(commSummary.highest_commission || Math.max(...commissions.map(c => Number(c.broker_amount || c.owner_commission || 0)))).toLocaleString()} ETB
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>Total Earned</span>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>
                        {Number(commSummary.total_earned || commSummary.total_paid || commissions.reduce((s, c) => s + Number(c.broker_amount || c.owner_commission || 0), 0)).toLocaleString()} ETB
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Holds Tab */}
            {activeTab === 'holds' && (
              <div className="holds-section" style={{ padding: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <div>
                    <h2 style={{ margin: 0 }}>⏱️ My Temporary Holds</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Properties you have temporarily reserved for buyers (30 min max unless extended)</p>
                  </div>
                </div>

                {brokerHolds.length === 0 ? (
                  <div className="empty-state">
                    <p>You have no active property holds.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {brokerHolds.map(hold => (
                      <div key={hold.id} style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                          <h3 style={{ margin: 0 }}>{hold.property_title}</h3>
                          <span style={{ 
                            padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                            background: hold.status === 'reserved' ? '#fef3c7' : hold.status === 'confirmed' ? '#d1fae5' : '#fee2e2',
                            color: hold.status === 'reserved' ? '#d97706' : hold.status === 'confirmed' ? '#059669' : '#dc2626'
                          }}>
                            {hold.status.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '14px', color: '#475569' }}>
                          <div><strong>Buyer:</strong> {hold.buyer_name}</div>
                          <div><strong>Phone:</strong> {hold.phone}</div>
                          <div><strong>Visit Time:</strong> {new Date(hold.preferred_visit_time).toLocaleString()}</div>
                          <div><strong>Status:</strong> {hold.status === 'reserved' ? `Expires at ${new Date(hold.hold_expiry_time).toLocaleTimeString()}` : 'Admin confirmed / cancelled'}</div>
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
            </>
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
  
