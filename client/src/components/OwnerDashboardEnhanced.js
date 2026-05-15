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

const OwnerDashboardEnhanced = ({ user, onLogout, setCurrentPage, onSettingsClick }) => {
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

  
  // UI States
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showViewProperty, setShowViewProperty] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    fetchOwnerData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOwnerData = async () => {
    try {
      const [propertiesRes, agreementRequestsRes] = await Promise.all([
        axios.get(`${window.API_URL}/properties/owner/${user.id}`),
        axios.get(`${window.API_URL}/agreement-requests/owner/${user.id}`)
      ]);

      setMyProperties(propertiesRes.data);
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
      await axios.delete(`${window.API_URL}/properties/${propertyId}`);
      alert('Property deleted successfully');
      fetchOwnerData();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
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
        onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
        actions={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
            
            <button 
              className="btn-secondary" 
              onClick={() => setCurrentView('agreements')}
              style={{
                background: 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              🤝 Agreements
            </button>

            <button 
              className="btn-primary" 
              onClick={() => setShowAddProperty(true)}
              style={{
                background: '#ffffff',
                color: '#111827',
                border: '1px solid #e5e7eb',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              ➕ Add Property
            </button>
          </div>
        }
      />

      <div className="stats-grid minimized-white" style={{ marginTop: '-45px', marginBottom: '15px', gap: '10px' }}>
        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '8px 12px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon" style={{ background: '#f8fafc', color: '#64748b', width: '30px', height: '30px', fontSize: '16px', borderRadius: '6px' }}>🏠</div>
          <div className="stat-content"><h3 style={{ color: '#1f2937', fontSize: '16px', margin: 0 }}>{stats.myProperties}</h3><p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>My Properties</p></div>
        </div>
        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '8px 12px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon" style={{ background: '#f8fafc', color: '#64748b', width: '30px', height: '30px', fontSize: '16px', borderRadius: '6px' }}>✅</div>
          <div className="stat-content"><h3 style={{ color: '#1f2937', fontSize: '16px', margin: 0 }}>{stats.activeListings}</h3><p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>Active Listings</p></div>
        </div>
        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '8px 12px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon" style={{ background: '#f8fafc', color: '#64748b', width: '30px', height: '30px', fontSize: '16px', borderRadius: '6px' }}>👁️</div>
          <div className="stat-content"><h3 style={{ color: '#1f2937', fontSize: '16px', margin: 0 }}>{stats.totalViews}</h3><p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>Total Views</p></div>
        </div>
        <div className="stat-card white-theme" style={{ background: '#ffffff', color: '#1f2937', padding: '8px 12px', minHeight: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="stat-icon" style={{ background: '#f8fafc', color: '#64748b', width: '30px', height: '30px', fontSize: '16px', borderRadius: '6px' }}>🤝</div>
          <div className="stat-content"><h3 style={{ color: '#1f2937', fontSize: '16px', margin: 0 }}>{stats.pendingAgreements}</h3><p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>Agreement Requests</p></div>
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


                </div>
              </div>
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
    </div>
  );
};

export default OwnerDashboardEnhanced;
