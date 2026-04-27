import React, { useState, useEffect } from 'react';
import './BrowseProperties.css';
import axios from 'axios';
import PageHeader from './PageHeader';
import DocumentViewer from './shared/DocumentViewer';
import PropertyImageViewer from './shared/PropertyImageViewer';

const BrowseProperties = ({ user, onLogout, onSettingsClick, onBack }) => {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentPropertyId, setDocumentPropertyId] = useState(null);
  const [keyRequests, setKeyRequests] = useState([]);
  const [agreementRequests, setAgreementRequests] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [showAgreementFlowModal, setShowAgreementFlowModal] = useState(false);
  const [agreementFlowPropertyId, setAgreementFlowPropertyId] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const [showBrokerBookingModal, setShowBrokerBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    buyer_name: '', phone: '', id_type: 'National ID', id_number: '',
    document_status: 'Yes', preferred_visit_time: '', notes: ''
  });
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchApprovedProperties();
    if (user?.role === 'user' || user?.role === 'broker') {
      fetchRequests();
    }
    if (user?.role === 'broker') {
      fetchClients();
    }
  }, [user?.id, user?.role]);

  const fetchApprovedProperties = async () => {
    try {
      // Add timestamp to bypass any caching
      const response = await axios.get('http://localhost:5000/api/properties/active?t=' + Date.now());
      // Backend already filters for active status, but ensure only active properties are displayed
      const activeProperties = response.data.filter(property => 
        property.status === 'active'
      );
      console.log('Fetched properties:', response.data.length, 'Active properties:', activeProperties.length);
      setProperties(activeProperties);
    } catch (error) {
      console.error('Error fetching approved properties:', error);
      setProperties([]);
    }
  };

  const fetchRequests = async () => {
    try {
      const roleType = user.role === 'broker' ? 'broker' : 'customer';
      const [keyRes, agreementRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/key-requests/${roleType}/${user.id}`),
        axios.get(`http://localhost:5000/api/agreement-requests/${roleType}/${user.id}`)
      ]);
      setKeyRequests(keyRes.data);
      setAgreementRequests(agreementRes.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/broker-engagement/broker/${user.id}/customers`);
      setClients(res.data.customers || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const hasKey = (propertyId) => {
    return keyRequests.find(req => req.property_id === propertyId && req.status === 'accepted');
  };

  const hasPendingKey = (propertyId) => {
    return keyRequests.some(req => req.property_id === propertyId && req.status === 'pending');
  };

  const hasAgreement = (propertyId) => {
    return agreementRequests.some(req => req.property_id === propertyId && ['pending', 'active'].includes(req.status));
  };

  const requestKey = async (propertyId) => {
    try {
      const payload = {
        property_id: propertyId,
        request_message: 'Requesting access key to view property documents and agreement.'
      };
      
      if (user.role === 'broker') {
        payload.broker_id = user.id;
      } else {
        payload.customer_id = user.id;
      }

      await axios.post('http://localhost:5000/api/key-requests', payload);
      alert('🔑 Key request sent successfully!');
      fetchRequests();
    } catch (error) {
      console.error('Error requesting key:', error);
      alert(error.response?.data?.message || 'Failed to send key request');
    }
  };

  const requestAgreement = async (propertyId) => {
    setAgreementFlowPropertyId(propertyId);
    setShowAgreementFlowModal(true);
  };

  const requestDirectAgreement = async (propertyId) => {
    setAgreementFlowPropertyId(propertyId);
    setShowAgreementFlowModal(true);
  };

  const handleBrokerBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/broker-bookings', {
        property_id: selectedProperty.id,
        broker_id: user.role === 'broker' ? user.id : null,
        customer_id: user.role === 'user' ? user.id : (selectedClientId || null),
        ...bookingFormData
      });
      alert('Property successfully reserved for 30 minutes!');
      setShowBrokerBookingModal(false);
      setBookingFormData({
        buyer_name: '', phone: '', id_type: 'National ID', id_number: '',
        document_status: 'Yes', preferred_visit_time: '', notes: ''
      });
      fetchApprovedProperties();
    } catch (error) {
      console.error('Error booking property:', error);
      alert(error.response?.data?.message || 'Failed to book property');
    }
  };


  const openDocumentViewer = (propertyId) => {
    setDocumentPropertyId(propertyId);
    setShowDocumentViewer(true);
  };

  const openImageViewer = async (property) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/property-images/${property.id}`);
      const images = response.data.map(img => img.image_url);
      if (images.length === 0 && property.main_image) {
        images.push(property.main_image);
      }
      setViewerImages(images);
      setShowImageViewer(true);
    } catch (error) {
      console.error('Error fetching property images:', error);
      if (property.main_image) {
        setViewerImages([property.main_image]);
        setShowImageViewer(true);
      }
    }
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesListing = listingTypeFilter === 'all' || property.listing_type === listingTypeFilter;
    const matchesType = propertyTypeFilter === 'all' || property.type === propertyTypeFilter;
    return matchesSearch && matchesListing && matchesType;
  });

  const getPropertyTypeIcon = (type) => {
    const icons = {
      house: '🏠',
      apartment: '🏢',
      villa: '🏡',
      shop: '🛍️'
    };
    return icons[type] || '🏠';
  };

  const renderPropertyImage = (property) => {
    if (property.main_image && !imageErrors[property.id]) {
      return (
        <img
          src={property.main_image}
          alt={property.title}
          onDoubleClick={() => openImageViewer(property)}
          style={{ cursor: 'pointer' }}
          title="Double-click to view full image"
          onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))}
        />
      );
    }
    return (
      <div className="no-image-placeholder">
        <span className="placeholder-icon">{getPropertyTypeIcon(property.type)}</span>
      </div>
    );
  };

  return (
    <div className="browse-properties">
      <PageHeader
        title="Browse Properties"
        subtitle={`Discover available properties (${filteredProperties.length} listings)`}
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={onBack ? (
          <button className="btn-secondary" onClick={onBack} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
            ← Back to Dashboard
          </button>
        ) : null}
      />

      <div className="filters-section">
        <div className="filter-group">
          <label>Listing Type:</label>
          <div className="button-group">
            <button
              className={`filter-btn ${listingTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setListingTypeFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${listingTypeFilter === 'sale' ? 'active' : ''}`}
              onClick={() => setListingTypeFilter('sale')}
            >
              🏷️ For Sale
            </button>
            <button
              className={`filter-btn ${listingTypeFilter === 'rent' ? 'active' : ''}`}
              onClick={() => setListingTypeFilter('rent')}
            >
              🔑 For Rent
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Property Type:</label>
          <select
            className="type-filter"
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="apartment">🏢 Apartment</option>
            <option value="villa">🏡 Villa</option>
            <option value="house">🏠 House</option>
            <option value="shop">🛍️ Shop</option>
          </select>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="properties-grid">
        {filteredProperties.map(property => (
          <div key={property.id} className="property-card">
            <div className="property-image">
              {renderPropertyImage(property)}
              <span className="listing-badge">
                {property.listing_type === 'sale' ? '🏷️ For Sale' : '🔑 For Rent'}
              </span>
            </div>
            <div className="property-content">
              <h3>{property.title}</h3>
              <p className="property-location">📍 {property.location}</p>
              <div className="property-details">
                <span>{getPropertyTypeIcon(property.type)} {property.type}</span>
                {property.bedrooms > 0 && <span>🛏️ {property.bedrooms} Beds</span>}
                {property.bathrooms > 0 && <span>🚿 {property.bathrooms} Baths</span>}
                {property.area && <span>📐 {property.area} m²</span>}
              </div>
              <div className="property-price">
                {(property.price / 1000000).toFixed(2)}M ETB
              </div>

              {/* Display Added Person Name */}
              <div className="property-owner">
                <span>👤 {property.owner_name ? `Owner: ${property.owner_name}` : property.broker_name ? `Broker: ${property.broker_name}` : 'Listed by Admin'}</span>
              </div>

              <div className="property-actions">
                <button
                  className="btn-action view"
                  title="View Details"
                  onClick={() => {
                    setSelectedProperty(property);
                    setShowViewModal(true);
                  }}
                >
                  👁️ View
                </button>
                {user?.role === 'broker' && (
                  <button
                    className="btn-action broker-book"
                    style={{ padding: '8px', border: 'none', borderRadius: '6px', background: '#f59e0b', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    title="Book for Buyer (30 Min Hold)"
                    onClick={() => {
                      setSelectedProperty(property);
                      setShowBrokerBookingModal(true);
                    }}
                  >
                    ⏱️ Book for Buyer
                  </button>
                )}
                {user?.role === 'broker' && (
                  <button
                    className="btn-action document"
                    title="View Documents"
                    onClick={() => openDocumentViewer(property.id)}
                  >
                    📄 Document
                  </button>
                )}
                {user?.role === 'user' && (
                   <button
                    className="btn-action broker-book"
                    style={{ padding: '8px', border: 'none', borderRadius: '6px', background: '#f59e0b', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                    title="Book Property (30 Min Hold)"
                    onClick={() => {
                      setSelectedProperty(property);
                      setBookingFormData({
                        ...bookingFormData,
                        buyer_name: user.name,
                        phone: user.phone || ''
                      });
                      setShowBrokerBookingModal(true);
                    }}
                  >
                    ⏱️ Book
                  </button>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="no-results">
          <p>🔍 No properties found matching your search</p>
        </div>
      )}

      {/* View Property Modal - Professional Layout */}
      {showViewModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content property-view-modal" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button className="modal-close-btn" onClick={() => setShowViewModal(false)}>✕</button>

            {/* Property Image - Full Width at Top */}
            <div className="property-image-full">
              {selectedProperty.main_image ? (
                <img 
                  src={selectedProperty.main_image} 
                  alt={selectedProperty.title}
                  className="property-main-image"
                  onDoubleClick={() => {
                    openImageViewer(selectedProperty);
                    setShowViewModal(false);
                  }}
                  style={{ cursor: 'pointer' }}
                  title="Double-click to view full image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="property-image-placeholder">
                  <span className="placeholder-icon">{getPropertyTypeIcon(selectedProperty.type)}</span>
                </div>
              )}

            </div>

            {/* Content Area - Two Columns */}
            <div className="property-view-content">
              {/* Left Column - Property Details */}
              <div className="property-details-column">
                <div className="detail-card">
                  <h3>ℹ️ Property Details</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <label>Type:</label>
                      <span>{selectedProperty.type}</span>
                    </div>
                    <div className="detail-item">
                      <label>Listing:</label>
                      <span>{selectedProperty.listing_type === 'sale' ? 'sale' : 'rent'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Price:</label>
                      <span>{(selectedProperty.price / 1000000).toFixed(2)} ETB</span>
                    </div>
                    <div className="detail-item">
                      <label>Location:</label>
                      <span>{selectedProperty.location}</span>
                    </div>
                    <div className="detail-item">
                      <label>Bedrooms:</label>
                      <span>{selectedProperty.bedrooms || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Bathrooms:</label>
                      <span>{selectedProperty.bathrooms || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Area:</label>
                      <span>{selectedProperty.area || 'N/A'} m²</span>
                    </div>
                    <div className="detail-item">
                      <label>Status:</label>
                      <span className="status-badge active">ACTIVE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Documents & Actions */}
              <div className="documents-actions-column">
                {/* Documents Section - Only for Brokers in this view */}
                {user?.role === 'broker' && (
                  <div className="documents-card">
                    <h3>📄 Property Documents</h3>
                    <div className="documents-header">
                      <span>Property Documents</span>
                      {!hasKey(selectedProperty.id) && !hasPendingKey(selectedProperty.id) && (
                        <button 
                          className="btn-request-access"
                          onClick={() => requestKey(selectedProperty.id)}
                        >
                          🔐 Request Access
                        </button>
                      )}
                    </div>
                    {/* ... (keep rest of broker doc logic if needed, or just hide entirely) */}
                  </div>
                )}

                {/* Action Buttons */}
                {['user', 'broker'].includes(user?.role) && (
                  <div className="action-buttons-card">
                    {/* Favorites Button */}
                    <button className="btn-remove-favorites">
                      ❌ Remove from Favorites
                    </button>

                    {/* Agreement Request Buttons */}
                    {hasKey(selectedProperty.id) && !hasAgreement(selectedProperty.id) && (
                      <button
                        className="btn-agreement-request"
                        onClick={() => requestAgreement(selectedProperty.id)}
                      >
                        🤝 Request Agreement
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer */}
      {showDocumentViewer && documentPropertyId && (
        <div className="modal-overlay" onClick={() => setShowDocumentViewer(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Property Documents</h2>
              <button className="close-btn" onClick={() => setShowDocumentViewer(false)}>✕</button>
            </div>
            <div className="modal-body">
              <DocumentViewer propertyId={documentPropertyId} canDelete={false} />
            </div>
          </div>
        </div>
      )}

      {/* Property Image Viewer */}
      {showImageViewer && viewerImages.length > 0 && (
        <PropertyImageViewer
          images={viewerImages}
          propertyTitle={selectedProperty?.title || 'Property'}
          onClose={() => setShowImageViewer(false)}
        />
      )}
      {/* Agreement Flow Selection Modal */}
      {showAgreementFlowModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAgreementFlowModal(false)}
          style={{ zIndex: 1200 }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', borderRadius: '20px', padding: '0', overflow: 'hidden' }}
          >
            <div style={{ padding: '28px 30px', background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>🤝 Choose Agreement Flow</h2>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Select how you'd like to proceed with the agreement</p>
            </div>
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button
                onClick={() => {
                  setShowAgreementFlowModal(false);
                  setShowViewModal(false);
                  if (typeof setCurrentPage !== 'undefined' && setCurrentPage) {
                    setCurrentPage('agreement-workflow', { propertyId: agreementFlowPropertyId });
                  } else {
                    alert('Navigate to Agreement Workflow in the Dashboard navigation.');
                  }
                }}
                style={{
                  padding: '20px 24px', borderRadius: '14px', border: '2px solid #e2e8f0',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(16,185,129,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>⚡</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#064e3b', marginBottom: '4px' }}>Direct Agreement</div>
                  <div style={{ fontSize: '13px', color: '#047857' }}>Proceed directly with the property owner through the Agreement Workflow</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowAgreementFlowModal(false);
                  setShowViewModal(false);
                  if (typeof setCurrentPage !== 'undefined' && setCurrentPage) {
                    setCurrentPage('broker-engagement', { propertyId: agreementFlowPropertyId });
                  } else {
                    alert('Navigate to Broker Engagement in the Dashboard navigation.');
                  }
                }}
                style={{
                  padding: '20px 24px', borderRadius: '14px', border: '2px solid #e2e8f0',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(59,130,246,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>🏢</div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#1e3a5f', marginBottom: '4px' }}>Through Broker</div>
                  <div style={{ fontSize: '13px', color: '#1d4ed8' }}>Engage a broker to handle the agreement process via Broker Engagement</div>
                </div>
              </button>

              <button
                onClick={() => setShowAgreementFlowModal(false)}
                style={{ padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#f8fafc', cursor: 'pointer', fontWeight: '600', color: '#64748b', fontSize: '14px', marginTop: '4px' }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broker Booking Modal */}
      {showBrokerBookingModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowBrokerBookingModal(false)} style={{ zIndex: 1300 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>⏱️ Book for Buyer (30 Min Hold)</h2>
              <button onClick={() => setShowBrokerBookingModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleBrokerBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '14px' }}>
                <strong>Property:</strong> {selectedProperty.title} <br/>
                <strong>Type:</strong> {selectedProperty.type} | <strong>Beds:</strong> {selectedProperty.bedrooms} | <strong>Baths:</strong> {selectedProperty.bathrooms}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Buyer Full Name</label>
                <input 
                  type="text" 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={bookingFormData.buyer_name} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                      setBookingFormData({...bookingFormData, buyer_name: val});
                    }
                  }} 
                  placeholder="Enter buyer's full name (letters only)"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Phone Number</label>
                <input type="tel" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={bookingFormData.phone} onChange={e => setBookingFormData({...bookingFormData, phone: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>ID Type</label>
                  <select style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={bookingFormData.id_type} onChange={e => setBookingFormData({...bookingFormData, id_type: e.target.value})}>
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>ID Number</label>
                  <input type="text" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={bookingFormData.id_number} onChange={e => setBookingFormData({...bookingFormData, id_number: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Preferred Visit Time</label>
                <input type="datetime-local" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={bookingFormData.preferred_visit_time} onChange={e => setBookingFormData({...bookingFormData, preferred_visit_time: e.target.value})} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Notes (Optional)</label>
                <textarea rows="2" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={bookingFormData.notes} onChange={e => setBookingFormData({...bookingFormData, notes: e.target.value})}></textarea>
              </div>

              <div style={{ padding: '15px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px', color: '#1e40af' }}>Property has legal documents?</label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input type="radio" name="document_status" value="Yes" checked={bookingFormData.document_status === 'Yes'} onChange={e => setBookingFormData({...bookingFormData, document_status: e.target.value})} />
                    Yes — Available
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input type="radio" name="document_status" value="No" checked={bookingFormData.document_status === 'No'} onChange={e => setBookingFormData({...bookingFormData, document_status: e.target.value})} />
                    No — Not uploaded
                  </label>
                </div>
                {bookingFormData.document_status === 'No' && (
                  <p style={{ margin: '10px 0 0 0', color: '#ef4444', fontSize: '13px', fontWeight: 'bold' }}>
                    ⚠️ Buyer must upload documents before agreement
                  </p>
                )}
              </div>

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
                Confirm Booking (Locks for 30 Mins)
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Broker Booking Modal */}
      {showBrokerBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>⏱️ {user?.role === 'broker' ? 'Book for Buyer' : 'Book Property'}</h3>
              <button className="close-btn" onClick={() => setShowBrokerBookingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleBrokerBookingSubmit} style={{ padding: '20px' }}>
              {user?.role === 'broker' && clients.length > 0 && (
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label>Select Your Client (Optional)</label>
                  <select 
                    value={selectedClientId} 
                    onChange={(e) => {
                      const clientId = e.target.value;
                      setSelectedClientId(clientId);
                      if (clientId) {
                        const client = clients.find(c => String(c.id) === String(clientId));
                        if (client) {
                          setBookingFormData({
                            ...bookingFormData,
                            buyer_name: client.name,
                            phone: client.phone || ''
                          });
                        }
                      }
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Buyer Name</label>
                <input 
                  type="text" 
                  value={bookingFormData.buyer_name} 
                  onChange={(e) => setBookingFormData({...bookingFormData, buyer_name: e.target.value})} 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Phone Number</label>
                <input 
                  type="text" 
                  value={bookingFormData.phone} 
                  onChange={(e) => setBookingFormData({...bookingFormData, phone: e.target.value})} 
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Preferred Visit Time</label>
                <input 
                  type="datetime-local" 
                  value={bookingFormData.preferred_visit_time} 
                  onChange={(e) => setBookingFormData({...bookingFormData, preferred_visit_time: e.target.value})} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>Notes</label>
                <textarea 
                  value={bookingFormData.notes} 
                  onChange={(e) => setBookingFormData({...bookingFormData, notes: e.target.value})} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', minHeight: '80px' }}
                />
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>Confirm Booking</button>
                <button type="button" className="btn-secondary" onClick={() => setShowBrokerBookingModal(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseProperties;
