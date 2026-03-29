import React, { useState, useEffect } from 'react';
import './OwnerDashboard.css';
import PageHeader from './PageHeader';
import ImageUploader from './shared/ImageUploader';
import DocumentUploader from './shared/DocumentUploader';
import ImageGallery from './shared/ImageGallery';
import DocumentManager from './shared/DocumentManager';
import MessageNotificationWidget from './MessageNotificationWidget';
import AIPriceComparison from './AIPriceComparison';
import AgreementWorkflow from './AgreementWorkflow';
import axios from 'axios';

const OwnerDashboardEnhanced = ({ user, onLogout }) => {
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
  const [announcements, setAnnouncements] = useState([]);
  const [documentAccessRequests, setDocumentAccessRequests] = useState([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showViewProperty, setShowViewProperty] = useState(false);
  const [showAgreementsModal, setShowAgreementsModal] = useState(false);
  const [showAccessRequestsModal, setShowAccessRequestsModal] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showSendKeyModal, setShowSendKeyModal] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'low',
    target_role: 'all'
  });

  const [propertyForm, setPropertyForm] = useState({
    title: '',
    type: 'apartment',
    listing_type: 'sale',
    price: '',
    location: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    description: '',
    distance_to_center_km: '3',
    near_school: false,
    near_hospital: false,
    near_market: false,
    parking: false,
    security_rating: '3',
    condition: 'Good'
  });
  const [newPropertyId, setNewPropertyId] = useState(null);
  const [addStep, setAddStep] = useState('form'); // form, images, documents, preview
  const [previewImages, setPreviewImages] = useState([]);
  const [previewProperty, setPreviewProperty] = useState(null);
  const [previewDocs, setPreviewDocs] = useState([]);

  useEffect(() => {
    fetchOwnerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOwnerData = async () => {
    try {
      const [propertiesRes, agreementRequestsRes, notificationsRes, announcementsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/properties/owner/${user.id}`),
        axios.get(`http://localhost:5000/api/agreement-requests/owner/${user.id}`),
        axios.get(`http://localhost:5000/api/notifications/${user.id}`),
        axios.get('http://localhost:5000/api/announcements')
      ]);

      setMyProperties(propertiesRes.data);
      setAgreements(agreementRequestsRes.data);
      setNotifications(notificationsRes.data);
      setAnnouncements(announcementsRes.data.slice(0, 5));

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
        axios.get(`http://localhost:5000/api/document-access/property/${id}`).catch(() => ({ data: [] }))
      );
      const requestsResults = await Promise.all(requestsPromises);
      const allRequests = requestsResults.flatMap(res => res.data);
      setDocumentAccessRequests(allRequests.filter(r => r.status === 'pending'));
    } catch (error) {
      console.error('Error fetching owner data:', error);
    }
  };

  // === ADD PROPERTY FLOW ===
  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/properties', {
        ...propertyForm,
        owner_id: user.id,
        status: 'pending',
        // Map frontend fields to backend expected names if different
        size_m2: propertyForm.area,
        property_type: propertyForm.type,
        location_name: propertyForm.location
      });

      setNewPropertyId(response.data.id);
      setAddStep('images');
      alert('✅ Property details saved! Now upload images.');
    } catch (error) {
      console.error('Error adding property:', error);
      alert('Failed to add property. Please try again.');
    }
  };

  const handleImageUploadComplete = () => {
    setAddStep('documents');
  };

  const handleDocUploadComplete = async () => {
    setAddStep('preview');
    await fetchPreviewData();
  };

  const fetchPreviewData = async () => {
    try {
      // Fetch actual property data from DB
      const [propertyRes, imagesRes, docsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/properties/${newPropertyId}`),
        axios.get(`http://localhost:5000/api/property-images/property/${newPropertyId}`),
        axios.get(`http://localhost:5000/api/property-documents/property/${newPropertyId}`).catch(() => ({ data: [] }))
      ]);
      setPreviewProperty(propertyRes.data);
      setPreviewImages(imagesRes.data);
      setPreviewDocs(docsRes.data);
    } catch (error) {
      console.error('Error fetching preview data:', error);
    }
  };

  const handleFinalSubmit = () => {
    setAddStep('form');
    setShowAddProperty(false);
    setNewPropertyId(null);
    setPreviewProperty(null);
    setPreviewImages([]);
    setPreviewDocs([]);
    setPropertyForm({
      title: '',
      type: 'apartment',
      listing_type: 'sale',
      price: '',
      location: '',
      bedrooms: '',
      bathrooms: '',
      area: '',
      description: '',
      distance_to_center_km: '3',
      near_school: false,
      near_hospital: false,
      near_market: false,
      parking: false,
      security_rating: '3',
      condition: 'Good'
    });
    fetchOwnerData();
    alert('🎉 Property submitted successfully! Waiting for admin approval.');
  };

  const handleCancelAdd = () => {
    if (newPropertyId && addStep !== 'preview') {
      if (!window.confirm('Are you sure? Property details have been saved. You can continue later.')) return;
    }
    setAddStep('form');
    setShowAddProperty(false);
    setNewPropertyId(null);
    setPreviewProperty(null);
    setPreviewImages([]);
    setPreviewDocs([]);
  };

  const viewProperty = (property) => {
    setSelectedProperty(property);
    setShowViewProperty(true);
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/properties/${propertyId}`);
      alert('Property deleted successfully');
      fetchOwnerData();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const handleAgreementResponse = async (requestId, status) => {
    try {
      await axios.put(`http://localhost:5000/api/agreement-requests/${requestId}/respond`, { 
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
      await axios.put(`http://localhost:5000/api/document-access/${requestId}/respond`, { status });
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
      await axios.post('http://localhost:5000/api/messages', {
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

  const handleAddAnnouncement = async (e) => {

    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/announcements', {
        ...announcementForm,
        author_id: user.id
      });
      alert('Announcement posted successfully!');
      setShowAddAnnouncement(false);
      setAnnouncementForm({ title: '', content: '', priority: 'low', target_role: 'all' });
      fetchOwnerData();
    } catch (error) {
      console.error('Error posting announcement:', error);
      alert('Failed to post announcement');
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
          style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}
          onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }}
        />
      );
    }
    return <div style={{ width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🏠</div>;
  };

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
            />
            {documentAccessRequests.length > 0 && (
              <button className="btn-secondary" onClick={() => setShowAccessRequestsModal(true)}>
                🔑 Access Requests ({documentAccessRequests.length})
              </button>
            )}
            <button className="btn-secondary" onClick={() => setShowAgreementWorkflow(true)}>
              🤝 Agreements
            </button>
            <button className="btn-secondary" onClick={() => setShowAgreementsModal(true)}>
              📄 Agreement Requests
            </button>
            <button className="btn-secondary" onClick={() => setShowAddAnnouncement(true)}>
              📢 Post Announcement
            </button>
            <button className="btn-primary" onClick={() => { setShowAddProperty(true); setAddStep('form'); }}>
              <span>➕</span> Add Property
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
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>⏳</div>
          <div className="stat-content"><h3>{stats.pendingAgreements}</h3><p>Pending Agreements</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>🔑</div>
          <div className="stat-content"><h3>{documentAccessRequests.length}</h3><p>Access Requests</p></div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* My Properties */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>📋 My Properties</h3>
            <button className="btn-text" onClick={() => { setShowAddProperty(true); setAddStep('form'); }}>Add New</button>
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

        {/* Announcements */}
        <div className="dashboard-card">
          <div className="card-header"><h3>📢 Announcements</h3></div>
          <div className="announcements-list">
            {announcements.length > 0 ? announcements.map(announcement => (
              <div key={announcement.id} className="announcement-item">
                <span className={`priority-badge ${announcement.priority}`}>{announcement.priority}</span>
                <h4>{announcement.title}</h4>
                <p>{announcement.content.substring(0, 100)}...</p>
                <span className="announcement-date">{new Date(announcement.created_at).toLocaleDateString()}</span>
              </div>
            )) : (
              <p className="no-data">No announcements</p>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="dashboard-card">
          <div className="card-header"><h3>🔔 Notifications</h3></div>
          <div className="notifications-list">
            {notifications.slice(0, 5).map(notification => (
              <div key={notification.id} className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}>
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
        <div className="modal-overlay">
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>

            {/* Step Indicator */}
            <div className="modal-header">
              <h2>
                {addStep === 'form' && '➕ Step 1: Property Details'}
                {addStep === 'images' && '📷 Step 2: Upload Images'}
                {addStep === 'documents' && '📄 Step 3: Upload Documents'}
                {addStep === 'preview' && '👁️ Step 4: Preview & Submit'}
              </h2>
              <button className="close-btn" onClick={handleCancelAdd}>✕</button>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: 'flex', gap: '4px', padding: '0 30px', marginBottom: '20px' }}>
              {['form', 'images', 'documents', 'preview'].map((step, index) => (
                <div key={step} style={{
                  flex: 1, height: '4px', borderRadius: '2px',
                  background: ['form', 'images', 'documents', 'preview'].indexOf(addStep) >= index ? '#3b82f6' : '#e2e8f0'
                }} />
              ))}
            </div>

            {/* STEP 1: Property Form */}
            {addStep === 'form' && (
              <form onSubmit={handleAddProperty}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Property Title *</label>
                      <input type="text" value={propertyForm.title} onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })} required placeholder="e.g., Modern Villa in Kezira" />
                    </div>
                    <div className="form-group">
                      <label>Property Type *</label>
                      <select value={propertyForm.type} onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })} required>
                        <option value="apartment">Apartment</option>
                        <option value="villa">Villa</option>
                        <option value="house">House</option>
                        <option value="land">Land</option>
                        <option value="commercial">Commercial</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Listing Type *</label>
                      <select value={propertyForm.listing_type} onChange={(e) => setPropertyForm({ ...propertyForm, listing_type: e.target.value })} required>
                        <option value="sale">For Sale</option>
                        <option value="rent">For Rent</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Price (ETB) *</label>
                      <input type="number" value={propertyForm.price} onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })} required placeholder="e.g., 8500000" />
                    </div>
                    <div className="form-group">
                      <label>Location *</label>
                      <input type="text" value={propertyForm.location} onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })} required placeholder="e.g., Kezira, Dire Dawa" />
                    </div>
                    <div className="form-group">
                      <label>Bedrooms</label>
                      <input type="number" value={propertyForm.bedrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bedrooms: e.target.value })} placeholder="e.g., 3" />
                    </div>
                    <div className="form-group">
                      <label>Bathrooms</label>
                      <input type="number" value={propertyForm.bathrooms} onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })} placeholder="e.g., 2" />
                    </div>
                    <div className="form-group">
                      <label>Area (m²) *</label>
                      <input type="number" value={propertyForm.area} onChange={(e) => setPropertyForm({ ...propertyForm, area: e.target.value })} required placeholder="e.g., 250" />
                    </div>
                  </div>

                  <h3 style={{ marginTop: '20px', marginBottom: '15px' }}>🤖 AI Price Prediction Factors</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Distance to Center (km)</label>
                      <input type="number" step="0.1" value={propertyForm.distance_to_center_km} onChange={(e) => setPropertyForm({ ...propertyForm, distance_to_center_km: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Property Condition</label>
                      <select value={propertyForm.condition} onChange={(e) => setPropertyForm({ ...propertyForm, condition: e.target.value })}>
                        <option value="New">New</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Security Rating (1-5)</label>
                      <input type="number" min="1" max="5" value={propertyForm.security_rating} onChange={(e) => setPropertyForm({ ...propertyForm, security_rating: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', gap: '20px', alignItems: 'center', paddingTop: '25px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={propertyForm.near_school} onChange={(e) => setPropertyForm({ ...propertyForm, near_school: e.target.checked })} />
                        Near School
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={propertyForm.near_hospital} onChange={(e) => setPropertyForm({ ...propertyForm, near_hospital: e.target.checked })} />
                        Near Hospital
                      </label>
                    </div>
                    <div className="form-group" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={propertyForm.near_market} onChange={(e) => setPropertyForm({ ...propertyForm, near_market: e.target.checked })} />
                        Near Market
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={propertyForm.parking} onChange={(e) => setPropertyForm({ ...propertyForm, parking: e.target.checked })} />
                        Has Parking
                      </label>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea value={propertyForm.description} onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })} rows="4" placeholder="Enter property description..." />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={handleCancelAdd}>Cancel</button>
                  <button type="submit" className="btn-primary">Next: Upload Images →</button>
                </div>
              </form>
            )}

            {/* STEP 2: Image Upload */}
            {addStep === 'images' && newPropertyId && (
              <>
                <div className="modal-body">
                  <ImageUploader propertyId={newPropertyId} uploadedBy={user.id} onUploadComplete={handleImageUploadComplete} />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={handleImageUploadComplete}>Skip Images →</button>
                  <button className="btn-primary" onClick={handleImageUploadComplete}>Next: Upload Documents →</button>
                </div>
              </>
            )}

            {/* STEP 3: Document Upload */}
            {addStep === 'documents' && newPropertyId && (
              <>
                <div className="modal-body">
                  <DocumentUploader propertyId={newPropertyId} uploadedBy={user.id} onUploadComplete={handleDocUploadComplete} />
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={handleDocUploadComplete}>Skip Documents →</button>
                  <button className="btn-primary" onClick={handleDocUploadComplete}>Next: Preview & Submit →</button>
                </div>
              </>
            )}

            {/* STEP 4: Preview & Submit */}
            {addStep === 'preview' && newPropertyId && (
              <>
                <div className="modal-body">
                  <div className="preview-grid">
                    {/* Images Preview */}
                    <div className="preview-section full-width">
                      <h3>📷 Property Images ({previewImages.length})</h3>
                      {previewImages.length > 0 ? (
                        <div className="preview-images">
                          {previewImages.map(img => (
                            <div key={img.id} className="preview-image-card">
                              <img
                                src={img.image_url}
                                alt="Property"
                                onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.alt = 'Image failed to load'; }}
                              />
                              {img.image_type === 'main' && <span className="main-image-tag">⭐ Main Image</span>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="no-data">No images uploaded</p>
                      )}
                    </div>

                    {/* Property Details from DB */}
                    <div className="preview-section">
                      <h3>ℹ️ Property Details</h3>
                      <div className="preview-details">
                        <p><strong>Title:</strong> {previewProperty?.title || propertyForm.title}</p>
                        <p><strong>Type:</strong> {previewProperty?.type || propertyForm.type}</p>
                        <p><strong>Listing:</strong> {previewProperty?.listing_type || propertyForm.listing_type}</p>
                        <p><strong>Price:</strong> {((previewProperty?.price || propertyForm.price) / 1000000).toFixed(2)}M ETB</p>
                        <p><strong>Location:</strong> {previewProperty?.location || propertyForm.location}</p>
                        <p><strong>Bedrooms:</strong> {previewProperty?.bedrooms || propertyForm.bedrooms || 'N/A'}</p>
                        <p><strong>Bathrooms:</strong> {previewProperty?.bathrooms || propertyForm.bathrooms || 'N/A'}</p>
                        <p><strong>Area:</strong> {previewProperty?.area || propertyForm.area || 'N/A'} m²</p>
                      </div>
                      {(previewProperty?.description || propertyForm.description) && (
                        <div className="preview-description">
                          <strong>Description:</strong>
                          <p>{previewProperty?.description || propertyForm.description}</p>
                        </div>
                      )}

                      {/* AI Price Comparison Preview */}
                      <div style={{ marginTop: '20px' }}>
                        <AIPriceComparison 
                          property={{
                            ...previewProperty,
                            propertyType: previewProperty?.type || propertyForm.type,
                            size: previewProperty?.area || propertyForm.area,
                            location: previewProperty?.location || propertyForm.location,
                            price: previewProperty?.price || propertyForm.price
                          }} 
                        />
                      </div>
                    </div>

                    {/* Submission Status */}
                    <div className="preview-section">
                      <h3>📋 Submission Status</h3>
                      <div className="preview-status">
                        <div className="status-item success">✅ Property details saved to database</div>
                        <div className={`status-item ${previewImages.length > 0 ? 'success' : 'warning'}`}>
                          {previewImages.length > 0 ? `✅ ${previewImages.length} image(s) uploaded` : '⚠️ No images uploaded'}
                        </div>
                        <div className={`status-item ${previewDocs.length > 0 ? 'success' : 'warning'}`}>
                          {previewDocs.length > 0 ? `✅ ${previewDocs.length} document(s) uploaded` : '⚠️ No documents uploaded'}
                        </div>
                        <div className="status-item pending">⏳ Pending admin approval</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setAddStep('images')}>
                    ← Back to Add Images
                  </button>
                  <button className="btn-primary btn-large" onClick={handleFinalSubmit}>
                    🎉 Submit Property for Approval
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
      {/* Announcement Creation Modal */}
      {showAddAnnouncement && (
        <div className="modal-overlay" onClick={() => setShowAddAnnouncement(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📢 Post New Announcement</h2>
              <button className="close-btn" onClick={() => setShowAddAnnouncement(false)}>✕</button>
            </div>
            <form onSubmit={handleAddAnnouncement}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                    required
                    placeholder="e.g., Important update on Kezira Villa"
                  />
                </div>
                <div className="form-group">
                  <label>Content *</label>
                  <textarea
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                    rows="6"
                    required
                    placeholder="Enter the details of your announcement..."
                  />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={announcementForm.priority}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Target Audience</label>
                    <select
                      value={announcementForm.target_role}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, target_role: e.target.value })}
                    >
                      <option value="all">Everyone</option>
                      <option value="user">Customers Only</option>
                      <option value="broker">Brokers Only</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddAnnouncement(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Post Announcement</button>
              </div>
            </form>
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


export default OwnerDashboardEnhanced;
