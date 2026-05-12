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
  const [agreementRequests, setAgreementRequests] = useState([]);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
  const [showAgreementFlowModal, setShowAgreementFlowModal] = useState(false);
  const [agreementFlowPropertyId, setAgreementFlowPropertyId] = useState(null);
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  
  const [showBrokerBookingModal, setShowBrokerBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    buyer_name: '', phone: '', email: '', profile_photo: '', 
    country_code: '+251', id_type: 'National ID', id_number: '',
    document_status: 'Yes', preferred_visit_time: '', notes: ''
  });
  const [bookingErrors, setBookingErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [propertyPredictions, setPropertyPredictions] = useState({}); // { propertyId: predictionData }
  const [loadingAiModal, setLoadingAiModal] = useState(false);

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
      const response = await axios.get(`http://${window.location.hostname}:5000/api/properties/active?t=` + Date.now());
      const activeProperties = response.data.filter(property => property.status === 'active');
      setProperties(activeProperties);
      
      // Audit properties for AI prices in background (sequentially)
      runAuditsSequentially(activeProperties);
    } catch (error) {
      console.error('Error fetching approved properties:', error);
      setProperties([]);
    }
  };

  const runAuditsSequentially = async (props) => {
    for (const prop of props) {
      await fetchAuditForProperty(prop);
    }
  };

  const fetchAuditForProperty = async (property) => {
    try {
      const locationName = property.location ? property.location.split(',')[0].trim() : 'Dire Dawa';
      const response = await axios.post(`http://${window.location.hostname}:5000/api/ai/predict-property`, {
        latitude: property.latitude,
        longitude: property.longitude,
        location_name: locationName,
        bedrooms: property.bedrooms || 2,
        bathrooms: property.bathrooms || 1,
        property_type: property.type || 'apartment',
        condition: property.condition || 'good',
        size_m2: property.area || 120,
        listing_type: property.listing_type || 'sale',
        near_school: property.near_school ? 1 : 0,
        near_hospital: property.near_hospital ? 1 : 0,
        near_market: property.near_market ? 1 : 0,
        parking: property.parking ? 1 : 0,
        security_rating: property.security_rating || 3
      });
      setPropertyPredictions(prev => ({ ...prev, [property.id]: response.data }));
      return response.data;
    } catch (err) {
      console.error(`Error auditing property ${property.id}:`, err);
    }
  };

  const fetchRequests = async () => {
    try {
      const roleType = user.role === 'broker' ? 'broker' : 'customer';
      const agreementRes = await axios.get(`http://${window.location.hostname}:5000/api/agreement-requests/${roleType}/${user.id}`);
      setAgreementRequests(agreementRes.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`http://${window.location.hostname}:5000/api/broker-engagement/broker/${user.id}/customers`);
      setClients(res.data.customers || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const hasAgreement = (propertyId) => {
    return agreementRequests.some(req => req.property_id === propertyId && ['pending', 'active'].includes(req.status));
  };

  const requestAgreement = async (propertyId) => {
    setAgreementFlowPropertyId(propertyId);
    setShowAgreementFlowModal(true);
  };

  const requestDirectAgreement = async (propertyId) => {
    setAgreementFlowPropertyId(propertyId);
    setShowAgreementFlowModal(true);
  };

  const validateBookingField = (name, value) => {
    let error = '';
    if (name === 'buyer_name') {
      if (!value) error = 'Full name is required';
      else if (!/^[a-zA-Z\s]+$/.test(value)) error = 'Letters and spaces only';
    } else if (name === 'email') {
      if (!value) error = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email format';
    } else if (name === 'phone') {
      if (!value) error = 'Phone number is required';
      else if (!/^\d+$/.test(value)) error = 'Numbers only';
      else {
        const length = bookingFormData.country_code === '+251' ? 9 : 10;
        if (value.length !== length) error = `Must be ${length} digits`;
      }
    } else if (name === 'id_number') {
      if (!value) error = 'ID number is required';
    } else if (name === 'preferred_visit_time') {
      if (!value) error = 'Visit time is required';
    } else if (name === 'profile_photo') {
      if (!value && user?.role === 'broker') error = 'Profile photo is required for new customers';
    }
    setBookingErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleBrokerBookingSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const errors = {};
    const fieldsToValidate = ['buyer_name', 'email', 'phone', 'id_number', 'preferred_visit_time'];
    if (user?.role === 'broker') fieldsToValidate.push('profile_photo');
    
    fieldsToValidate.forEach(field => {
      const err = validateBookingField(field, bookingFormData[field]);
      if (err) errors[field] = err;
    });

    if (Object.values(errors).some(e => e)) {
      setBookingErrors(errors);
      return;
    }

    try {
      setActionLoading(true);
      await axios.post(`http://${window.location.hostname}:5000/api/broker-bookings`, {
        property_id: selectedProperty.id,
        broker_id: user.role === 'broker' ? user.id : null,
        customer_id: user.role === 'user' ? user.id : (selectedClientId || null),
        ...bookingFormData
      });
      alert('Property successfully reserved for 30 minutes!');
      setShowBrokerBookingModal(false);
      setBookingFormData({
        buyer_name: '', phone: '', email: '', profile_photo: '', 
        country_code: '+251', id_type: 'National ID', id_number: '',
        document_status: 'Yes', preferred_visit_time: '', notes: ''
      });
      setBookingErrors({});
      fetchApprovedProperties();
    } catch (error) {
      console.error('Error booking property:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to book property');
    } finally {
      setActionLoading(false);
    }
  };


  const openDocumentViewer = (propertyId) => {
    setDocumentPropertyId(propertyId);
    setShowDocumentViewer(true);
  };

  const openImageViewer = async (property) => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:5000/api/property-images/${property.id}`);
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
          onClick={() => {
            setSelectedProperty(property);
            setShowViewModal(true);
          }}
          onDoubleClick={() => openImageViewer(property)}
          style={{ cursor: 'pointer' }}
          title="Click to view details, double-click to view full image"
          onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))}
        />
      );
    }
    return (
      <div 
        className="no-image-placeholder"
        onClick={() => {
          setSelectedProperty(property);
          setShowViewModal(true);
        }}
        style={{ cursor: 'pointer' }}
        title="Click to view details"
      >
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

              {/* AI Comparison Row (Public View) */}
              <div style={{ 
                margin: '12px -15px', 
                padding: '10px 15px', 
                background: '#f8fafc', 
                borderTop: '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '5px'
              }}>
                <div>
                  <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}>LISTED</div>
                  <div style={{ fontSize: '10px', fontWeight: '700' }}>{(property.price / 1000).toLocaleString()}K</div>
                </div>
                <div>
                  <div style={{ fontSize: '8px', color: '#64748b', fontWeight: 'bold' }}>ML BASE</div>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569' }}>
                    {propertyPredictions[property.id] ? 
                      `${(Number(propertyPredictions[property.id].ml_base_price_per_sqm) * (Number(property.area) || 1) / 1000).toFixed(0)}K` : '⏳'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '8px', color: '#7c3aed', fontWeight: 'bold' }}>HYBRID AI</div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#7c3aed' }}>
                    {propertyPredictions[property.id] ? 
                      `${(propertyPredictions[property.id].predicted_price / 1000).toFixed(0)}K` : '⏳'}
                  </div>
                </div>
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

                  {/* AI Price Breakdown for Users */}
                  <div style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: '#f1f5f9', 
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      🤖 AI Market Valuation Analysis
                    </h4>
                    
                    {propertyPredictions[selectedProperty.id] ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Listed Price</div>
                            <div style={{ fontSize: '18px', fontWeight: '800' }}>{(selectedProperty.price / 1000000).toFixed(2)}M</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#7c3aed', textTransform: 'uppercase' }}>Hybrid Market Value</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#7c3aed' }}>
                              {(propertyPredictions[selectedProperty.id].predicted_price / 1000000).toFixed(2)}M ETB
                            </div>
                          </div>
                        </div>

                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(2, 1fr)', 
                          gap: '10px', 
                          background: 'white', 
                          padding: '15px', 
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1'
                        }}>
                          <div style={{ fontSize: '11px' }}>
                            <div style={{ color: '#64748b' }}>ML Base/m²</div>
                            <div style={{ fontWeight: '700' }}>{Number(propertyPredictions[selectedProperty.id].ml_base_price_per_sqm || 0).toLocaleString()} ETB</div>
                          </div>
                          <div style={{ fontSize: '11px' }}>
                            <div style={{ color: '#64748b' }}>GIS Adj./m²</div>
                            <div style={{ fontWeight: '700' }}>{Number(propertyPredictions[selectedProperty.id].gis_price_per_sqm || 0).toLocaleString()} ETB</div>
                          </div>
                          <div style={{ fontSize: '11px' }}>
                            <div style={{ color: '#64748b' }}>Amenity Multiplier</div>
                            <div style={{ fontWeight: '700', color: '#059669' }}>× {propertyPredictions[selectedProperty.id].amenity_multiplier || '1.0'}</div>
                          </div>
                          <div style={{ fontSize: '11px' }}>
                            <div style={{ color: '#64748b' }}>Confidence</div>
                            <div style={{ fontWeight: '700', color: '#3b82f6' }}>{propertyPredictions[selectedProperty.id].confidence}%</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                        ⏳ Fetching AI Market Data...
                      </div>
                    )}
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
                    {(!hasAgreement(selectedProperty.id) && user?.role === 'user') && (
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

      {showBrokerBookingModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowBrokerBookingModal(false)} style={{ zIndex: 1300 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', padding: '30px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#1e293b', fontWeight: '800' }}>
                ⏱️ {user?.role === 'broker' ? 'Book for Buyer' : 'Book Property'} (30 Min Hold)
              </h2>
              <button onClick={() => setShowBrokerBookingModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <form onSubmit={handleBrokerBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '15px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: '12px', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>Property Details</div>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>{selectedProperty.title}</strong> <br/>
                <div style={{ marginTop: '4px', color: '#475569' }}>
                  {getPropertyTypeIcon(selectedProperty.type)} {selectedProperty.type} | 🛏️ {selectedProperty.bedrooms} | 🚿 {selectedProperty.bathrooms}
                </div>
              </div>

              {/* Profile Photo (Only for Broker booking for new customer) */}
              {user?.role === 'broker' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>
                    Profile Photo <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '80px', height: '80px', borderRadius: '12px', background: '#f1f5f9', 
                      border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', 
                      justifyContent: 'center', overflow: 'hidden', flexShrink: 0 
                    }}>
                      {bookingFormData.profile_photo ? (
                        <img src={bookingFormData.profile_photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '24px', color: '#94a3b8' }}>👤</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setBookingFormData({ ...bookingFormData, profile_photo: reader.result });
                              validateBookingField('profile_photo', reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ fontSize: '13px' }}
                      />
                      <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>PNG, JPG up to 2MB. This will be the buyer's profile photo.</p>
                    </div>
                  </div>
                  {bookingErrors.profile_photo && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', animation: 'fadeIn 0.3s' }}>{bookingErrors.profile_photo}</div>}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    className={bookingErrors.buyer_name ? 'input-error' : ''}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', transition: 'all 0.2s' }}
                    value={bookingFormData.buyer_name} 
                    onChange={e => {
                      setBookingFormData({...bookingFormData, buyer_name: e.target.value});
                      validateBookingField('buyer_name', e.target.value);
                    }} 
                    placeholder="Enter full name"
                  />
                  {bookingErrors.buyer_name && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{bookingErrors.buyer_name}</div>}
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="email" 
                    className={bookingErrors.email ? 'input-error' : ''}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    value={bookingFormData.email} 
                    onChange={e => {
                      setBookingFormData({...bookingFormData, email: e.target.value});
                      validateBookingField('email', e.target.value);
                    }} 
                    placeholder="google@email.com"
                  />
                  {bookingErrors.email && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{bookingErrors.email}</div>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ display: 'flex', gap: '0', borderRadius: '10px', overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
                  <select 
                    style={{ padding: '12px', background: '#f8fafc', border: 'none', borderRight: '1.5px solid #e2e8f0', outline: 'none', fontWeight: '600' }}
                    value={bookingFormData.country_code}
                    onChange={e => setBookingFormData({...bookingFormData, country_code: e.target.value})}
                  >
                    <option value="+251">🇪🇹 +251</option>
                    <option value="+254">🇰🇪 +254</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input 
                    type="tel" 
                    style={{ flex: 1, padding: '12px', border: 'none', outline: 'none' }}
                    value={bookingFormData.phone} 
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setBookingFormData({...bookingFormData, phone: val});
                      validateBookingField('phone', val);
                    }} 
                    placeholder="912345678"
                  />
                </div>
                {bookingErrors.phone && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{bookingErrors.phone}</div>}
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>ID Type <span style={{ color: '#ef4444' }}>*</span></label>
                  <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    value={bookingFormData.id_type} onChange={e => setBookingFormData({...bookingFormData, id_type: e.target.value})}>
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>ID Number <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    value={bookingFormData.id_number} 
                    onChange={e => {
                      setBookingFormData({...bookingFormData, id_number: e.target.value});
                      validateBookingField('id_number', e.target.value);
                    }} 
                    placeholder="ID number"
                  />
                  {bookingErrors.id_number && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{bookingErrors.id_number}</div>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>Preferred Visit Time <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="datetime-local" 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                  value={bookingFormData.preferred_visit_time} 
                  onChange={e => {
                    setBookingFormData({...bookingFormData, preferred_visit_time: e.target.value});
                    validateBookingField('preferred_visit_time', e.target.value);
                  }} 
                />
                {bookingErrors.preferred_visit_time && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{bookingErrors.preferred_visit_time}</div>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '14px', color: '#334155' }}>Notes (Optional)</label>
                <textarea rows="2" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none', resize: 'none' }}
                  value={bookingFormData.notes} onChange={e => setBookingFormData({...bookingFormData, notes: e.target.value})} placeholder="Any special requests..."></textarea>
              </div>

              <button 
                type="submit" 
                disabled={actionLoading}
                style={{ 
                  width: '100%', padding: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                  color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', 
                  fontSize: '16px', cursor: 'pointer', marginTop: '5px', transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                {actionLoading ? '⏳ Processing...' : `Confirm Booking (Locks for 30 Mins)`}
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
