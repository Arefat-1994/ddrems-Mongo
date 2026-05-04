import React, { useState, useEffect, useCallback } from 'react'; // Final re-verification of property type filters
import './PropertyAdminDashboard.css';
import PageHeader from './PageHeader';
import PropertyApproval from './PropertyApproval';
import ImageGallery from './shared/ImageGallery';
import DocumentViewerAdmin from './shared/DocumentViewerAdmin';
import Reports from './Reports';
import axios from 'axios';
import Users from './Users';
import MessageNotificationWidget from './MessageNotificationWidget';
import AdminMessagesView from './AdminMessagesView';
import AgreementWorkflow from './AgreementWorkflow';
import AgreementManagement from './AgreementManagement';
import SendMessage from './SendMessage';
import PropertyMap from './shared/PropertyMap';
import SystemAdminTransactions from './SystemAdminTransactions';
import MpesaDashboard from './MpesaDashboard';
import BookedLists from './BookedLists';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const PropertyAdminDashboard = ({ user, onLogout, setCurrentPage, setViewMapPropertyId, initialView }) => {
  const [currentView, setCurrentView] = useState(initialView || 'dashboard'); // dashboard, approval, all-properties, reports, documents, users, messages, send-message, transactions
  const [showAdminMessages, setShowAdminMessages] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);
  const [keyHistoryLimit, setKeyHistoryLimit] = useState(5);

  const [stats, setStats] = useState({
    pendingVerification: 0,
    verifiedProperties: 0,
    rejectedProperties: 0,
    suspendedProperties: 0,
    totalProperties: 0,
    pendingProfiles: 0,
    pendingKeyRequests: 0,
    pendingAgreementRequests: 0,
    suspiciousProperties: 0,
    totalBookings: 0
  });

  // Suspicious activity state
  const [suspiciousData, setSuspiciousData] = useState([]);
  const [suspiciousLoading, setSuspiciousLoading] = useState(false);

  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedMediationRequest, setSelectedMediationRequest] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Documents view state - moved to top level
  const [allPropertiesWithDocs, setAllPropertiesWithDocs] = useState([]);
  const [docFilter, setDocFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchPropertyAdminData = useCallback(async () => {
    try {
      // Helper function to handle individual fetch failures
      const safeFetch = async (endpoint, defaultValue = {}) => {
        try {
          const res = await axios.get(`${API_BASE}${endpoint}`);
          return res.data;
        } catch (err) {
          console.error(`Error fetching ${endpoint}:`, err.message);
          return defaultValue;
        }
      };

      const [statsData, pendingProfilesData, pendingAgreementsData, pendingKeysData, brokerHoldsData] = await Promise.all([
        safeFetch(`/properties/stats?admin_id=${user.id}`, { verified: 0, inactive: 0, suspended: 0, total: 0 }),
        safeFetch('/profiles/pending', { total: 0 }),
        safeFetch(`/agreement-requests/admin/pending?admin_id=${user.id}`, []),
        safeFetch(`/key-requests/admin/pending?admin_id=${user.id}`, []),
        safeFetch(`/broker-bookings?property_admin_id=${user.id}`, [])
      ]);

      // Fetch suspicious properties count
      let suspiciousCount = 0;
      try {
        const suspRes = await axios.get(`${API_BASE}/suspicious-activity/count`);
        suspiciousCount = suspRes.data?.count || 0;
      } catch (e) {
        console.log('Suspicious activity count unavailable:', e.message);
      }

      setStats({
        pendingVerification: statsData.pending || 0,
        verifiedProperties: statsData.verified || 0,
        totalProperties: statsData.total || 0,
        pendingProfiles: pendingProfilesData.total || 0,
        pendingAgreementRequests: (pendingAgreementsData.length || 0) + (pendingKeysData.length || 0),
        suspiciousProperties: suspiciousCount,
        totalBookings: Array.isArray(brokerHoldsData) ? brokerHoldsData.length : 0
      });

      // Always set pending requests for dashboard display
      const combinedPending = [
        ...pendingAgreementsData,
        ...pendingKeysData
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setPendingRequests(combinedPending);

      if (currentView === 'agreement-requests' || currentView === 'key-requests' || currentView === 'agreements') {
        const [historyAgreements, historyKeys] = await Promise.all([
          safeFetch('/agreement-requests/admin/history', []),
          safeFetch('/key-requests/admin/history', [])
        ]);

        const combinedHistory = [
          ...historyAgreements,
          ...historyKeys
        ].sort((a, b) => new Date(b.responded_at || b.updated_at) - new Date(a.responded_at || a.updated_at));

        setRequestHistory(combinedHistory);
      }
    } catch (error) {
      console.error('Critical error in fetchPropertyAdminData:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);
  const fetchAllProperties = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/properties/all-with-status`);
      setAllProperties(response.data);
    } catch (error) {
      console.error('Error fetching all properties:', error);
    }
  }, []);

  useEffect(() => {
    fetchPropertyAdminData();
    if (initialView === 'documents') {
      fetchAllProperties();
    }
  }, [fetchPropertyAdminData, initialView, fetchAllProperties]);

  // Fetch pending requests whenever view changes to agreement-related views
  useEffect(() => {
    if (currentView === 'agreement-requests' || currentView === 'key-requests' || currentView === 'agreements') {
      const fetchPendingRequests = async () => {
        try {
          const [pendingAgreements, pendingKeys] = await Promise.all([
            axios.get(`${API_BASE}/agreement-requests/admin/pending?admin_id=${user.id}`).then(r => r.data).catch(() => []),
            axios.get(`${API_BASE}/key-requests/admin/pending?admin_id=${user.id}`).then(r => r.data).catch(() => [])
          ]);

          const combinedPending = [
            ...pendingAgreements,
            ...pendingKeys
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          setPendingRequests(combinedPending);
        } catch (error) {
          console.error('Error fetching pending requests:', error);
        }
      };
      fetchPendingRequests();
    }
  }, [currentView, user.id]);

  // Fetch properties with documents when in documents view
  useEffect(() => {
    if (currentView === 'documents') {
      const fetchPropertiesWithDocs = async () => {
        try {
          const response = await axios.get(`${API_BASE}/properties/all-with-status`);
          const propertiesWithDocCounts = await Promise.all(
            response.data.map(async (prop) => {
              try {
                const docsRes = await axios.get(`${API_BASE}/property-documents/property/${prop.id}`);
                return { ...prop, documentCount: docsRes.data.length, documents: docsRes.data };
              } catch {
                return { ...prop, documentCount: 0, documents: [] };
              }
            })
          );
          setAllPropertiesWithDocs(propertiesWithDocCounts);
        } catch (error) {
          console.error('Error fetching properties with documents:', error);
        }
      };
      fetchPropertiesWithDocs();
    }
  }, [currentView]);


  const handleViewAll = () => {
    setCurrentView('all-properties');
    fetchAllProperties();
  };

  const viewPropertyDetail = (property) => {
    setSelectedProperty(property);
    setShowViewModal(true);
  };

  const handleQuickAction = async (propertyId, action) => {
    const confirmMessages = {
      approved: 'Approve this property? It will become active.',
      suspended: 'Suspend this property? It will be hidden.',
      rejected: 'Reject this property? It will be deactivated.'
    };

    // Use a custom confirmation instead of window.confirm for a more modern feel
    if (!window.confirm(confirmMessages[action])) return;

    try {
      const response = await axios.put(`${API_BASE}/properties/${propertyId}/verify`, {
        status: action,
        verified_by: user.id,
        notes: `Quick ${action} by admin`
      });
      
      showNotification(response.data.message || `Property ${action} successfully!`, 'success');
      fetchAllProperties();
      fetchPropertyAdminData();
    } catch (error) {
      console.error(`Error: ${action}`, error);
      showNotification(`Failed to ${action} property: ${error.response?.data?.message || error.message}`, 'error');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: '#10b981', pending: '#f59e0b', sold: '#3b82f6',
      rented: '#8b5cf6', inactive: '#6b7280', suspended: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getVerificationBadge = (status) => {
    const badges = {
      approved: { emoji: '✅', label: 'Approved', color: '#10b981' },
      pending: { emoji: '⏳', label: 'Pending', color: '#f59e0b' },
      rejected: { emoji: '❌', label: 'Rejected', color: '#ef4444' },
      suspended: { emoji: '⏸️', label: 'Suspended', color: '#f97316' }
    };
    return badges[status] || badges.pending;
  };

  const filteredProperties = allProperties.filter(p => {
    if (filterType === 'all') return true;
    return p.type === filterType;
  });


  // === SUSPICIOUS ACTIVITY VIEW ===
  if (currentView === 'suspicious') {
    const fetchSuspiciousData = async () => {
      setSuspiciousLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/suspicious-activity/scan`);
        setSuspiciousData(res.data.properties || []);
      } catch (err) {
        console.error('Failed to load suspicious data:', err);
        showNotification('Failed to load suspicious activity data', 'error');
      }
      setSuspiciousLoading(false);
    };

    // Auto-fetch on mount
    if (suspiciousData.length === 0 && !suspiciousLoading) {
      fetchSuspiciousData();
    }

    return (
      <div className="property-admin-dashboard">
        <PageHeader
          title="⚠️ Suspicious Activity Monitor"
          subtitle="AI-powered fraud detection — properties with unusual pricing patterns"
          user={user}
          onLogout={onLogout}
          onSettingsClick={() => setCurrentPage('settings')}
          actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={fetchSuspiciousData} disabled={suspiciousLoading}>
                {suspiciousLoading ? '⏳ Scanning...' : '🔄 Re-scan All Properties'}
              </button>
              <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
                ← Back to Dashboard
              </button>
            </div>
          }
        />

        <div style={{ padding: '20px 30px' }}>
          {/* Summary Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{ fontSize: '48px' }}>⚠️</div>
            <div>
              <h2 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: '22px' }}>
                {suspiciousData.length} Suspicious Properties Detected
              </h2>
              <p style={{ margin: 0, color: '#b91c1c', fontSize: '14px' }}>
                These properties have pricing that deviates significantly from AI market predictions. Manual review is recommended.
              </p>
            </div>
          </div>

          {/* Suspicious Properties List */}
          {suspiciousLoading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
              <h3>Scanning properties...</h3>
              <p>Running AI fraud detection on all properties. This may take a moment.</p>
            </div>
          ) : suspiciousData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
              <h3>No Suspicious Activity Detected</h3>
              <p>All properties appear to be fairly priced according to AI analysis.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {suspiciousData.map(property => (
                <div key={property.id} style={{
                  background: '#fff',
                  border: property.riskLevel === 'high' ? '2px solid #ef4444' : '2px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  {/* Property Image */}
                  <div style={{ width: '70px', height: '70px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
                    {property.main_image ? (
                      <img src={property.main_image} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🏠</div>
                    )}
                  </div>

                  {/* Property Info */}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{property.title}</h4>
                    <p style={{ margin: '0 0 2px 0', fontSize: '13px', color: '#64748b' }}>
                      📍 {property.location} • {property.type} • {(property.price / 1000000).toFixed(2)}M ETB
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                      👤 {property.owner_name || property.broker_name || 'Unknown'} • 📅 {new Date(property.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Risk Badge */}
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <span style={{
                      display: 'inline-block',
                      background: property.riskLevel === 'high' ? '#ef4444' : '#f59e0b',
                      color: 'white',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                      marginBottom: '6px',
                      textTransform: 'uppercase'
                    }}>
                      ⚠ SUSPICIOUS
                    </span>
                    <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: '600' }}>
                      Risk: {property.riskScore}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {property.status}
                    </div>
                  </div>

                  {/* Price Comparison */}
                  <div style={{ textAlign: 'center', minWidth: '140px', background: '#fef2f2', padding: '10px', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Listed</div>
                    <div style={{ fontWeight: '700', color: '#dc2626', fontSize: '14px' }}>{(property.price / 1000000).toFixed(2)}M</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>AI Predicted</div>
                    <div style={{ fontWeight: '700', color: '#059669', fontSize: '14px' }}>{(property.predictedPrice / 1000000).toFixed(2)}M</div>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                      {property.deviation > 0 ? '+' : ''}{property.deviation?.toFixed(1)}% deviation
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <button className="btn-icon" title="View" onClick={() => viewPropertyDetail(property)} style={{ background: '#3b82f6', color: 'white' }}>👁️</button>
                    {property.status !== 'suspended' && (
                      <button className="btn-icon warning" title="Suspend" onClick={() => handleQuickAction(property.id, 'suspended')}>⏸️</button>
                    )}
                    <button className="btn-icon danger" title="Reject" onClick={() => handleQuickAction(property.id, 'rejected')}>❌</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // === REPORTS VIEW ===
  if (currentView === 'reports') {
    return <Reports user={user} onSettingsClick={() => setCurrentPage('settings')} onLogout={onLogout} onBack={() => setCurrentView('dashboard')} />;
  }

  // === TRANSACTIONS VIEW ===
  if (currentView === 'transactions') {
    return (
      <div className="property-admin-dashboard">
        <PageHeader title="Platform Transactions" subtitle="View system revenue and financial activity" user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} actions={<button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>← Back to Dashboard</button>} />
        <div style={{ padding: '20px' }}>
          <SystemAdminTransactions />
        </div>
      </div>
    );
  }

  // === BROKER HOLDS VIEW ===
  if (currentView === 'broker-holds') {
    return (
      <div className="property-admin-dashboard">
        <PageHeader title="Booked Lists" subtitle="Manage properties temporarily reserved by buyers and brokers" user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} actions={<button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>← Back to Dashboard</button>} />
        <BookedLists user={user} showNotification={showNotification} />
      </div>
    );
  }

  // === DOCUMENTS VIEW ===
  if (currentView === 'documents') {
    const filteredPropertiesWithDocs = allPropertiesWithDocs
      .filter(p => {
        if (docFilter === 'verified') return p.status === 'active';
        if (docFilter === 'unverified') return p.status === 'pending';
        if (docFilter === 'locked') return p.documents?.some(d => d.is_locked);
        return true;
      })
      .filter(p => {
        if (!searchTerm) return true;
        return p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id.toString().includes(searchTerm);
      });

    return (
      <div className="property-admin-dashboard">
        <PageHeader
          title="Document Verification Center"
          subtitle="Review and verify property documents organized by property, owner, and status"
          user={user}
          onLogout={onLogout}
          onSettingsClick={() => setCurrentPage('settings')}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          }
        />

        <div className="verification-container" style={{ padding: '30px' }}>
          {/* Search and Filter Bar */}
          <div style={{
            background: '#fff',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '30px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: '1', minWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by property name, location, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className={docFilter === 'all' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDocFilter('all')}
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  All ({allPropertiesWithDocs.length})
                </button>
                <button
                  className={docFilter === 'unverified' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDocFilter('unverified')}
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  ⏳ Pending ({allPropertiesWithDocs.filter(p => p.status === 'pending').length})
                </button>
                <button
                  className={docFilter === 'verified' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDocFilter('verified')}
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  ✅ Verified ({allPropertiesWithDocs.filter(p => p.status === 'active').length})
                </button>
                <button
                  className={docFilter === 'locked' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setDocFilter('locked')}
                  style={{ padding: '10px 20px', fontSize: '14px' }}
                >
                  🔒 Locked Docs
                </button>
              </div>
            </div>
          </div>

          {/* Properties with Documents Grid */}
          {selectedProperty ? (
            <div className="doc-verification-section">
              <button
                className="btn-secondary"
                onClick={() => setSelectedProperty(null)}
                style={{ marginBottom: '20px' }}
              >
                ← Back to All Properties
              </button>

              <div className="property-summary-card" style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '12px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px 0' }}>{selectedProperty.title}</h3>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      📍 {selectedProperty.location} • ID: {selectedProperty.id}
                    </p>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      💰 {(selectedProperty.price / 1000000).toFixed(2)}M ETB • {selectedProperty.type}
                    </p>
                    <p style={{ margin: '5px 0', color: '#64748b' }}>
                      👤 Owner: {selectedProperty.owner_name || selectedProperty.broker_name || 'Unknown'}
                    </p>
                    <span className="status-badge" style={{
                      background: getStatusColor(selectedProperty.status),
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      display: 'inline-block',
                      marginTop: '10px'
                    }}>
                      {selectedProperty.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Review documents below to make a decision
                    </span>
                  </div>
                </div>
              </div>

              <div className="dashboard-card">
                <div className="card-header">
                  <h3>📄 Property Documents ({selectedProperty.documentCount || 0})</h3>
                </div>
                <DocumentViewerAdmin
                  propertyId={selectedProperty.id}
                  property={selectedProperty}
                  userId={user?.id} userRole={user?.role}
                  onVerificationAction={() => {
                    setSelectedProperty(null);
                    fetchPropertyAdminData();
                    fetchAllProperties();
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {filteredPropertiesWithDocs.length === 0 ? (
                <div className="empty-state" style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
                  <h3>No Properties Found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              ) : (
                filteredPropertiesWithDocs.map(property => (
                  <div
                    key={property.id}
                    style={{
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                    onClick={() => setSelectedProperty(property)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <h3 style={{ margin: 0, fontSize: '18px' }}>{property.title}</h3>
                          <span style={{
                            background: getStatusColor(property.status),
                            color: '#fff',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {property.status}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', color: '#64748b', fontSize: '14px' }}>
                          <div>📍 {property.location}</div>
                          <div>💰 {(property.price / 1000000).toFixed(2)}M ETB</div>
                          <div>🏠 {property.type}</div>
                          <div>👤 {property.owner_name || property.broker_name || 'Unknown'}</div>
                          <div>📅 {new Date(property.created_at).toLocaleDateString()}</div>
                          <div>
                            📄 {property.documentCount || 0} document{property.documentCount !== 1 ? 's' : ''}
                            {property.documents?.some(d => d.is_locked) && ' 🔒'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProperty(property);
                          }}
                          style={{ padding: '8px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}
                        >
                          📄 Review Documents
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }


  // === AGREEMENT MANAGEMENT VIEW ===
  if (currentView === 'agreements') {
    return (
      <div className="property-admin-dashboard">
        <AgreementManagement user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} />
      </div>
    );
  }

  // === M-PESA DASHBOARD VIEW ===
  if (currentView === 'mpesa') {
    return (
      <div className="property-admin-dashboard">
        <MpesaDashboard user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} />
      </div>
    );
  }

  // === SEND MESSAGE VIEW ===
  if (currentView === 'send-message') {
    return (
      <div className="property-admin-dashboard">
        <SendMessage user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} onCancel={() => setCurrentView('messages')} onSuccess={() => setCurrentView('messages')} />
      </div>
    );
  }

  // === KEY REQUESTS VIEW ===
  if (currentView === 'key-requests') {
    const handleOpenKeyResponder = async (request) => {
      try {
        const res = await axios.get(`${API_BASE}/key-requests/${request.id}/preview-key`);
        setPreviewKey(res.data.key_code);
        setSelectedMediationRequest(request);
        setResponseMsg('Your property access key is provided below. You can now use this to view all sensitive property documents.');
        setShowResponseModal(true);
      } catch (error) {
        showNotification('Failed to fetch key preview', 'error');
      }
    };

    const handleConfirmSendKey = async () => {
      try {
        await axios.put(`${API_BASE}/key-requests/${selectedMediationRequest.id}/respond-key`, {
          status: 'accepted',
          admin_id: user.id,
          response_message: responseMsg,
          key_code: previewKey
        });
        showNotification('🔑 Key sent to customer successfully!', 'success');
        setShowResponseModal(false);
        fetchPropertyAdminData();
      } catch (error) {
        showNotification('Failed to send key', 'error');
      }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'accepted': return { color: '#16a34a', background: '#dcfce7' };
            case 'rejected': return { color: '#dc2626', background: '#fee2e2' };
            case 'pending': return { color: '#ca8a04', background: '#fef9c3' };
            default: return { color: '#475569', background: '#f1f5f9' };
        }
    };

    const keyRequests = pendingRequests.filter(r => r.request_type === 'key');
    const keyHistory = requestHistory.filter(r => r.request_type === 'key');

    return (
      <div className="property-admin-dashboard">
        <PageHeader
          title="Access Key Requests"
          subtitle="Manage customer access key requests for property documents"
          user={user}
          onLogout={onLogout}
          onSettingsClick={() => setCurrentPage('settings')}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          }
        />
        <div className="requests-container" style={{ padding: '30px' }}>
          <div className="dashboard-grid">
            {/* Incoming Key Requests */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>📥 Incoming Key Requests ({keyRequests.length})</h3>
              </div>
              <div className="requests-list" style={{ padding: '20px' }}>
                {keyRequests.length === 0 ? (
                  <p className="no-data">No pending key requests.</p>
                ) : (
                  keyRequests.map(req => (
                    <div key={req.id} className="request-card-mini" style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#0ea5e9' }}>
                          🔑 Key Request
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4>{req.property_title}</h4>
                      <p style={{ fontSize: '14px', color: '#475569', margin: '5px 0' }}>👤 {req.customer_name} ({req.customer_email})</p>
                      
                      <div className="actions" style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                        <button className="btn-primary" onClick={() => handleOpenKeyResponder(req)} style={{ flex: 1 }}>
                          Send Access Key
                        </button>
                        <button className="btn-secondary" onClick={() => {
                            setSelectedProperty({ id: req.property_id, title: req.property_title });
                            setCurrentView('documents');
                        }}>Review Docs</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Key Request History */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>📜 Key Request History ({keyHistory.length})</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#64748b' }}>Show:</label>
                  <select 
                    value={keyHistoryLimit} 
                    onChange={(e) => setKeyHistoryLimit(Number(e.target.value))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                  >
                    <option value={2}>2</option>
                    <option value={5}>5</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                  </select>
                </div>
              </div>
              <div className="requests-list" style={{ padding: '20px' }}>
                {keyHistory.length === 0 ? (
                  <p className="no-data">No historical records.</p>
                ) : (
                  keyHistory.slice(0, keyHistoryLimit).map(req => (
                    <div key={req.id} className="request-card-mini" style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', marginBottom: '10px', opacity: 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>KEY REQUEST</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', ...getStatusStyle(req.status) }}>
                          {req.status.toUpperCase()}
                        </span>
                      </div>
                      <h5 style={{ margin: '5px 0' }}>{req.property_title}</h5>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>To: {req.customer_name}</p>
                      {req.key_code && (
                        <p style={{ fontSize: '11px', marginTop: '5px', fontWeight: 'bold' }}>🔑 Key: {req.key_code}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Key Response Modal */}
        {showResponseModal && selectedMediationRequest && selectedMediationRequest.request_type === 'key' && (
          <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🔑</span> Respond to Key Request
                </h2>
                <button className="close-btn" onClick={() => setShowResponseModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '20px 0' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#64748b' }}>REQUESTER</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedMediationRequest.customer_name}</p>
                  <p style={{ margin: '15px 0 5px 0', fontSize: '13px', color: '#64748b' }}>PROPERTY</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedMediationRequest.property_title}</p>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>System Generated Access Key</label>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    background: '#e0f2fe', 
                    color: '#0369a1', 
                    padding: '15px', 
                    borderRadius: '8px', 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    letterSpacing: '2px',
                    border: '2px dashed #0ea5e9'
                  }}>
                    {previewKey}
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                    This key will grant {selectedMediationRequest.customer_name} access to all private documents for this property.
                  </p>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Message to Customer</label>
                  <textarea 
                    value={responseMsg}
                    onChange={(e) => setResponseMsg(e.target.value)}
                    rows="4"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                    placeholder="Add a friendly and professional message..."
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '0' }}>
                <button className="btn-secondary" onClick={() => setShowResponseModal(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleConfirmSendKey} style={{ padding: '10px 25px' }}>
                  Confirm & Send Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === AGREEMENT MEDIATION VIEW ===
  if (currentView === 'agreement-requests') {
    const handleOpenForwarder = async (request) => {
      setSelectedMediationRequest(request);
      setResponseMsg('This agreement request is being forwarded to you for final review and approval. Please review the attached documents and respond accordingly.');
      setShowResponseModal(true);
    };

    const handleConfirmForward = async () => {
      try {
        await axios.put(`${API_BASE}/agreement-requests/${selectedMediationRequest.id}/forward`, {
          admin_id: user.id,
          response_message: responseMsg
        });
        showNotification('🤝 Agreement forwarded to owner successfully!', 'success');
        setShowResponseModal(false);
        fetchPropertyAdminData();
      } catch (error) {
        showNotification('Failed to forward agreement', 'error');
      }
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'accepted': return { color: '#16a34a', background: '#dcfce7' };
            case 'rejected': return { color: '#dc2626', background: '#fee2e2' };
            case 'pending': return { color: '#ca8a04', background: '#fef9c3' };
            default: return { color: '#475569', background: '#f1f5f9' };
        }
    };

    const agreementRequests = pendingRequests.filter(r => r.request_type === 'agreement');
    const agreementHistory = requestHistory.filter(r => r.request_type === 'agreement');

    return (
      <div className="property-admin-dashboard">
        <PageHeader
          title="Agreement Mediation"
          subtitle="Forward agreement requests to property owners for final approval"
          user={user}
          onLogout={onLogout}
          onSettingsClick={() => setCurrentPage('settings')}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          }
        />
        <div className="requests-container" style={{ padding: '30px' }}>
          <div className="dashboard-grid">
            {/* Incoming Agreement Requests */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>📥 Incoming Agreement Requests ({agreementRequests.length})</h3>
              </div>
              <div className="requests-list" style={{ padding: '20px' }}>
                {agreementRequests.length === 0 ? (
                  <p className="no-data">No pending agreement requests.</p>
                ) : (
                  agreementRequests.map(req => (
                    <div key={req.id} className="request-card-mini" style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#8b5cf6' }}>
                          🤝 Agreement Request
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>
                      <h4>{req.property_title}</h4>
                      <p style={{ fontSize: '14px', color: '#475569', margin: '5px 0' }}>👤 {req.customer_name} ({req.customer_email})</p>
                      
                      <div className="actions" style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                        <button className="btn-success" onClick={() => handleOpenForwarder(req)} style={{ flex: 1 }}>
                          Forward to Owner
                        </button>
                        <button className="btn-secondary" onClick={() => {
                            setSelectedProperty({ id: req.property_id, title: req.property_title });
                            setCurrentView('documents');
                        }}>Review Docs</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Agreement Request History */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>📜 Agreement Request History ({agreementHistory.length})</h3>
              </div>
              <div className="requests-list" style={{ padding: '20px' }}>
                {agreementHistory.length === 0 ? (
                  <p className="no-data">No historical records.</p>
                ) : (
                  agreementHistory.map(req => (
                    <div key={req.id} className="request-card-mini" style={{ border: '1px solid #f1f5f9', padding: '12px', borderRadius: '8px', marginBottom: '10px', opacity: 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>AGREEMENT REQUEST</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', ...getStatusStyle(req.status) }}>
                          {req.forwarded_to_owner ? 'FORWARDED' : req.status.toUpperCase()}
                        </span>
                      </div>
                      <h5 style={{ margin: '5px 0' }}>{req.property_title}</h5>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>To: {req.customer_name}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Forward Agreement Modal */}
        {showResponseModal && selectedMediationRequest && selectedMediationRequest.request_type === 'agreement' && (
          <div className="modal-overlay" onClick={() => setShowResponseModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🤝</span> Forward Agreement Request
                </h2>
                <button className="close-btn" onClick={() => setShowResponseModal(false)}>✕</button>
              </div>
              <div className="modal-body" style={{ padding: '20px 0' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#64748b' }}>REQUESTER</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedMediationRequest.customer_name}</p>
                  <p style={{ margin: '15px 0 5px 0', fontSize: '13px', color: '#64748b' }}>PROPERTY</p>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{selectedMediationRequest.property_title}</p>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Message to Owner</label>
                  <textarea 
                    value={responseMsg}
                    onChange={(e) => setResponseMsg(e.target.value)}
                    rows="4"
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
                    placeholder="Add a friendly and professional message..."
                  />
                </div>
              </div>
              <div className="modal-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '0' }}>
                <button className="btn-secondary" onClick={() => setShowResponseModal(false)}>Cancel</button>
                <button className="btn-success" onClick={handleConfirmForward} style={{ padding: '10px 25px' }}>
                  Confirm & Forward
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === MESSAGES VIEW ===
  if (currentView === 'messages') {
    return (
      <div className="property-admin-dashboard">
        <PageHeader
          title="Messages"
          subtitle="View message history and incoming replies"
          user={user}
          onLogout={onLogout}
          onSettingsClick={() => setCurrentPage('settings')}
          actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={() => setCurrentView('send-message')}>
                📤 Send New Message
              </button>
              <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
                ← Back to Dashboard
              </button>
            </div>
          }
        />
        <div style={{ padding: '20px' }}>
          <AdminMessagesView user={user} onClose={() => setCurrentView('dashboard')} />
        </div>
      </div>
    );
  }

  // === SEND MESSAGE VIEW ===
  if (currentView === 'send-message') {
    return (
      <div className="property-admin-dashboard">
        <div style={{ padding: '10px 20px' }}>
          <button className="btn-secondary" style={{ marginBottom: '10px' }} onClick={() => setCurrentView('dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
        <SendMessage user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} />
      </div>
    );
  }

  // === APPROVAL VIEW ===

  if (currentView === 'approval') {
    return (
      <div className="property-admin-dashboard">
        <PropertyApproval
          user={user}
          onSettingsClick={() => setCurrentPage('settings')}
          onLogout={onLogout}
          onClose={() => { setCurrentView('dashboard'); fetchPropertyAdminData(); }}
          onRefresh={fetchPropertyAdminData}
          setCurrentPage={setCurrentPage}
          setViewMapPropertyId={setViewMapPropertyId}
        />
      </div>
    );
  }

  if (currentView === 'users') {
    return (
      <div className="property-admin-dashboard">
        <div style={{ padding: '20px' }}>
          <button className="btn-secondary" style={{ marginBottom: '15px' }} onClick={() => setCurrentView('dashboard')}>
            ← Back to Dashboard
          </button>
          <Users user={user} onLogout={onLogout} onSettingsClick={() => setCurrentPage('settings')} />
        </div>
      </div>
    );
  }

  // === ALL PROPERTIES VIEW ===
  if (currentView === 'all-properties') {
    return (
      <div className="property-admin-dashboard">
        <PageHeader
          title="All Properties"
          subtitle="View and manage all property statuses"
          user={user}
          onLogout={onLogout}
          onSettingsClick={() => setCurrentPage('settings')}
          actions={
            <button className="btn-secondary" onClick={() => { setCurrentView('dashboard'); fetchPropertyAdminData(); }}>
              ← Back to Dashboard
            </button>
          }
        />

        <div className="filters-bar" style={{ margin: '20px 0', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
          >
            <option value="all">All Types ({allProperties.length})</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="house">House</option>
            <option value="shop">Shop</option>
          </select>
          <span style={{ color: '#64748b', fontSize: '14px' }}>
            Showing {filteredProperties.length} of {allProperties.length} properties
          </span>
        </div>

        <div className="all-properties-list">
          {filteredProperties.map(property => {
            const vBadge = getVerificationBadge(property.verification_status);
            return (
              <div key={property.id} className="property-row-card">
                <div className="property-row-image">
                  {property.main_image ? (
                    <img
                      src={property.main_image}
                      alt={property.title}
                      onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="no-image-small">🏠</div>
                  )}
                </div>
                <div className="property-row-info">
                  <h4>{property.title}</h4>
                  <p>📍 {property.location} • {property.type} • {(property.price / 1000000).toFixed(2)}M ETB</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>
                    👤 {property.owner_name || property.broker_name || 'Unknown'} •
                    📅 {new Date(property.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="property-row-status">
                  <span className="status-badge" style={{ background: getStatusColor(property.status), color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px' }}>
                    {property.status}
                  </span>
                  <span style={{ fontSize: '12px', color: vBadge.color, marginTop: '4px' }}>
                    {vBadge.emoji} {vBadge.label}
                  </span>
                  {property._suspicious && (
                    <span style={{
                      display: 'inline-block',
                      background: '#ef4444',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '10px',
                      fontWeight: '700',
                      marginTop: '4px',
                      textTransform: 'uppercase'
                    }}>
                      ⚠ SUSPICIOUS
                    </span>
                  )}
                  {property._riskScore > 0 && (
                    <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
                      Risk: {property._riskScore}%
                    </span>
                  )}
                </div>
                <div className="property-row-actions">
                  <button className="btn-icon" title="View" onClick={() => viewPropertyDetail(property)}>👁️</button>
                  <button
                    className="btn-icon"
                    title="View Documents"
                    onClick={() => {
                      setSelectedProperty(property);
                      setCurrentView('documents');
                    }}
                    style={{ background: '#3b82f6', color: 'white' }}
                  >
                    📄
                  </button>
                  {property.status !== 'active' && (
                    <button className="btn-icon success" title="Approve" onClick={() => handleQuickAction(property.id, 'approved')}>✅</button>
                  )}
                  {property.status !== 'suspended' && (
                    <button className="btn-icon warning" title="Suspend" onClick={() => handleQuickAction(property.id, 'suspended')}>⏸️</button>
                  )}
                  {property.status !== 'inactive' && (
                    <button className="btn-icon danger" title="Reject" onClick={() => handleQuickAction(property.id, 'rejected')}>❌</button>
                  )}
                  <button
                    className="btn-icon danger"
                    title="Delete Permanently"
                    onClick={async () => {
                      if (window.confirm('PERMANENTLY DELETE this property? This cannot be undone.')) {
                        try {
                          await axios.delete(`${API_BASE}/properties/${property.id}`);
                          showNotification('Property deleted permanently.', 'success');
                          fetchAllProperties();
                        } catch (err) {
                          showNotification('Failed to delete property.', 'error');
                        }
                      }
                    }}
                  >
                    🗑️
                  </button>
                </div>

              </div>
            );
          })}
          {filteredProperties.length === 0 && (
            <div className="no-data" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              No properties found for the selected filter.
            </div>
          )}
        </div>

        {/* View Property Detail Modal */}
        {showViewModal && selectedProperty && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏠 {selectedProperty.title}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedProperty.latitude && selectedProperty.longitude && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (setViewMapPropertyId && setCurrentPage) {
                          setViewMapPropertyId(selectedProperty.id);
                          setCurrentPage('map-view');
                        }
                      }}
                      style={{
                        background: 'white',
                        color: '#475569',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      📍 View on Map
                    </button>
                  )}
                  <button
                    className="close-btn"
                    onClick={() => setShowViewModal(false)}
                    style={{ position: 'relative', top: 'auto', right: 'auto', margin: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="modal-body">
                <div className="property-review-grid">
                  <div className="review-section full-width">
                    <h3>📷 Property Images</h3>
                    <ImageGallery propertyId={selectedProperty.id} canDelete={false} />
                  </div>
                  <div className="review-section">
                    <h3>ℹ️ Details</h3>
                    <div className="info-grid">
                      <div><strong>Type:</strong> {selectedProperty.type}</div>
                      <div><strong>Listing:</strong> {selectedProperty.listing_type || 'sale'}</div>
                      <div><strong>Price:</strong> {(selectedProperty.price / 1000000).toFixed(2)}M ETB</div>
                      <div><strong>Location:</strong> {selectedProperty.location}</div>
                      <div><strong>Bedrooms:</strong> {selectedProperty.bedrooms || 'N/A'}</div>
                      <div><strong>Bathrooms:</strong> {selectedProperty.bathrooms || 'N/A'}</div>
                      <div><strong>Area:</strong> {selectedProperty.area || 'N/A'} m²</div>
                      <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedProperty.status), fontWeight: 'bold' }}>{selectedProperty.status}</span></div>
                    </div>
                    {selectedProperty.description && (
                      <div className="description-box"><strong>Description:</strong><p>{selectedProperty.description}</p></div>
                    )}
                    
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{marginTop: '20px'}}>ML Price Verification</h4>
                      
                    </div>
                  </div>
                  <div className="review-section">
                    <h3>👤 Owner/Broker</h3>
                    <div className="submitter-info">
                      <p><strong>Owner:</strong> {selectedProperty.owner_name || 'N/A'}</p>
                      <p><strong>Broker:</strong> {selectedProperty.broker_name || 'N/A'}</p>
                      <p><strong>Added:</strong> {new Date(selectedProperty.created_at).toLocaleString()}</p>
                    </div>
                    {selectedProperty.verification_status && (
                      <div style={{ marginTop: '15px' }}>
                        <h4>📋 Verification</h4>
                        <p><strong>Status:</strong> {getVerificationBadge(selectedProperty.verification_status).emoji} {selectedProperty.verification_status}</p>
                        {selectedProperty.verification_notes && <p><strong>Notes:</strong> {selectedProperty.verification_notes}</p>}
                        {selectedProperty.verified_at && <p><strong>Date:</strong> {new Date(selectedProperty.verified_at).toLocaleString()}</p>}
                        {selectedProperty.verified_by_name && <p><strong>By:</strong> {selectedProperty.verified_by_name}</p>}
                      </div>
                    )}
                  </div>
                  {/* Property Map */}
                  {(selectedProperty.latitude || selectedProperty.longitude) && (
                    <div className="review-section full-width" style={{ marginTop: '15px' }}>
                      <h3>📍 Property Location Map</h3>
                      <PropertyMap 
                        latitude={selectedProperty.latitude} 
                        longitude={selectedProperty.longitude} 
                        title={selectedProperty.title} 
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-success" onClick={() => { handleQuickAction(selectedProperty.id, 'approved'); setShowViewModal(false); }}>✅ Approve</button>
                <button className="btn-warning" onClick={() => { handleQuickAction(selectedProperty.id, 'suspended'); setShowViewModal(false); }}>⏸️ Suspend</button>
                <button className="btn-danger" onClick={() => { handleQuickAction(selectedProperty.id, 'rejected'); setShowViewModal(false); }}>❌ Reject</button>
                <button className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === MAIN DASHBOARD VIEW ===
  return (
    <div className="property-admin-dashboard">
      {/* Top Notification Banner */}
      {notification && (
        <div className={`top-notification ${notification.type}`}>
          <div className="notification-content">
            <span className="notification-icon">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            {notification.message}
          </div>
          <button className="notification-close" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <PageHeader
        title="Property Admin Dashboard"
        subtitle="Verify and manage property listings"
        user={user}
        onLogout={onLogout}
        onSettingsClick={() => setCurrentPage('settings')}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
            {stats.pendingVerification > 0 && (
              <button className="btn-warning" onClick={() => setCurrentView('approval')}>
                ⏳ Pending Properties ({stats.pendingVerification})
              </button>
            )}
            <button className="btn-primary" onClick={handleViewAll}>
              📋 View All Properties
            </button>
          </div>
        }
      />

      {/* Quick Navigation Toolbar */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        padding: '16px 20px', 
        background: '#fff', 
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '20px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        alignItems: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        <button className="btn-secondary" onClick={() => setCurrentView('agreements')} style={{ padding: '8px 16px', fontSize: '13px' }}>
          🤝 Agreements
        </button>
        <button className="btn-secondary" onClick={() => setCurrentView('broker-holds')} style={{ padding: '8px 16px', fontSize: '13px' }}>
          ⏱️ Booked Lists
        </button>
        <button className="btn-secondary" onClick={() => setCurrentView('key-requests')} style={{ padding: '8px 16px', fontSize: '13px' }}>
          🔐 Access Keys
        </button>
        <button className="btn-secondary" onClick={() => setCurrentView('reports')} style={{ padding: '8px 16px', fontSize: '13px' }}>
          📊 Visual Reports
        </button>
        <button className="btn-secondary" onClick={() => { setCurrentView('documents'); fetchAllProperties(); }} style={{ padding: '8px 16px', fontSize: '13px' }}>
          📄 Document Verification
        </button>
        <button className="btn-primary" onClick={() => setCurrentPage('site-check')} style={{ padding: '8px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
          📍 Start Site Check
        </button>
        <button className="btn-primary" onClick={() => setCurrentView('send-message')} style={{ padding: '8px 16px', fontSize: '13px', background: '#3b82f6' }}>
          📤 Send Message
        </button>
        <button
          className="btn-secondary"
          onClick={() => { setSuspiciousData([]); setCurrentView('suspicious'); }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            background: stats.suspiciousProperties > 0 ? '#fef2f2' : undefined,
            color: stats.suspiciousProperties > 0 ? '#dc2626' : undefined,
            borderColor: stats.suspiciousProperties > 0 ? '#fecaca' : undefined
          }}
        >
          ⚠️ Suspicious Activity {stats.suspiciousProperties > 0 ? `(${stats.suspiciousProperties})` : ''}
        </button>
        {stats.pendingAgreementRequests > 0 && (
          <button className="btn-warning" onClick={() => setCurrentView('agreement-requests')} style={{ padding: '8px 16px', fontSize: '13px' }}>
            🤝 Mediate Agreements ({stats.pendingAgreementRequests})
          </button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setCurrentView('approval')}>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingVerification}</h3>
            <p>Pending Verification</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}>✅</div>
          <div className="stat-content">
            <h3>{stats.verifiedProperties}</h3>
            <p>Verified Properties</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>❌</div>
          <div className="stat-content">
            <h3>{stats.rejectedProperties}</h3>
            <p>Rejected</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>⏸️</div>
          <div className="stat-content">
            <h3>{stats.suspendedProperties}</h3>
            <p>Suspended</p>
          </div>
        </div>
        <div className="stat-card clickable" style={{ cursor: 'pointer', border: stats.suspiciousProperties > 0 ? '2px solid #fecaca' : undefined }} onClick={() => { setSuspiciousData([]); setCurrentView('suspicious'); }}>
          <div className="stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>⚠️</div>
          <div className="stat-content">
            <h3>{stats.suspiciousProperties}</h3>
            <p>Suspicious</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentView('agreement-requests')}>
          <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0ea5e9' }}>🤝</div>
          <div className="stat-content">
            <h3>{stats.pendingAgreementRequests}</h3>
            <p>Agreements Needed</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentView('broker-holds')}>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>⏱️</div>
          <div className="stat-content">
            <h3>{stats.totalBookings}</h3>
            <p>Booked Lists</p>
          </div>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h3>⏳ Pending Verification</h3>
          <button className="btn-text" onClick={() => setCurrentView('approval')}>
            Review All ({stats.pendingVerification})
          </button>
        </div>
        <div className="verification-summary">
          {stats.pendingVerification > 0 ? (
            <>
              <p>You have <strong>{stats.pendingVerification}</strong> properties waiting for verification.</p>
              <button className="btn-primary" onClick={() => setCurrentView('approval')}>
                Pending Properties
              </button>
            </>
          ) : (
            <p>✅ All properties have been reviewed! <button className="btn-text" onClick={handleViewAll}>View all properties →</button></p>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📊 Property Status Overview</h3>
            <button className="btn-text" onClick={handleViewAll}>View All</button>
          </div>
          <div className="stats-chart">
            {[
              { label: 'Verified / Active', count: stats.verifiedProperties, total: stats.totalProperties, className: 'success' },
              { label: 'Pending Review', count: stats.pendingVerification, total: stats.totalProperties, className: 'warning' },
              { label: 'Rejected / Inactive', count: stats.rejectedProperties, total: stats.totalProperties, className: 'danger' },
              { label: 'Suspended', count: stats.suspendedProperties, total: stats.totalProperties, className: 'suspended' }
            ].map(item => (
              <div key={item.label} className="chart-item">
                <div className="chart-label">{item.label}</div>
                <div className="chart-bar">
                  <div className={`chart-fill ${item.className}`} style={{ width: `${stats.totalProperties > 0 ? (item.count / stats.totalProperties) * 100 : 0}%` }}></div>
                </div>
                <div className="chart-value">{item.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h3>📈 Quick Stats</h3>
          </div>
          <div className="quick-stats-list">
            <div className="quick-stat-item">
              <span>Total Properties</span>
              <strong>{stats.totalProperties}</strong>
            </div>
            <div className="quick-stat-item">
              <span>Verification Rate</span>
              <strong>{stats.totalProperties > 0 ? Math.round((stats.verifiedProperties / stats.totalProperties) * 100) : 0}%</strong>
            </div>
            <div className="quick-stat-item">
              <span>Rejection Rate</span>
              <strong>{stats.totalProperties > 0 ? Math.round((stats.rejectedProperties / stats.totalProperties) * 100) : 0}%</strong>
            </div>
          </div>
        </div>
      </div>

      {showAdminMessages && (
        <div className="modal-overlay" onClick={() => setShowAdminMessages(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <AdminMessagesView 
              user={user} 
              onClose={() => setShowAdminMessages(false)}
            />
          </div>
        </div>
      )}

      {/* Agreement Workflow Modal */}
      {showAgreementWorkflow && (
        <div className="modal-overlay" onClick={() => setShowAgreementWorkflow(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤝 Agreement Workflow</h2>
              <button className="close-btn" onClick={() => setShowAgreementWorkflow(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <AgreementWorkflow user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyAdminDashboard;
