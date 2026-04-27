import React, { useState, useEffect } from 'react';
import './BrokerMyProperties.css';
import axios from 'axios';
import PageHeader from './PageHeader';
import DocumentViewer from './shared/DocumentViewer';
import PropertyImageViewer from './shared/PropertyImageViewer';
import ImageUploader from './shared/ImageUploader';
import DocumentUploader from './shared/DocumentUploader';
import PropertyMap from './shared/PropertyMap';
import Property3DViewer from './shared/Property3DViewer';
import PropertyUploaderModal from './shared/PropertyUploaderModal';

const BrokerMyProperties = ({ user, onLogout, setCurrentPage, onSettingsClick }) => {
  const [properties, setProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [listingTypeFilter, setListingTypeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentPropertyId, setDocumentPropertyId] = useState(null);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImages, setViewerImages] = useState([]);
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
    latitude: '',
    longitude: '',
    model_3d_path: '',
    owner_id: ''
  });
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [active3DProperty, setActive3DProperty] = useState(null);
  const [owners, setOwners] = useState([]);
  const [newPropertyId, setNewPropertyId] = useState(null);
  const [addStep, setAddStep] = useState('form'); // form, images, documents, done
  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    fetchBrokerProperties();
    fetchOwners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchOwners = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/role/owner');
      setOwners(response.data);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  const fetchBrokerProperties = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/properties/broker/${user?.id}`);
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching broker properties:', error);
      setProperties([]);
    }
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/properties/${propertyId}`);
      alert('✅ Property deleted successfully');
      fetchBrokerProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('❌ Failed to delete property');
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

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/properties', {
        ...propertyForm,
        broker_id: user.id,
        status: 'pending'
      });

      setNewPropertyId(response.data.id);
      setAddStep('images');
    } catch (error) {
      console.error('Error adding property:', error);
      alert('❌ Failed to add property: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFinalSubmit = () => {
    alert('✅ Property added successfully! It will be reviewed by admin.');
    setShowAddProperty(false);
    setAddStep('form');
    setNewPropertyId(null);
    setPropertyForm({
      title: '', type: 'apartment', listing_type: 'sale', price: '', location: '',
      bedrooms: '', bathrooms: '', area: '', description: '', latitude: '', longitude: '',
      model_3d_path: '', owner_id: ''
    });
    fetchBrokerProperties();
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesListing = listingTypeFilter === 'all' || property.listing_type === listingTypeFilter;
    const matchesType = typeFilter === 'all' || property.type === typeFilter;
    return matchesSearch && matchesListing && matchesType;
  });

  const getStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      active: '#10b981',
      suspended: '#ef4444',
      rejected: '#dc2626'
    };
    return colors[status] || '#6b7280';
  };

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
    <div className="broker-my-properties">
      <PageHeader
        title="My Properties"
        subtitle={`Manage your property listings (${properties.length} total)`}
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={
          <button className="btn-primary" onClick={() => setShowAddProperty(true)}>
            <span>➕</span> Add New Property
          </button>
        }
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
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
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
              <span
                className="property-status"
                style={{ background: getStatusColor(property.status) }}
              >
                {property.status.toUpperCase()}
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
                <button
                  className="btn-action 3d"
                  title="View 3D Walkthrough"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActive3DProperty(property);
                    setShow3DViewer(true);
                  }}
                >
                  🌐 3D
                </button>
                <button
                  className="btn-action document"
                  title="View Documents"
                  onClick={() => openDocumentViewer(property.id)}
                >
                  📄 Document
                </button>
                <button
                  className="btn-action delete"
                  title="Delete Property"
                  onClick={() => deleteProperty(property.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="no-results">
          <p>📭 No properties found matching your filters</p>
        </div>
      )}

      {/* View Property Modal */}
      {showViewModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 {selectedProperty.title}</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Property Image with View Button */}
              <div className="property-image-section" style={{ position: 'relative', marginBottom: '20px' }}>
                {selectedProperty.main_image ? (
                  <img 
                    src={selectedProperty.main_image} 
                    alt={selectedProperty.title}
                    style={{ width: '100%', height: '300px', objectFit: 'cover', borderRadius: '8px' }}
                    onDoubleClick={() => {
                      openImageViewer(selectedProperty);
                      setShowViewModal(false);
                    }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '300px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '80px' }}>
                    {getPropertyTypeIcon(selectedProperty.type)}
                  </div>
                )}
                <button 
                  className="btn-view-full-image"
                  onClick={() => {
                    openImageViewer(selectedProperty);
                    setShowViewModal(false);
                  }}
                  style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '10px 16px', background: 'rgba(102, 126, 234, 0.95)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
                >
                  🖼️ View Full Image
                </button>
              </div>

              <div className="property-details-grid">
                <div className="detail-section">
                  <h3>ℹ️ Property Information</h3>
                  <div className="info-grid">
                    <div><strong>Type:</strong> {selectedProperty.type}</div>
                    <div><strong>Listing:</strong> {selectedProperty.listing_type === 'sale' ? '🏷️ For Sale' : '🔑 For Rent'}</div>
                    <div><strong>Price:</strong> {(selectedProperty.price / 1000000).toFixed(2)}M ETB</div>
                    <div><strong>Location:</strong> {selectedProperty.location}</div>
                    <div><strong>Bedrooms:</strong> {selectedProperty.bedrooms || 'N/A'}</div>
                    <div><strong>Bathrooms:</strong> {selectedProperty.bathrooms || 'N/A'}</div>
                    <div><strong>Area:</strong> {selectedProperty.area || 'N/A'} m²</div>
                    <div><strong>Status:</strong> <span style={{ color: getStatusColor(selectedProperty.status) }}>●</span> {selectedProperty.status.toUpperCase()}</div>
                  </div>
                  {selectedProperty.description && (
                    <div className="description-box">
                      <strong>Description:</strong>
                      <p>{selectedProperty.description}</p>
                    </div>
                  )}
                  {/* Property Map */}
                  {(selectedProperty.latitude || selectedProperty.longitude) && (
                    <div style={{ marginTop: '15px' }}>
                      <h3>📍 Property Location</h3>
                      <PropertyMap 
                        latitude={selectedProperty.latitude} 
                        longitude={selectedProperty.longitude} 
                        title={selectedProperty.title} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
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

      {/* Add Property Modal - Shared Component */}
      {showAddProperty && (
        <PropertyUploaderModal 
          user={user} 
          onClose={() => setShowAddProperty(false)} 
          onSuccess={fetchBrokerProperties} 
        />
      )}
      {/* 3D Viewer Modal */}
      {show3DViewer && active3DProperty && (
        <Property3DViewer
          modelPath={active3DProperty.model_3d_path}
          propertyTitle={active3DProperty.title}
          onClose={() => {
            setShow3DViewer(false);
            setActive3DProperty(null);
          }}
        />
      )}
    </div>
  );
};

export default BrokerMyProperties;
