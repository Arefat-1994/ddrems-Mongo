import React, { useState, useEffect } from 'react';
import './OwnerDashboard.css';
import PageHeader from './PageHeader';
// import ImageUploader from './shared/ImageUploader';
// import DocumentUploader from './shared/DocumentUploader';
import ImageGallery from './shared/ImageGallery';
import DocumentManager from './shared/DocumentManager';
import MessageNotificationWidget from './MessageNotificationWidget';
import AgreementWorkflow from './AgreementWorkflow';
import AgreementManagement from './AgreementManagement';
import PropertyUploaderModal from './shared/PropertyUploaderModal';
import axios from 'axios';

const OwnerDashboardEnhanced = ({ user, onLogout, setCurrentPage }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, agreements
  const [stats, setStats] = useState({
    myProperties: 0,
    activeListings: 0,
    totalViews: 0,
    totalRevenue: 0,
    pendingAgreements: 0,
    activeAgreements: 0
  });
  const [myProperties, setMyProperties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  // const [announcements, setAnnouncements] = useState([]);
  const [documentAccessRequests, setDocumentAccessRequests] = useState([]);
  
  // UI States
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showViewProperty, setShowViewProperty] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showSendKeyModal, setShowSendKeyModal] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [showAgreementsModal, setShowAgreementsModal] = useState(false);
  const [showAccessRequestsModal, setShowAccessRequestsModal] = useState(false);
  // const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [videoUploadType, setVideoUploadType] = useState('file');
  const [videoLink, setVideoLink] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOwnerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOwnerData = async () => {
    try {
      const [propertiesRes, agreementRequestsRes, notificationsRes] = await Promise.all([
        axios.get(`http://${window.location.hostname}:5000/api/properties/owner/${user.id}`),
        axios.get(`http://${window.location.hostname}:5000/api/agreement-requests/owner/${user.id}`),
        axios.get(`http://${window.location.hostname}:5000/api/notifications/${user.id}`)
      ]);

      setMyProperties(propertiesRes.data);
      setAgreements(agreementRequestsRes.data);
      setNotifications(notificationsRes.data);
      // setAnnouncements(announcementsRes.data.slice(0, 5));

      const activeListings = propertiesRes.data.filter(p => p.status === 'active').length;
      const totalViews = propertiesRes.data.reduce((sum, p) => sum + (p.views || 0), 0);
      const pendingAgreements = agreementRequestsRes.data.length; // All fetched are pending
      const activeAgreements = 0; // We'll calculate this differently if needed

      setStats({
        myProperties: propertiesRes.data.length,
        activeListings,
        totalViews,
        totalRevenue: 0,
        pendingAgreements,
        activeAgreements
      });

      // Fetch document access requests for owner's properties
      const propertyIds = propertiesRes.data.map(p => p.id);
      const requestsPromises = propertyIds.map(id =>
        axios.get(`http://${window.location.hostname}:5000/api/document-access/property/${id}`).catch(() => ({ data: [] }))
      );
      const requestsResults = await Promise.all(requestsPromises);
      const allRequests = requestsResults.flatMap(res => res.data);
      setDocumentAccessRequests(allRequests.filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Error fetching owner data:', error);
    }
  };



  const viewProperty = (property) => {
    setSelectedProperty(property);
    setShowViewProperty(true);
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      await axios.delete(`http://${window.location.hostname}:5000/api/properties/${propertyId}`);
      alert('Property deleted successfully');
      fetchOwnerData();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const handleAgreementResponse = async (requestId, status) => {
    try {
      await axios.put(`http://${window.location.hostname}:5000/api/agreement-requests/${requestId}/respond`, { 
        status,
        responded_by: user.id,
        response_message: status === 'accepted' ? 'Your agreement request has been accepted.' : 'Your agreement request has been rejected.'
      });
      alert(`Agreement request ${status} successfully!`);
      fetchOwnerData(); // Refresh data
    } catch (error) {
      console.error('Error responding to agreement request:', error);
      alert('Failed to respond to agreement request. Please try again.');
    }
  };

  const handleDocumentAccessResponse = async (requestId, status) => {
    try {
      await axios.put(`http://${window.location.hostname}:5000/api/document-access/${requestId}/respond`, { status });
      alert(`Access request ${status}!`);
      fetchOwnerData();
    } catch (error) {
      console.error('Error handling access request:', error);
      alert('Failed to handle access request');
    }
  };

  const viewPropertyDocuments = async (property) => {
    setSelectedProperty(property);
    setShowDocumentsModal(true);
  };

  const sendDocumentKey = async (document, recipientId) => {
    try {
      await axios.post(`http://${window.location.hostname}:5000/api/messages`, {
        sender_id: user.id,
        receiver_id: recipientId,
        subject: `Document Access Key for ${selectedProperty?.title}`,
        message: `Here is your access key for the document "${document.document_name}": ${document.access_key}\n\nYou can use this key to view the document.`
      });
      alert('✅ Access key sent successfully!');
      setShowSendKeyModal(false);
    } catch (error) {
      console.error('Error sending key:', error);
      alert('❌ Failed to send key');
    }
  };

  const handleVideoUpload = async (e, propertyId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Video file is too large. Maximum size is 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    try {
      setVideoUploadProgress(1); // Start progress
      const res = await axios.put(`http://${window.location.hostname}:5000/api/properties/${propertyId}/video`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setVideoUploadProgress(percentCompleted);
        }
      });
      alert('✅ Video uploaded successfully!');
      
      // Update selectedProperty to reflect new video URL
      if (selectedProperty && selectedProperty.id === propertyId) {
        setSelectedProperty({...selectedProperty, video_url: res.data.video_url});
      }
      
      setShowVideoUploadModal(false);
      fetchOwnerData();
    } catch (error) {
      console.error('Video upload error:', error);
      alert('❌ Failed to upload video: ' + (error.response?.data?.message || 'Server error'));
    } finally {
      setVideoUploadProgress(0);
    }
  };

  const handleVideoLinkSubmit = async (e, propertyId) => {
    e.preventDefault();
    if (!videoLink) return;

    try {
      setActionLoading(true);
      await axios.put(`http://${window.location.hostname}:5000/api/properties/${propertyId}/video-link`, { video_url: videoLink });
      alert('✅ Video link updated successfully!');
      setShowVideoUploadModal(false);
      setVideoLink('');
      fetchOwnerData();
    } catch (error) {
      console.error('Video link update error:', error);
      alert('❌ Failed to update video link');
    } finally {
      setActionLoading(false);
    }
  };




  const getStatusBadge = (status) => {
    const badges = {
      active: { emoji: '✅', color: '#10b981' },
      pending: { emoji: '⏳', color: '#f59e0b' },
      sold: { emoji: '💰', color: '#3b82f6' },
      rented: { emoji: '🔑', color: '#8b5cf6' },
      inactive: { emoji: '❌', color: '#6b7280' },
      suspended: { emoji: '⏸️', color: '#ef4444' }
    };
    return badges[status] || badges.pending;
  };

  const renderPropertyImage = (property) => {
    if (property.main_image) {
      return (
        <img
          src={property.main_image}
          alt={property.title}
          onClick={() => viewProperty(property)}
          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer' }}
          title="Click to view details"
          onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }}
        />
      );
    }
    return <div onClick={() => viewProperty(property)} style={{ width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', cursor: 'pointer' }} title="Click to view details">🏠</div>;
  };

  if (currentView === 'agreements') {
    return (
      <div className="owner-dashboard">
        <PageHeader
          title="Agreements Progress"
          subtitle="Monitor and manage all your property agreements and their workflow status"
          user={user}
          onLogout={onLogout}
          actions={
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
                ← Back to Dashboard
              </button>
              <button className="btn-primary" onClick={() => setShowAddProperty(true)}>
                ➕ Add Property
              </button>
            </div>
          }
        />
        <div style={{ padding: '20px', marginTop: '-20px' }}>
          <AgreementManagement user={user} onLogout={onLogout} hideHeader={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="owner-dashboard">
      <PageHeader
        title="Owner Dashboard"
        subtitle="Manage your properties and agreements"
        user={user}
        onLogout={onLogout}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
            {documentAccessRequests.length > 0 && (
              <button className="btn-secondary" onClick={() => setShowAccessRequestsModal(true)}>
                🔑 Access Requests ({documentAccessRequests.length})
              </button>
            )}
            <button className="btn-secondary" onClick={() => setCurrentView('agreements')}>
              🤝 Agreements Progress
            </button>
            <button className="btn-secondary" onClick={() => setShowAgreementWorkflow(true)}>
              📈 Agreements
            </button>
            <button className="btn-primary" onClick={() => setShowAddProperty(true)}>
              ➕ Add Property
            </button>
          </div>
        }
      />

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>🏠</div>
          <div className="stat-content"><h3>{stats.myProperties}</h3><p>My Properties</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}>✅</div>
          <div className="stat-content"><h3>{stats.activeListings}</h3><p>Active Listings</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>👁️</div>
          <div className="stat-content"><h3>{stats.totalViews}</h3><p>Total Views</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ede9fe', color: '#8b5cf6' }}>🤝</div>
          <div className="stat-content"><h3>{stats.pendingAgreements}</h3><p>Agreement Requests</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>🔑</div>
          <div className="stat-content"><h3>{documentAccessRequests.length}</h3><p>Access Requests</p></div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* My Properties */}
        <div className="dashboard-card full-width">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3>📋 My Properties</h3>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '5px 0 0 0' }}>Displaying all your properties (Active, Pending, etc.)</p>
            </div>
          </div>
          <div className="properties-table">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Listing</th>
                  <th>Price (ETB)</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myProperties.map(property => (
                  <tr key={property.id}>
                    <td>{renderPropertyImage(property)}</td>
                    <td><strong>{property.title}</strong></td>
                    <td>{property.type}</td>
                    <td><span className={`listing-badge ${property.listing_type || 'sale'}`}>{property.listing_type || 'sale'}</span></td>
                    <td>{(property.price / 1000000).toFixed(2)}M</td>
                    <td>📍 {property.location}</td>
                    <td>
                      <span className={`status-badge ${property.status}`} style={{ color: getStatusBadge(property.status).color }}>
                        {getStatusBadge(property.status).emoji} {property.status}
                      </span>
                    </td>
                    <td>{property.views || 0}</td>
                    <td>
                      <button 
                        className="btn-icon" 
                        title="View Documents" 
                        onClick={() => viewPropertyDocuments(property)}
                        style={{ background: '#3b82f6', color: 'white', padding: '5px 10px', borderRadius: '5px' }}
                      >
                        📄 Docs
                      </button>
                    </td>
                    <td>
                      <button className="btn-icon" title="View" onClick={() => viewProperty(property)}>👁️</button>
                      <button 
                        className="btn-icon" 
                        title="Upload Video" 
                        onClick={() => {
                          setSelectedProperty(property);
                          setShowVideoUploadModal(true);
                        }}
                        style={{ color: '#8b5cf6' }}
                      >
                        🎥
                      </button>
                      <button className="btn-icon" title="Delete" onClick={() => deleteProperty(property.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myProperties.length === 0 && (
              <p className="no-data">No properties yet. Add your first property!</p>
            )}
          </div>
        </div>



        {/* Notifications */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>🔔 Notifications</h3>
            <button className="btn-text" onClick={() => setCurrentPage('messages')}>View All Messages</button>
          </div>
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div 
                key={notification.id} 
                className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                onClick={() => setCurrentPage('messages')}
                style={{ cursor: 'pointer' }}
              >
                <div className="notification-icon">{notification.type === 'success' ? '✅' : notification.type === 'warning' ? '⚠️' : 'ℹ️'}</div>
                <div className="notification-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                  <span className="notification-time">{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {notifications.length === 0 && <p className="no-data">No notifications</p>}
          </div>
        </div>
      </div>

      {/* ============ ADD PROPERTY MODAL ============ */}
      {showAddProperty && (
        <PropertyUploaderModal 
          user={user} 
          onClose={() => setShowAddProperty(false)} 
          onSuccess={fetchOwnerData}
        />
      )}

      {/* View Property Modal */}
      {showViewProperty && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowViewProperty(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 {selectedProperty.title}</h2>
              <button className="close-btn" onClick={() => setShowViewProperty(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="property-view-grid">
                <div className="property-view-section full-width">
                  <h3>📷 Images</h3>
                  <ImageGallery propertyId={selectedProperty.id} canDelete={true} onDelete={fetchOwnerData} />
                </div>
                <div className="property-view-section">
                  <h3>📄 Documents</h3>
                  <DocumentManager propertyId={selectedProperty.id} uploadedBy={user.id} />
                </div>
                <div className="property-view-section full-width">
                  <h3>ℹ️ Property Details</h3>
                  <div className="property-details-grid">
                    <div><strong>Type:</strong> {selectedProperty.type}</div>
                    <div><strong>Listing:</strong> {selectedProperty.listing_type || 'sale'}</div>
                    <div><strong>Price:</strong> {(selectedProperty.price / 1000000).toFixed(2)}M ETB</div>
                    <div><strong>Location:</strong> {selectedProperty.location}</div>
                    <div><strong>Bedrooms:</strong> {selectedProperty.bedrooms || 'N/A'}</div>
                    <div><strong>Bathrooms:</strong> {selectedProperty.bathrooms || 'N/A'}</div>
                    <div><strong>Area:</strong> {selectedProperty.area || 'N/A'} m²</div>
                    <div>
                      <strong>Status:</strong>{' '}
                      <span className={`status-badge ${selectedProperty.status}`} style={{ color: getStatusBadge(selectedProperty.status).color }}>
                        {getStatusBadge(selectedProperty.status).emoji} {selectedProperty.status}
                      </span>
                    </div>
                  </div>
                  {selectedProperty.description && (
                    <div className="property-description">
                      <strong>Description:</strong>
                      <p>{selectedProperty.description}</p>
                    </div>
                  )}

                  {/* MAP VIEW */}
                  {selectedProperty.latitude && selectedProperty.longitude ? (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ marginBottom: '10px' }}>🗺️ View on Map</h4>
                      <iframe
                        title="Property Location"
                        width="100%"
                        height="250"
                        frameBorder="0"
                        scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedProperty.longitude - 0.01},${selectedProperty.latitude - 0.01},${selectedProperty.longitude + 0.01},${selectedProperty.latitude + 0.01}&layer=mapnik&marker=${selectedProperty.latitude},${selectedProperty.longitude}`}
                        style={{ borderRadius: 10, border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  ) : (
                    <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                      <p style={{ color: '#64748b', fontSize: '13px' }}>🗺️ Map coordinates not available for this property.</p>
                    </div>
                  )}

                  {/* VIDEO SECTION */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                    <h4 style={{ marginBottom: '10px' }}>🎥 Property Video Tour</h4>
                    {selectedProperty.video_url ? (
                      <div>
                        <video controls style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e2e8f0' }} src={selectedProperty.video_url}>
                          Your browser does not support video playback.
                        </video>
                        <div style={{ marginTop: '10px' }}>
                          <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                            🔄 Replace Video (Max 10MB)
                            <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleVideoUpload(e, selectedProperty.id)} disabled={videoUploadProgress > 0} />
                          </label>
                          {videoUploadProgress > 0 && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#3b82f6' }}>Uploading... {videoUploadProgress}%</span>}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                        <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>No video uploaded yet.</p>
                        <label className="btn-primary" style={{ cursor: 'pointer', display: 'inline-block', padding: '8px 16px' }}>
                          ➕ Upload Video (Max 10MB)
                          <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => handleVideoUpload(e, selectedProperty.id)} disabled={videoUploadProgress > 0} />
                        </label>
                        {videoUploadProgress > 0 && <p style={{ marginTop: '10px', fontSize: '12px', color: '#3b82f6' }}>Uploading... {videoUploadProgress}%</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Requests Modal */}
      {showAccessRequestsModal && (
        <div className="modal-overlay" onClick={() => setShowAccessRequestsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Document Access Requests</h2>
              <button className="close-btn" onClick={() => setShowAccessRequestsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="access-requests-list">
                {documentAccessRequests.length > 0 ? documentAccessRequests.map(request => (
                  <div key={request.id} className="access-request-card">
                    <div className="request-info">
                      <h4>{request.user_name}</h4>
                      <p>📧 {request.user_email}</p>
                      <p>🏠 Property: {myProperties.find(p => p.id === request.property_id)?.title}</p>
                      <span className="request-date">Requested: {new Date(request.requested_at).toLocaleString()}</span>
                    </div>
                    <div className="request-actions">
                      <button className="btn-success" onClick={() => handleDocumentAccessResponse(request.id, 'approved')}>✅ Approve</button>
                      <button className="btn-danger" onClick={() => handleDocumentAccessResponse(request.id, 'rejected')}>❌ Reject</button>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state"><div className="empty-icon">🔑</div><p>No pending access requests</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agreements Modal */}
      {showAgreementsModal && (
        <div className="modal-overlay" onClick={() => setShowAgreementsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤝 Agreement Requests</h2>
              <button className="close-btn" onClick={() => setShowAgreementsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="agreements-list">
                {agreements.length > 0 ? agreements.map(request => (
                  <div key={request.id} className="agreement-card">
                    <div className="agreement-info">
                      <h4>{request.property_title}</h4>
                      <p>Location: {request.property_location}</p>
                      <p>Price: {(request.property_price / 1000000).toFixed(2)}M ETB</p>
                      <p>Customer: {request.customer_name} ({request.customer_email})</p>
                      <p>Request Message: {request.request_message}</p>
                      <span className="agreement-date">Requested: {new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="agreement-actions">
                      <button 
                        className="btn-approve"
                        onClick={() => handleAgreementResponse(request.id, 'accepted')}
                      >
                        ✅ Accept
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => handleAgreementResponse(request.id, 'rejected')}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state"><div className="empty-icon">🤝</div><p>No agreement requests</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {showDocumentsModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowDocumentsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Documents for {selectedProperty.title}</h2>
              <button className="close-btn" onClick={() => setShowDocumentsModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <DocumentManager
                propertyId={selectedProperty.id}
                uploadedBy={user.id}
                onSendKey={(doc) => {
                  setSelectedDocument(doc);
                  setShowSendKeyModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Send Key Modal */}
      {showSendKeyModal && selectedDocument && (
        <div className="modal-overlay" onClick={() => setShowSendKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Send Access Key</h2>
              <button className="close-btn" onClick={() => setShowSendKeyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Document:</label>
                <p><strong>{selectedDocument.document_name}</strong></p>
              </div>
              <div className="form-group">
                <label>Access Key:</label>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '2px' }}>
                  {selectedDocument.access_key}
                </p>
              </div>
              <div className="form-group">
                <label>Send to Customer:</label>
                <select 
                  id="recipient-select"
                  className="form-control"
                  onChange={(e) => {
                    if (e.target.value) {
                      sendDocumentKey(selectedDocument, parseInt(e.target.value));
                    }
                  }}
                >
                  <option value="">Select customer...</option>
                  {documentAccessRequests
                    .filter(req => req.property_id === selectedProperty?.id)
                    .map(req => (
                      <option key={req.id} value={req.user_id}>
                        {req.user_name} ({req.user_email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="info-box" style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ margin: 0, color: '#1e40af' }}>
                  💡 <strong>Tip:</strong> The access key will be sent via message to the selected customer.
                </p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSendKeyModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Workflow Modal */}
      {showAgreementWorkflow && (
        <div className="modal-overlay" onClick={() => setShowAgreementWorkflow(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🤝 Agreements</h2>
              <button className="close-btn" onClick={() => setShowAgreementWorkflow(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <AgreementWorkflow user={user} onLogout={onLogout} hideHeader={true} />
            </div>
          </div>
        </div>
      )}
      {/* Video Upload Modal */}
      {showVideoUploadModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowVideoUploadModal(false)} style={{ zIndex: 1300 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>📹 Property Video Tour</h2>
              <button onClick={() => setShowVideoUploadModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <button 
                onClick={() => setVideoUploadType('file')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
                  background: videoUploadType === 'file' ? '#3b82f6' : '#f1f5f9',
                  color: videoUploadType === 'file' ? 'white' : '#64748b',
                  fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                📁 Upload File
              </button>
              <button 
                onClick={() => setVideoUploadType('link')}
                style={{ 
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none', 
                  background: videoUploadType === 'link' ? '#3b82f6' : '#f1f5f9',
                  color: videoUploadType === 'link' ? 'white' : '#64748b',
                  fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                🔗 Video Link
              </button>
            </div>

            {videoUploadType === 'file' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>Select a video file from your computer. Max size: <strong>10MB</strong>.</p>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={(e) => handleVideoUpload(e, selectedProperty.id)}
                    style={{ 
                      width: '100%', padding: '40px 20px', border: '2px dashed #cbd5e1', 
                      borderRadius: '12px', textAlign: 'center', cursor: 'pointer'
                    }}
                  />
                  {videoUploadProgress > 0 && (
                    <div style={{ marginTop: '15px' }}>
                      <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${videoUploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }} />
                      </div>
                      <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '5px' }}>Uploading: {videoUploadProgress}%</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => handleVideoLinkSubmit(e, selectedProperty.id)} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <p style={{ fontSize: '14px', color: '#64748b' }}>Provide a direct link to the property video (e.g., YouTube, Vimeo, or Cloud link).</p>
                <input 
                  type="url" 
                  required 
                  placeholder="https://example.com/video.mp4"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  style={{ 
                    width: '100%', padding: '12px', background: '#3b82f6', color: 'white', 
                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                    opacity: actionLoading ? 0.7 : 1
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Video Link'}
                </button>
              </form>
            )}

            <div style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderRadius: '10px', border: '1px solid #ffedd5' }}>
              <p style={{ fontSize: '12px', color: '#9a3412', margin: 0 }}>
                💡 <strong>Note:</strong> This video will be used during the media release phase of agreements. Ensure it provides a clear tour of the property.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default OwnerDashboardEnhanced;
