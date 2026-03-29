import React, { useState, useEffect } from 'react';
import './PropertyApproval.css';
import ImageGallery from './shared/ImageGallery';
import { AIPriceComparison } from './shared/AIAdvisorWidget';
import axios from 'axios';

const PropertyApproval = ({ user, onClose, onRefresh }) => {
  const [pendingProperties, setPendingProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingProperties();
  }, []);

  const fetchPendingProperties = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/properties/pending-verification');
      setPendingProperties(response.data);
    } catch (error) {
      console.error('Error fetching pending properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPropertyTypeIcon = (type) => {
    const icons = { house: '🏠', apartment: '🏢', villa: '🏡', land: '🌍', commercial: '🏪' };
    return icons[type] || '🏠';
  };

  const viewProperty = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
    setNotes('');
  };

  const handleDecision = async (decision) => {
    if (!selectedProperty) return;

    const confirmMessages = {
      approved: 'Are you sure you want to APPROVE this property? It will become active and visible to users.',
      suspended: 'Are you sure you want to SUSPEND this property? It will be hidden from listings.',
      rejected: 'Are you sure you want to REJECT this property? It will be marked as inactive.'
    };

    if (!window.confirm(confirmMessages[decision] || `Are you sure you want to ${decision} this property?`)) {
      return;
    }

    setActionLoading(true);

    try {
      await axios.put(`http://localhost:5000/api/properties/${selectedProperty.id}/verify`, {
        status: decision,
        verified_by: user.id,
        notes: notes
      });

      const statusMessages = {
        approved: '✅ Property APPROVED successfully! It is now active and visible to users.',
        suspended: '⏸️ Property SUSPENDED successfully! It has been hidden from listings.',
        rejected: '❌ Property REJECTED successfully! It has been marked as inactive.'
      };

      alert(statusMessages[decision] || `Property ${decision} successfully!`);
      setShowModal(false);
      setSelectedProperty(null);
      setNotes('');
      fetchPendingProperties();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(`Error ${decision} property:`, error);
      alert(`Failed to ${decision} property. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  const renderPropertyImage = (property) => {
    if (property.main_image) {
      return (
        <img
          src={property.main_image}
          alt={property.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = `<div class="no-image">${getPropertyTypeIcon(property.type)} No Image</div>`;
          }}
        />
      );
    }
    return <div className="no-image">{getPropertyTypeIcon(property.type)} No Image</div>;
  };

  if (loading) {
    return <div className="loading">Loading pending properties...</div>;
  }

  return (
    <div className="property-approval">
      <div className="approval-header">
        <h2>⏳ Pending Property Approvals ({pendingProperties.length})</h2>
        {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
      </div>

      {pendingProperties.length === 0 ? (
        <div className="no-pending">
          <div className="empty-icon">✅</div>
          <p>No pending properties</p>
          <span>All properties have been reviewed</span>
        </div>
      ) : (
        <div className="pending-grid">
          {pendingProperties.map(property => (
            <div key={property.id} className="pending-card">
              <div className="property-image">
                {renderPropertyImage(property)}
                <span className="image-count">📷 {property.image_count || 0} images</span>
                <span className="pending-badge">⏳ Pending</span>
              </div>
              <div className="property-details">
                <h3>{property.title}</h3>
                <p className="property-type">{getPropertyTypeIcon(property.type)} {property.type} • {property.listing_type || 'sale'}</p>
                <p className="property-price">💰 {(property.price / 1000000).toFixed(2)}M ETB</p>
                <p className="property-location">📍 {property.location}</p>
                {property.bedrooms && (
                  <p className="property-specs">
                    🛏️ {property.bedrooms} beds • 🚿 {property.bathrooms} baths • 📐 {property.area}m²
                  </p>
                )}
                <p className="property-owner">
                  👤 {property.owner_name || property.broker_name || 'Unknown'}
                </p>
                <p className="property-date">
                  📅 Submitted: {new Date(property.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="property-actions">
                <button className="btn-view" onClick={() => viewProperty(property)}>
                  👁️ View & Decide
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View & Decision Modal */}
      {showModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 Review Property: {selectedProperty.title}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="property-review-grid">
                {/* Images Section */}
                <div className="review-section full-width">
                  <h3>📷 Property Images ({selectedProperty.image_count || 0})</h3>
                  <ImageGallery propertyId={selectedProperty.id} canDelete={false} />
                </div>

                {/* Property Details */}
                <div className="review-section">
                  <h3>ℹ️ Property Information</h3>
                  <div className="info-grid">
                    <div><strong>Title:</strong> {selectedProperty.title}</div>
                    <div><strong>Type:</strong> {getPropertyTypeIcon(selectedProperty.type)} {selectedProperty.type}</div>
                    <div><strong>Listing:</strong> {selectedProperty.listing_type || 'sale'}</div>
                    <div><strong>Price:</strong> {(selectedProperty.price / 1000000).toFixed(2)}M ETB</div>
                    <div><strong>Location:</strong> {selectedProperty.location}</div>
                    <div><strong>Bedrooms:</strong> {selectedProperty.bedrooms || 'N/A'}</div>
                    <div><strong>Bathrooms:</strong> {selectedProperty.bathrooms || 'N/A'}</div>
                    <div><strong>Area:</strong> {selectedProperty.area || 'N/A'} m²</div>
                  </div>
                  {selectedProperty.description && (
                    <div className="description-box">
                      <strong>Description:</strong>
                      <p>{selectedProperty.description}</p>
                    </div>
                  )}
                  
                  <div style={{ marginTop: '20px' }}>
                    <AIPriceComparison propertyData={selectedProperty} />
                  </div>
                </div>

                {/* Owner/Broker Info */}
                <div className="review-section">
                  <h3>👤 Submitted By</h3>
                  <div className="submitter-info">
                    <p><strong>Name:</strong> {selectedProperty.owner_name || selectedProperty.broker_name || 'Unknown'}</p>
                    <p><strong>Email:</strong> {selectedProperty.owner_email || selectedProperty.broker_email || 'N/A'}</p>
                    <p><strong>Submitted:</strong> {new Date(selectedProperty.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Decision Notes */}
                <div className="review-section full-width">
                  <h3>📝 Verification Notes</h3>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about your decision (optional)..."
                    rows="4"
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-success"
                onClick={() => handleDecision('approved')}
                disabled={actionLoading}
              >
                {actionLoading ? '⏳ Processing...' : '✅ Approve'}
              </button>
              <button
                className="btn-warning"
                onClick={() => handleDecision('suspended')}
                disabled={actionLoading}
              >
                {actionLoading ? '⏳ Processing...' : '⏸️ Suspend'}
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDecision('rejected')}
                disabled={actionLoading}
              >
                {actionLoading ? '⏳ Processing...' : '❌ Reject'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyApproval;
