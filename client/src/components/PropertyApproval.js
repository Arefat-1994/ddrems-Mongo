import React, { useState, useEffect } from 'react';
import './PropertyApproval.css';
import ImageGallery from './shared/ImageGallery';
import DocumentViewerAdmin from './shared/DocumentViewerAdmin';
import axios from 'axios';

const PropertyApproval = ({ user, onClose, onRefresh, setCurrentPage, setViewMapPropertyId }) => {
  const [pendingProperties, setPendingProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [siteCheckStatus, setSiteCheckStatus] = useState(null);
  const [loadingSiteCheck, setLoadingSiteCheck] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

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
    const icons = { house: '🏠', apartment: '🏢', villa: '🏡', shop: '🛍️' };
    return icons[type] || '🏠';
  };

  const viewProperty = (property) => {
    setSelectedProperty(property);
    setShowModal(true);
    setNotes('');
    fetchSiteCheckStatus(property.id);
  };

  const fetchSiteCheckStatus = async (propertyId) => {
    setLoadingSiteCheck(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/site-check/verification-status/${propertyId}`);
      setSiteCheckStatus(response.data);
    } catch (err) {
      console.error('Error fetching site check status:', err);
      setSiteCheckStatus(null);
    } finally {
      setLoadingSiteCheck(false);
    }
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
      // Build comprehensive notes with site check info
      let fullNotes = notes || '';
      if (siteCheckStatus && siteCheckStatus.site_check_status === 'approved') {
        fullNotes += `\n[Site Check: VERIFIED ON SITE]`;
      } else {
        fullNotes += `\n[Site Check: NOT COMPLETED OR NOT APPROVED]`;
      }

      await axios.put(`http://localhost:5000/api/properties/${selectedProperty.id}/verify`, {
        status: decision,
        verified_by: user.id,
        notes: fullNotes.trim(),
        site_checked: siteCheckStatus?.site_check_status === 'approved'
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
    if (property.main_image && !imageErrors[property.id]) {
      return (
        <img
          src={property.main_image}
          alt={property.title}
          onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))}
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
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏠 Review Property: {selectedProperty.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedProperty.latitude && selectedProperty.longitude && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (setViewMapPropertyId && setCurrentPage) {
                        setViewMapPropertyId(selectedProperty.id);
                        setCurrentPage('map-view', { returnTo: 'dashboard', returnView: 'approval' });
                      }
                    }}
                    style={{
                      background: 'white',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      padding: '6px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.target.style.background = 'white'}
                  >
                    📍 View on Map
                  </button>
                )}
                <button 
                  onClick={() => setShowModal(false)}
                  style={{ 
                    position: 'relative', 
                    top: 'auto', 
                    right: 'auto', 
                    margin: 0,
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.target.style.background = '#fee2e2'; e.target.style.color = '#ef4444'; e.target.style.borderColor = '#fca5a5'; }}
                  onMouseOut={(e) => { e.target.style.background = 'white'; e.target.style.color = '#475569'; e.target.style.borderColor = '#e2e8f0'; }}
                  title="Close and return to Property Details"
                >✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="property-review-grid">
                {/* Images Section */}
                <div className="review-section full-width">
                  <h3>📷 User/Broker Uploaded Images ({selectedProperty.image_count || 0})</h3>
                  <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
                    Images uploaded by the property submitter. Site check photos will be captured separately on-site.
                  </p>
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
                    <h4 style={{marginTop: '20px'}}>ML Price Verification</h4>
                    
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

                {/* Document Verification Section */}
                <div className="review-section full-width">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    📄 User/Broker Documents
                    <span style={{

                      fontSize: '12px',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: '600'
                    }}>Required</span>
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
                    Review uploaded documents below. Use the access key to view each document before making a verification decision.
                  </p>
                  <DocumentViewerAdmin
                    propertyId={selectedProperty.id}
                    property={selectedProperty}
                    userId={user?.id}
                    userRole={user?.role || 'property_admin'}
                    onVerificationAction={() => {
                      setShowModal(false);
                      setSelectedProperty(null);
                      setNotes('');
                      fetchPendingProperties();
                      if (onRefresh) onRefresh();
                    }}
                  />
                </div>

                {/* Site Check Section */}
                <div className="review-section full-width">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    📍 GPS Site Check & Legal Verification
                  </h3>
                  <div style={{
                    background: siteCheckStatus?.site_check_status === 'approved' ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${siteCheckStatus?.site_check_status === 'approved' ? '#bbf7d0' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    transition: 'all 0.3s ease'
                  }}>
                    <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px' }}>
                      To properly verify this property, a Property Admin must visit the site, capture GPS coordinates, take a site photo, and upload strict legal documents (Title Deed, ID Card).
                    </p>
                    
                    {loadingSiteCheck ? (
                      <div>⏳ Loading site check status...</div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                          <p style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Current Site Check Status: 
                            <span style={{ 
                              padding: '6px 14px', 
                              borderRadius: '8px', 
                              fontSize: '14px',
                              background: siteCheckStatus?.site_check_status === 'approved' ? '#dcfce7' : siteCheckStatus?.site_check_status === 'rejected' ? '#fee2e2' : '#f1f5f9',
                              color: siteCheckStatus?.site_check_status === 'approved' ? '#166534' : siteCheckStatus?.site_check_status === 'rejected' ? '#991b1b' : '#475569',
                              border: `1px solid ${siteCheckStatus?.site_check_status === 'approved' ? '#bbf7d0' : siteCheckStatus?.site_check_status === 'rejected' ? '#fecaca' : '#cbd5e1'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {siteCheckStatus?.site_check_status === 'approved' && '✅ '}
                              {siteCheckStatus?.site_check_status === 'rejected' && '❌ '}
                              {siteCheckStatus?.site_check_status ? siteCheckStatus.site_check_status.replace('_', ' ').toUpperCase() : 'NOT STARTED'}
                            </span>
                          </p>
                          <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                            Legal Documents Verified:
                            <span style={{ marginLeft: '8px', color: siteCheckStatus?.all_documents_verified ? '#059669' : '#d97706' }}>
                              {siteCheckStatus?.all_documents_verified ? '✅ All Verified' : '⚠️ Pending or Incomplete'}
                            </span>
                          </p>
                        </div>
                        
                        {setCurrentPage && (
                          <button
                            onClick={() => setCurrentPage('site-check', { initialPropertyId: selectedProperty.id })}
                            style={{
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color: 'white',
                              border: 'none',
                              padding: '10px 20px',
                              borderRadius: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                            }}
                          >
                            🚀 Go to Site Check Workflow
                          </button>
                        )}
                      </div>
                    )}
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
            <div className="modal-actions" style={{
              padding: '20px',
              borderTop: '2px solid #e2e8f0',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    className={`btn-success ${siteCheckStatus?.site_check_status !== 'approved' ? 'disabled-btn' : ''}`}
                    onClick={() => handleDecision('approved')}
                    disabled={actionLoading || siteCheckStatus?.site_check_status !== 'approved'}
                    style={{ 
                      padding: '10px 24px', 
                      fontSize: '14px', 
                      fontWeight: '600',
                      opacity: siteCheckStatus?.site_check_status !== 'approved' ? 0.6 : 1,
                      cursor: siteCheckStatus?.site_check_status !== 'approved' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {actionLoading ? '⏳ Processing...' : '✅ Verify & Approve'}
                  </button>
                  {siteCheckStatus?.site_check_status !== 'approved' && (
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', position: 'absolute', bottom: '-20px', left: '0', whiteSpace: 'nowrap' }}>
                      ⚠️ Site check must be approved first
                    </div>
                  )}
                </div>
                <button
                  className="btn-danger"
                  onClick={() => handleDecision('rejected')}
                  disabled={actionLoading}
                  style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '600' }}
                >
                  {actionLoading ? '⏳ Processing...' : '❌ Reject'}
                </button>
                <button
                  className="btn-warning"
                  onClick={() => handleDecision('suspended')}
                  disabled={actionLoading}
                  style={{ padding: '10px 20px', fontSize: '13px' }}
                >
                  {actionLoading ? '⏳...' : '⏸️ Suspend'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {siteCheckStatus?.fully_verified && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    border: '1px solid #bbf7d0'
                  }}>
                    🎉 Fully Verified On-Site
                  </span>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={actionLoading}
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyApproval;
