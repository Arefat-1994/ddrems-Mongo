import React, { useState, useEffect } from "react"; // Re-compilation trigger
import "./Properties.css";
import axios from "axios";
import PageHeader from "./PageHeader";
import ImageGallery from "./shared/ImageGallery";

import DocumentViewer from "./shared/DocumentViewer";
import DocumentViewerAdmin from "./shared/DocumentViewerAdmin";
//  // Unused
import PropertyMap from "./shared/PropertyMap";
import PropertyUploaderModal from './shared/PropertyUploaderModal';

const Properties = ({ user, onLogout, viewMode = "all", setCurrentPage, setViewMapPropertyId, onSettingsClick }) => {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [propertyDetail, setPropertyDetail] = useState(null);
  const [agreementRequests, setAgreementRequests] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [documentProperty, setDocumentProperty] = useState(null);

  const [imageErrors, setImageErrors] = useState({});

  // Property Creation State
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapProperty, setMapProperty] = useState(null);
  const [showAgreementFlowModal, setShowAgreementFlowModal] = useState(false);
  const [agreementFlowPropertyId, setAgreementFlowPropertyId] = useState(null);
  const [showBrokerBookingModal, setShowBrokerBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    buyer_name: '', phone: '', email: '', profile_photo: '', 
    country_code: '+251', id_type: 'National ID', id_number: '',
    document_status: 'Yes', preferred_visit_time: '', notes: ''
  });
  const [bookingErrors, setBookingErrors] = useState({});

  const [actionLoading, setActionLoading] = useState(false);

  // AI Price Prediction state
  const [aiPrediction, setAiPrediction] = useState(null);
  const [aiPredictionLoading, setAiPredictionLoading] = useState(false);

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      user?.role === "user" ||
      user?.role === "owner" ||
      user?.role === "broker"
    ) {
      fetchUserRequests();
    }
    if (user?.role === "user") {
      fetchFavorites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      const res = await axios.get(
        `${API_BASE}/favorites/${user.id}`,
      );
      setFavorites(res.data);
    } catch (e) {
      console.error("Error fetching favorites:", e);
    }
  };

  const isFavorite = (propertyId) =>
    favorites.some((f) => f.property_id === propertyId);

  const toggleFavorite = async (propertyId) => {
    if (isFavorite(propertyId)) {
      try {
        const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
        await axios.delete(
          `${API_BASE}/favorites/${user.id}/${propertyId}`,
        );
        setFavorites((prev) =>
          prev.filter((f) => f.property_id !== propertyId),
        );
      } catch (e) {
        alert("Failed to remove from favorites");
      }
    } else {
      try {
        const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
        await axios.post(`${API_BASE}/favorites`, {
          user_id: user.id,
          property_id: propertyId,
        });
        setFavorites((prev) => [...prev, { property_id: propertyId }]);
      } catch (e) {
        alert("Failed to add to favorites");
      }
    }
  };

  const fetchUserRequests = async () => {
    try {
      if (user?.role === "user") {
        const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
        const agreementRes = await axios.get(
            `${API_BASE}/agreement-requests/customer/${user.id}`,
        );
        setAgreementRequests(agreementRes.data);
      } else if (user?.role === "owner") {
        const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
        const agreementRes = await axios.get(`${API_BASE}/agreements/owner/${user.id}`);
        setAgreementRequests(agreementRes.data);
      } else if (user?.role === "broker") {
        const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
        const agreementRes = await axios.get(`${API_BASE}/agreements/broker/${user.id}`);
        setAgreementRequests(agreementRes.data);
      }
    } catch (error) {
      console.error("Error fetching user requests:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      let endpoint = `${API_BASE}/properties`;

      if (
        user?.role === "system_admin" ||
        user?.role === "admin" ||
        user?.role === "property_admin"
      ) {
        endpoint = `${API_BASE}/properties`;
      } else if (viewMode === "my" && user?.role === "owner") {
        endpoint = `${API_BASE}/properties/owner/${user.id}`;
      } else if (viewMode === "my" && user?.role === "broker") {
        endpoint = `${API_BASE}/properties/broker/${user.id}`;
      } else if (user?.role === "user" || viewMode === "all") {
        // Customers or anyone browsing the public market should ONLY see active properties!
        endpoint = `${API_BASE}/properties/active`;
      }

      const response = await axios.get(endpoint);
      let fetchedProperties = response.data;

      if (viewMode === "my" && user?.role === "broker") {
        // Filter properties to only show those belonging to the current broker
        fetchedProperties = fetchedProperties.filter(
          (p) => Number(p.broker_id) === Number(user.id),
        );
      }

      setProperties(fetchedProperties);
    } catch (error) {
      console.error("Error fetching properties:", error);
    }
  };

  const viewProperty = async (property) => {
    setSelectedProperty(property);
    setShowViewModal(true);
    setAiPrediction(null);
    try {
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      const response = await axios.get(
        `${API_BASE}/properties/${property.id}`,
      );
      setPropertyDetail(response.data);
    } catch (error) {
      console.error("Error fetching property details:", error);
      setPropertyDetail(property);
    }
    // Fetch AI prediction for this property
    fetchAiPrediction(property);
  };

  const fetchAiPrediction = async (property) => {
    setAiPredictionLoading(true);
    try {
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      const locationName = (property.location || '').split(',')[0].trim();
      const response = await axios.post(`${API_BASE}/ai/predict-property`, {
        latitude: parseFloat(property.latitude) || 9.6009,
        longitude: parseFloat(property.longitude) || 41.8596,
        location_name: locationName || 'Dire Dawa',
        bedrooms: parseInt(property.bedrooms) || 2,
        bathrooms: parseInt(property.bathrooms) || 1,
        property_type: (property.type || 'apartment').toLowerCase(),
        condition: 'good',
        listing_type: (property.listing_type || 'sale').toLowerCase(),
        size_m2: parseInt(property.area) || 120
      });
      if (response.data.success) {
        setAiPrediction(response.data);
      }
    } catch (error) {
      console.error('AI prediction fetch error:', error);
    } finally {
      setAiPredictionLoading(false);
    }
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm("Are you sure you want to delete this property?"))
      return;
    try {
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      await axios.delete(`${API_BASE}/properties/${propertyId}`);
      alert("Property deleted successfully");
      fetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property");
    }
  };



  const hasAgreement = (propertyId) => {
    return agreementRequests.some(
      (req) =>
        req.property_id === propertyId &&
        ["pending", "active"].includes(req.status),
    );
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
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      await axios.post(`${API_BASE}/broker-bookings`, {
        property_id: selectedProperty.id,
        broker_id: user.role === 'broker' ? user.id : null,
        customer_id: user.role === 'user' ? user.id : null,
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
      fetchProperties();
    } catch (error) {
      console.error('Error booking property:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to book property');
    } finally {
      setActionLoading(false);
    }
  };





  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === "all" || property.type === filterType;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status) => {
    const colors = {
      active: "#10b981",
      pending: "#f59e0b",
      sold: "#3b82f6",
      rented: "#8b5cf6",
      inactive: "#6b7280",
      suspended: "#ef4444",
    };
    return colors[status] || "#6b7280";
  };

  const getPropertyTypeIcon = (type) => {
    const icons = {
      house: "🏠",
      apartment: "🏢",
      villa: "🏡",
      shop: "🛍️",
    };
    return icons[type] || "🏠";
  };

  const renderPropertyImage = (property) => {
    if (property.main_image && !imageErrors[property.id]) {
      return (
        <img
          src={property.main_image}
          alt={property.title}
          onClick={() => viewProperty(property)}
          style={{ cursor: 'pointer' }}
          title="Click to view details"
          onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))}
        />
      );
    }
    return (
      <div 
        className="no-image-placeholder"
        onClick={() => viewProperty(property)}
        style={{ cursor: 'pointer' }}
        title="Click to view details"
      >
        <span className="placeholder-icon">
          {getPropertyTypeIcon(property.type)}
        </span>
        <span className="placeholder-text">{property.type}</span>
      </div>
    );
  };



  return (
    <div className="properties">
      <PageHeader
        title="Properties Management"
        subtitle="Manage all real estate listings and property details"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={
          (user?.role === "owner" || (user?.role === "broker" && viewMode === "my")) && (
            <button className="btn-primary" onClick={() => setShowAddProperty(true)}>
              ➕ Add Property
            </button>
          )
        }
      />

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search properties by title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="apartment">Apartment</option>
          <option value="villa">Villa</option>
          <option value="house">House</option>
          <option value="shop">Shop</option>
        </select>
      </div>

      <div className="properties-grid">
        {filteredProperties.map((property, idx) => (
          <div key={`${property.id}-${idx}`} className="property-card">
            <div className="property-image">
              {renderPropertyImage(property)}
              <span
                className="property-status"
                style={{ background: getStatusColor(property.status) }}
              >
                {property.status}
              </span>
              {property.image_count > 0 && (
                <span className="image-count-badge">
                  📷 {property.image_count}
                </span>
              )}
            </div>
            <div className="property-content">
              <h3>{property.title}</h3>
              <p className="property-location">📍 {property.location}</p>
              {property.listing_type && (
                <span className={`listing-type-badge ${property.listing_type}`}>
                  {property.listing_type === "sale"
                    ? "🏷️ For Sale"
                    : "🔑 For Rent"}
                </span>
              )}
              <div className="property-details">
                <span>
                  {getPropertyTypeIcon(property.type)} {property.type}
                </span>
                {property.bedrooms > 0 && (
                  <span>🛏️ {property.bedrooms} Beds</span>
                )}
                {property.bathrooms > 0 && (
                  <span>🚿 {property.bathrooms} Baths</span>
                )}
                {property.area && <span>📐 {property.area} m²</span>}
              </div>
              <div className="property-footer">
                <div className="property-price">
                  {(property.price / 1000000).toFixed(2)}M ETB
                </div>
                <div className="property-actions">
                  <button
                    className="btn-icon"
                    title="View"
                    onClick={() => viewProperty(property)}
                  >
                    👁️
                  </button>

                  {(user?.role === "property_admin" || user?.role === "system_admin") &&
                    property.latitude && property.longitude && (
                    <button
                      className="btn-icon"
                      title="View Map"
                      onClick={() => {
                        if (setViewMapPropertyId && setCurrentPage) {
                          setViewMapPropertyId(property.id);
                          setCurrentPage('map-view');
                        } else {
                          setMapProperty(property);
                          setShowMapModal(true);
                        }
                      }}
                      style={{ color: '#667eea' }}
                    >
                      🗺️
                    </button>
                  )}
                  {user?.role === 'broker' && (
                    <button
                      className="btn-icon"
                      style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', width: 'auto' }}
                      title="Book for Buyer (30 Min Hold)"
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowBrokerBookingModal(true);
                      }}
                    >
                      ⏱️ Book
                    </button>
                  )}
                  {user?.role === "user" && (
                    <button
                      className="btn-icon"
                      style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 'bold', width: 'auto' }}
                      title="Book Property (30 Min Hold)"
                      onClick={() => {
                        setSelectedProperty(property);
                        setBookingFormData({
                          ...bookingFormData,
                          buyer_name: user.name || '',
                          email: user.email || '',
                          phone: (user.phone || '').replace('+251', '')
                        });
                        setShowBrokerBookingModal(true);
                      }}
                    >
                      ⏱️ Book
                    </button>
                  )}
                  {user?.role === "user" && (
                    <button
                      className="btn-icon"
                      title={
                        isFavorite(property.id)
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                      onClick={() => toggleFavorite(property.id)}
                      style={{
                        color: isFavorite(property.id) ? "#ef4444" : "#94a3b8",
                      }}
                    >
                      {isFavorite(property.id) ? "❤️" : "🤍"}
                    </button>
                  )}
                  {(user?.role === "admin" ||
                    user?.role === "system_admin" ||
                    user?.role === "property_admin" ||
                    user?.role === "owner") && (
                    <button
                      className="btn-icon danger"
                      title="Delete"
                      onClick={() => deleteProperty(property.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {user?.role === "user" && (
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {!hasAgreement(property.id) ? (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setAgreementFlowPropertyId(property.id);
                        setShowAgreementFlowModal(true);
                      }}
                    >
                      🤝 Request Agreement
                    </button>
                  ) : (
                    <button className="btn-secondary" disabled>
                      📄 Agreement Requested
                    </button>
                  )}
                </div>
              )}

              {(property.broker_name || property.owner_name) && (
                <div className="property-broker">
                  <span>
                    👤{" "}
                    {property.owner_name
                      ? `Owner: ${property.owner_name}`
                      : `Broker: ${property.broker_name}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="no-results">
          <p>Loading  properties ......</p>
        </div>
      )}

      {/* Add Property Modal */}

      {/* Add Property Modal */}
      {showAddProperty && (
        <PropertyUploaderModal 
          user={user} 
          onClose={() => setShowAddProperty(false)} 
          onSuccess={fetchProperties}
        />
      )}


      {/* View Property Modal */}
      {showViewModal && selectedProperty && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowViewModal(false);
            setPropertyDetail(null);
          }}
        >
          <div
            className="modal-content extra-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏠 {selectedProperty.type ? selectedProperty.type.charAt(0).toUpperCase() + selectedProperty.type.slice(1) : selectedProperty.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="close-btn"
                  onClick={() => {
                    setShowViewModal(false);
                    setPropertyDetail(null);
                  }}
                  style={{ position: 'relative', top: 'auto', right: 'auto', margin: 0 }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="modal-body">
              <div className="property-view-grid">
                <div className="property-view-section full-width">
                  <h3>📷 Property Images</h3>
                  <ImageGallery
                    propertyId={selectedProperty.id}
                    canDelete={false}
                  />
                </div>
                <div className="property-view-section">
                  <h3>ℹ️ Property Information</h3>
                  <div className="info-grid">
                    <div>
                      <strong>Title:</strong> {selectedProperty.title}
                    </div>
                    <div>
                      <strong>Type:</strong> {selectedProperty.type}
                    </div>
                    <div>
                      <strong>Listing:</strong>{" "}
                      {selectedProperty.listing_type || "sale"}
                    </div>
                    <div>
                      <strong>Bedrooms:</strong>{" "}
                      {selectedProperty.bedrooms || "N/A"}
                    </div>
                    <div>
                      <strong>Bathrooms:</strong>{" "}
                      {selectedProperty.bathrooms || "N/A"}
                    </div>
                    <div>
                      <strong>Area:</strong> {selectedProperty.area || "N/A"} m²
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        className={`status-badge ${selectedProperty.status}`}
                      >
                        {selectedProperty.status}
                      </span>
                    </div>
                    <div>
                      <strong>Verified:</strong>{" "}
                      {selectedProperty.verified ? "✅ Yes" : "❌ No"}
                    </div>
                  </div>

                  {/* ── AI Price vs Owner Price Comparison ── */}
                  <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Owner's Price */}
                    <div style={{
                      padding: '16px', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                      border: '1px solid #86efac'
                    }}>
                      <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        💰 Owner's Price
                      </div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#14532d' }}>
                        {Number(selectedProperty.price).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: '600' }}>ETB</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                        {(selectedProperty.price / 1000000).toFixed(2)}M ETB
                      </div>
                    </div>

                    {/* AI Predicted Price */}
                    <div style={{
                      padding: '16px', borderRadius: '12px',
                      background: aiPredictionLoading ? '#f8fafc' : 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                      border: `1px solid ${aiPredictionLoading ? '#e2e8f0' : '#c4b5fd'}`
                    }}>
                      <div style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                        🤖 AI Predicted Price
                      </div>
                      {aiPredictionLoading ? (
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>⏳ Analyzing...</div>
                      ) : aiPrediction ? (
                        <>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: '#4c1d95' }}>
                            {Number(aiPrediction.predicted_price).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: '600' }}>ETB</span>
                          </div>
                          {/* Deviation indicator */}
                          {(() => {
                            const deviation = ((selectedProperty.price - aiPrediction.predicted_price) / aiPrediction.predicted_price * 100);
                            const absDeviation = Math.abs(deviation);
                            let color, icon, label;
                            if (absDeviation <= 15) { color = '#059669'; icon = '✅'; label = 'Fair Price'; }
                            else if (absDeviation <= 30) { color = '#d97706'; icon = '⚠️'; label = `${deviation > 0 ? 'Above' : 'Below'} Market`; }
                            else { color = '#dc2626'; icon = '🚨'; label = `${Math.round(absDeviation)}% ${deviation > 0 ? 'Over' : 'Under'}`; }
                            return (
                              <div style={{ fontSize: '11px', color, fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {icon} {label} ({deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%)
                              </div>
                            );
                          })()}
                          {/* Confidence */}
                          <div style={{ marginTop: '6px' }}>
                            <div style={{ height: '4px', background: '#ddd6fe', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', width: `${aiPrediction.confidence}%`,
                                background: aiPrediction.confidence >= 80 ? '#10b981' : aiPrediction.confidence >= 60 ? '#f59e0b' : '#ef4444',
                                borderRadius: '2px'
                              }} />
                            </div>
                            <div style={{ fontSize: '10px', color: '#8b5cf6', marginTop: '2px' }}>
                              {aiPrediction.confidence}% confidence • {aiPrediction.is_ml ? 'ML' : 'Statistical'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#94a3b8' }}>—</div>
                      )}
                    </div>
                  </div>

                  {/* AI Price Range */}
                  {aiPrediction && (
                    <div style={{
                      marginTop: '10px', padding: '10px 14px', borderRadius: '8px',
                      background: '#faf5ff', border: '1px solid #e9d5ff', fontSize: '11px', color: '#6d28d9',
                      display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'
                    }}>
                      <span>📉 Low: <strong>{Number(aiPrediction.low_estimate).toLocaleString()} ETB</strong></span>
                      <span>📊 Predicted: <strong>{Number(aiPrediction.predicted_price).toLocaleString()} ETB</strong></span>
                      <span>📈 High: <strong>{Number(aiPrediction.high_estimate).toLocaleString()} ETB</strong></span>
                    </div>
                  )}

                  {selectedProperty.description && (
                    <div className="description-box">
                      <strong>Description:</strong>
                      <p>{selectedProperty.description}</p>
                    </div>
                  )}
                </div>
                <div className="property-view-section">
                  <h3>👤 Owner / Broker</h3>
                  <div className="submitter-info">
                    <p>
                      <strong>Owner:</strong>{" "}
                      {selectedProperty.owner_name || "N/A"}
                    </p>
                    <p>
                      <strong>Broker:</strong>{" "}
                      {selectedProperty.broker_name || "N/A"}
                    </p>
                    <p>
                      <strong>Listed:</strong>{" "}
                      {(selectedProperty.createdAt || selectedProperty.created_at) ? new Date(
                        selectedProperty.createdAt || selectedProperty.created_at,
                      ).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  {propertyDetail && propertyDetail.verification && (
                    <div style={{ marginTop: "15px" }}>
                      <h4>📋 Verification</h4>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span
                          className={`status-badge ${propertyDetail.verification.verification_status}`}
                        >
                          {propertyDetail.verification.verification_status}
                        </span>
                      </p>
                      {propertyDetail.verification.verification_notes && (
                        <p>
                          <strong>Notes:</strong>{" "}
                          {propertyDetail.verification.verification_notes}
                        </p>
                      )}
                      {propertyDetail.verification.verified_at && (
                        <p>
                          <strong>Date:</strong>{" "}
                          {new Date(
                            propertyDetail.verification.verified_at,
                          ).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {user?.role === "user" && (
                    <div style={{ marginTop: "16px" }}>
                      <button
                        onClick={() => toggleFavorite(selectedProperty.id)}
                        style={{
                          background: isFavorite(selectedProperty.id)
                            ? "#fee2e2"
                            : "#f1f5f9",
                          color: isFavorite(selectedProperty.id)
                            ? "#ef4444"
                            : "#64748b",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px 16px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "14px",
                        }}
                      >
                        {isFavorite(selectedProperty.id)
                          ? "❤️ Remove from Favorites"
                          : "🤍 Add to Favorites"}
                      </button>
                    </div>
                  )}

                  {user?.role === "user" && (
                    <div
                      style={{
                        marginTop: "20px",
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "12px",
                      }}
                    >
                      <h4>🤝 Agreement</h4>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {!hasAgreement(selectedProperty.id) ? (
                          <button
                            className="btn-primary"
                            onClick={() => {
                              setAgreementFlowPropertyId(selectedProperty.id);
                              setShowAgreementFlowModal(true);
                            }}
                          >
                            🤝 Request Agreement
                          </button>
                        ) : (
                          <button className="btn-secondary" disabled>
                            📄 Agreement Requested
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {user?.role === 'broker' && (
                    <div style={{ marginTop: "16px" }}>
                      <button
                        className="btn-primary"
                        style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 16px', fontWeight: 'bold', width: '100%', fontSize: '16px', cursor: 'pointer' }}
                        onClick={() => {
                          setShowBrokerBookingModal(true);
                        }}
                      >
                        ⏱️ Book for Buyer (30 Min Hold)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDocumentViewer && (
        <div
          className="modal-overlay"
          onClick={() => setShowDocumentViewer(false)}
        >
          <div
            className="modal-content document-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📄 Property Documents</h2>
              <button
                className="close-btn"
                onClick={() => setShowDocumentViewer(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {user?.role === "property_admin" ? (
                <DocumentViewerAdmin
                  propertyId={documentProperty?.id}
                  property={documentProperty}
                  userId={user.id}
                />
              ) : (
                <DocumentViewer
                  propertyId={documentProperty?.id}
                  userId={user.id}
                  approvedKey={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {/* Map View Modal for Admin Roles */}
      {showMapModal && mapProperty && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowMapModal(false);
            setMapProperty(null);
          }}
        >
          <div
            className="modal-content extra-large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>🗺️ {mapProperty.title} — Map Location</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowMapModal(false);
                  setMapProperty(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ minHeight: '450px' }}>
              <PropertyMap
                latitude={mapProperty.latitude}
                longitude={mapProperty.longitude}
                title={mapProperty.title}
              />
              <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ margin: '4px 0', fontSize: '13px' }}>
                  <strong>📍 Location:</strong> {mapProperty.location}
                </p>
                <p style={{ margin: '4px 0', fontSize: '13px' }}>
                  <strong>Latitude:</strong> {mapProperty.latitude} | <strong>Longitude:</strong> {mapProperty.longitude}
                </p>
              </div>
            </div>
          </div>
        </div>
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
                  if (setCurrentPage) setCurrentPage('agreement-workflow', { propertyId: agreementFlowPropertyId });
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
                  if (setCurrentPage) setCurrentPage('broker-engagement', { propertyId: agreementFlowPropertyId });
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



    </div>
  );
};

export default Properties;
