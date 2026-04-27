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
  const [keyRequests, setKeyRequests] = useState([]);
  const [agreementRequests, setAgreementRequests] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
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
    buyer_name: '', phone: '', id_type: 'National ID', id_number: '',
    document_status: 'Yes', preferred_visit_time: '', notes: ''
  });

  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [videoUploadProperty, setVideoUploadProperty] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadType, setVideoUploadType] = useState('file'); // 'file' or 'link'
  const [videoLink, setVideoLink] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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
      const API_BASE = `http://${window.location.hostname}:5000/api`;
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
        const API_BASE = `http://${window.location.hostname}:5000/api`;
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
        const API_BASE = `http://${window.location.hostname}:5000/api`;
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
        const API_BASE = `http://${window.location.hostname}:5000/api`;
        const [keyRes, agreementRes] = await Promise.all([
          axios.get(
            `${API_BASE}/key-requests/customer/${user.id}`,
          ),
          axios.get(
            `${API_BASE}/agreement-requests/customer/${user.id}`,
          ),
        ]);
        setKeyRequests(keyRes.data);
        setAgreementRequests(agreementRes.data);
      } else if (user?.role === "owner") {
        const API_BASE = `http://${window.location.hostname}:5000/api`;
        const [keyRes, agreementRes] = await Promise.all([
          axios.get(
            `${API_BASE}/key-requests/customer/${user.id}`,
          ),
          axios.get(`${API_BASE}/agreements/owner/${user.id}`),
        ]);
        setKeyRequests(keyRes.data);
        setAgreementRequests(agreementRes.data);
      } else if (user?.role === "broker") {
        const API_BASE = `http://${window.location.hostname}:5000/api`;
        const [keyRes, agreementRes] = await Promise.all([
          axios.get(`${API_BASE}/key-requests/broker/${user.id}`),
          axios.get(`${API_BASE}/agreements/broker/${user.id}`),
        ]);
        setKeyRequests(keyRes.data);
        setAgreementRequests(agreementRes.data);
      }
    } catch (error) {
      console.error("Error fetching user requests:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      let endpoint = `${API_BASE}/properties`;

      if (
        user?.role === "system_admin" ||
        user?.role === "admin" ||
        user?.role === "property_admin"
      ) {
        endpoint = `${API_BASE}/properties/all-with-status`;
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
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      const response = await axios.get(
        `${API_BASE}/properties/${property.id}`,
      );
      setPropertyDetail(response.data);
    } catch (error) {
      console.error("Error fetching property details:", error);
      setPropertyDetail(property);
    }
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm("Are you sure you want to delete this property?"))
      return;
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.delete(`${API_BASE}/properties/${propertyId}`);
      alert("Property deleted successfully");
      fetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      alert("Failed to delete property");
    }
  };

  const hasKey = (propertyId) => {
    return keyRequests.find(
      (req) => req.property_id === propertyId && req.status === "accepted",
    );
  };

  const hasPendingKey = (propertyId) => {
    return keyRequests.some(
      (req) => req.property_id === propertyId && req.status === "pending",
    );
  };

  const hasAgreement = (propertyId) => {
    return agreementRequests.some(
      (req) =>
        req.property_id === propertyId &&
        ["pending", "active"].includes(req.status),
    );
  };

  const requestKey = async (propertyId) => {
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.post(`${API_BASE}/key-requests`, {
        property_id: propertyId,
        customer_id: user.id,
        request_message:
          "Requesting access key to view property documents and agreement.",
      });
      alert("🔑 Key request sent successfully!");
      fetchUserRequests();
    } catch (error) {
      console.error("Error requesting key:", error);
      alert(error.response?.data?.message || "Failed to send key request");
    }
  };

  const handleBrokerBookingSubmit = async (e) => {
    e.preventDefault();
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.post(`${API_BASE}/broker-bookings`, {
        property_id: selectedProperty.id,
        broker_id: user.id,
        ...bookingFormData
      });
      alert('Property successfully reserved for 30 minutes!');
      setShowBrokerBookingModal(false);
      setBookingFormData({
        buyer_name: '', phone: '', id_type: 'National ID', id_number: '',
        document_status: 'Yes', preferred_visit_time: '', notes: ''
      });
      fetchProperties();
    } catch (error) {
      console.error('Error booking property:', error);
      alert(error.response?.data?.message || 'Failed to book property');
    }
  };

  const openDocumentViewer = (property) => {
    setDocumentProperty(property);
    setShowDocumentViewer(true);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Video file is too large. Maximum size is 10MB.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    try {
      setVideoUploadProgress(1);
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.put(`${API_BASE}/properties/${videoUploadProperty.id}/video`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setVideoUploadProgress(percentCompleted);
        }
      });
      alert('✅ Video uploaded successfully!');
      setShowVideoUploadModal(false);
      fetchProperties();
    } catch (error) {
      console.error('Video upload error:', error);
      alert('❌ Failed to upload video: ' + (error.response?.data?.message || 'Server error'));
    } finally {
      setVideoUploadProgress(0);
    }
  };

  const handleVideoLinkSubmit = async (e) => {
    e.preventDefault();
    if (!videoLink) return;

    try {
      setActionLoading(true);
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.put(`${API_BASE}/properties/${videoUploadProperty.id}/video-link`, { video_url: videoLink });
      alert('✅ Video link updated successfully!');
      setShowVideoUploadModal(false);
      setVideoLink('');
      fetchProperties();
    } catch (error) {
      console.error('Video link update error:', error);
      alert('❌ Failed to update video link');
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
          onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))}
        />
      );
    }
    return (
      <div className="no-image-placeholder">
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
        {filteredProperties.map((property) => (
          <div key={property.id} className="property-card">
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
                  {user?.role === "owner" && (
                    <button
                      className="btn-icon"
                      title="Upload Video"
                      onClick={() => {
                        setVideoUploadProperty(property);
                        setShowVideoUploadModal(true);
                      }}
                      style={{ color: '#8b5cf6' }}
                    >
                      🎥
                    </button>
                  )}
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
                  {!hasKey(property.id) && !hasPendingKey(property.id) && (
                    <button
                      className="btn-secondary"
                      onClick={() => requestKey(property.id)}
                    >
                      🔑 Request Key
                    </button>
                  )}
                  {hasPendingKey(property.id) && (
                    <button className="btn-secondary" disabled>
                      ⏳ Key Request Pending
                    </button>
                  )}
                  {hasKey(property.id) && (
                    <button
                      className="btn-success"
                      onClick={() => openDocumentViewer(property)}
                    >
                      ✅ Key Approved: View Docs
                    </button>
                  )}
                  {hasKey(property.id) && !hasAgreement(property.id) && (
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setAgreementFlowPropertyId(property.id);
                        setShowAgreementFlowModal(true);
                      }}
                    >
                      🤝 Request Agreement
                    </button>
                  )}
                  {hasAgreement(property.id) && (
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
          <p>No properties found</p>
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
                      <strong>Price:</strong>{" "}
                      {(selectedProperty.price / 1000000).toFixed(2)}M ETB
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
                      {new Date(
                        selectedProperty.created_at,
                      ).toLocaleDateString()}
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
                      <h4>🔐 Access & Agreement</h4>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        {!hasKey(selectedProperty.id) &&
                          !hasPendingKey(selectedProperty.id) && (
                            <button
                              className="btn-secondary"
                              onClick={() => requestKey(selectedProperty.id)}
                            >
                              🔑 Request Key
                            </button>
                          )}
                        {hasPendingKey(selectedProperty.id) && (
                          <button className="btn-secondary" disabled>
                            ⏳ Key Request Pending
                          </button>
                        )}
                        {hasKey(selectedProperty.id) && (
                          <button
                            className="btn-success"
                            onClick={() => openDocumentViewer(selectedProperty)}
                          >
                            ✅ Key Approved: View Documents
                          </button>
                        )}
                        {hasKey(selectedProperty.id) &&
                          !hasAgreement(selectedProperty.id) && (
                            <button
                              className="btn-primary"
                              onClick={() => {
                                setAgreementFlowPropertyId(selectedProperty.id);
                                setShowAgreementFlowModal(true);
                              }}
                            >
                              🤝 Request Agreement
                            </button>
                          )}
                        {hasAgreement(selectedProperty.id) && (
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
                  approvedKey={
                    keyRequests.find(
                      (r) =>
                        r.property_id === documentProperty?.id &&
                        r.status === "accepted",
                    )?.key_code
                  }
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
                <input type="tel" required pattern="^[0-9]{10,13}$" title="Phone number should be 10-13 digits" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
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
                  <input type="text" required pattern="^[A-Za-z0-9]+$" title="ID should only contain letters and numbers" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
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

              <button type="submit" style={{ width: '100%', padding: '12px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', marginTop: '10px' }}>
                Confirm Booking (Locks for 30 Mins)
              </button>
            </form>
          </div>
        </div>
      )}


      {/* Video Upload Modal */}
      {showVideoUploadModal && videoUploadProperty && (
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
                    onChange={handleVideoUpload}
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
              <form onSubmit={handleVideoLinkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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

export default Properties;
