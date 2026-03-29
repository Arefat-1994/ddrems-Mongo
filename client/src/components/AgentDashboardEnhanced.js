import React, { useState, useEffect } from 'react';
import './AgentDashboard.css';
import PageHeader from './PageHeader';
import CommissionTracking from './CommissionTracking';
import ImageUploader from './shared/ImageUploader';
import DocumentUploader from './shared/DocumentUploader';
import ImageGallery from './shared/ImageGallery';
import DocumentManager from './shared/DocumentManager';
import AIPriceComparison from './AIPriceComparison';
import axios from 'axios';
import MessageNotificationWidget from './MessageNotificationWidget';

const AgentDashboardEnhanced = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, commission, viewProperty, browseProperties, agreements
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRents: 0,
    activeListings: 0,
    totalCommission: 0,
    monthlyRevenue: 0,
    pendingDeals: 0
  });
  const [myProperties, setMyProperties] = useState([]);
  const [allActiveProperties, setAllActiveProperties] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showViewProperty, setShowViewProperty] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
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
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);

  useEffect(() => {
    fetchAgentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgentData = async () => {
    try {
      // Fetch ALL properties first
      const propertiesRes = await axios.get(`http://localhost:5000/api/properties`);
      
      // Filter to get ONLY broker's own properties
      const brokerProperties = propertiesRes.data.filter(p => p.broker_id === user.id);
      setMyProperties(brokerProperties);

      const sales = brokerProperties.filter(p => p.listing_type === 'sale' && p.status === 'sold').length;
      const rents = brokerProperties.filter(p => p.listing_type === 'rent' && p.status === 'rented').length;
      const active = brokerProperties.filter(p => p.status === 'active').length;

      setStats({
        totalSales: sales,
        totalRents: rents,
        activeListings: active,
        totalCommission: (sales * 150000) + (rents * 50000),
        monthlyRevenue: 2500000,
        pendingDeals: brokerProperties.filter(p => p.status === 'pending').length
      });

      try {
        const messagesRes = await axios.get(`http://localhost:5000/api/messages/user/${user.id}`);
        setMessages(messagesRes.data.slice(0, 5));
      } catch (error) {
        setMessages([]);
      }

      try {
        const announcementsRes = await axios.get('http://localhost:5000/api/announcements');
        setAnnouncements(announcementsRes.data.slice(0, 3));
      } catch (error) {
        setAnnouncements([]);
      }

      // Fetch active properties from others (for Browse Properties)
      try {
        const activePropsRes = await axios.get('http://localhost:5000/api/properties/active');
        // Filter out broker's own properties
        const othersProperties = activePropsRes.data.filter(p => p.broker_id !== user.id && p.owner_id !== user.id);
        setAllActiveProperties(othersProperties);
      } catch (error) {
        setAllActiveProperties([]);
      }

      // Fetch broker's agreements
      try {
        const agreementsRes = await axios.get(`http://localhost:5000/api/agreements/broker/${user.id}`);
        setAgreements(agreementsRes.data);
      } catch (error) {
        setAgreements([]);
      }
    } catch (error) {
      console.error('Error fetching agent data:', error);
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
      setShowImageUpload(true);
      alert('Property added successfully! Now upload images and documents.');
    } catch (error) {
      console.error('Error adding property:', error);
      alert('Failed to add property');
    }
  };

  const handleImageUploadComplete = () => {
    setShowImageUpload(false);
    setShowDocUpload(true);
  };

  const handleDocUploadComplete = () => {
    setShowDocUpload(false);
    setShowPreview(true);
    fetchPreviewData();
  };

  const fetchPreviewData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/property-images/property/${newPropertyId}`);
      setPreviewImages(response.data);
    } catch (error) {
      console.error('Error fetching preview:', error);
    }
  };

  const handleFinalSubmit = () => {
    setShowPreview(false);
    setShowAddProperty(false);
    setNewPropertyId(null);
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
    fetchAgentData();
    alert('Property submitted successfully! Waiting for admin approval.');
  };

  const viewProperty = (property) => {
    setSelectedProperty(property);
    setShowViewProperty(true);
  };

  const [showEditProperty, setShowEditProperty] = useState(false);
  const editProperty = (property) => {
    setSelectedProperty(property);
    setPropertyForm({
      title: property.title,
      type: property.type,
      listing_type: property.listing_type,
      price: property.price,
      location: property.location,
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      area: property.area || '',
      description: property.description || '',
      distance_to_center_km: property.distance_to_center_km || '3',
      near_school: property.near_school || false,
      near_hospital: property.near_hospital || false,
      near_market: property.near_market || false,
      parking: property.parking || false,
      security_rating: property.security_rating || '3',
      condition: property.condition || 'Good'
    });
    setShowEditProperty(true);
  };

  const handleUpdateProperty = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5000/api/properties/${selectedProperty.id}`, {
        ...propertyForm
      });
      alert('Property updated successfully!');
      setShowEditProperty(false);
      fetchAgentData();
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Failed to update property');
    }
  };

  const deleteProperty = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/properties/${propertyId}`);
      alert('Property deleted successfully');
      fetchAgentData();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  if (currentView === 'commission') {
    return (
      <CommissionTracking
        user={user}
        onLogout={onLogout}
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'browseProperties') {
    return (
      <div className="agent-dashboard">
        <PageHeader
          title="Browse Properties"
          subtitle="View active properties from other brokers and owners"
          user={user}
          onLogout={onLogout}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          }
        />
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>🏠 Active Properties (Others)</h3>
            <span>{allActiveProperties.length} properties available</span>
          </div>
          <div className="properties-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', padding: '20px' }}>
            {allActiveProperties.map(property => (
              <div key={property.id} className="property-card" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
                <div className="property-image" style={{ height: '200px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {property.main_image ? (
                    <img src={property.main_image} alt={property.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '48px' }}>🏠</span>
                  )}
                </div>
                <div style={{ padding: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>{property.title}</h4>
                  <p style={{ color: '#64748b', margin: '0 0 10px 0' }}>📍 {property.location}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                      {(property.price / 1000000).toFixed(2)}M ETB
                    </span>
                    <button 
                      className="btn-small" 
                      onClick={() => {
                        setSelectedProperty(property);
                        setShowViewProperty(true);
                      }}
                      style={{ padding: '5px 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {allActiveProperties.length === 0 && (
            <p className="no-data">No properties available from other brokers/owners</p>
          )}
        </div>
      </div>
    );
  }

  if (currentView === 'agreements') {
    const downloadAgreement = (agreement) => {
      // Create a simple agreement document
      const agreementText = `
PROPERTY AGREEMENT
==================

Agreement ID: ${agreement.id}
Property: ${agreement.property_title || `Property #${agreement.property_id}`}
Type: ${agreement.agreement_type}
Amount: ${(agreement.amount / 1000000).toFixed(2)}M ETB
Status: ${agreement.status}

Start Date: ${agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'N/A'}
End Date: ${agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'N/A'}
Created: ${new Date(agreement.created_at).toLocaleDateString()}

Terms: ${agreement.terms || 'Standard terms apply'}

---
Generated by DDREMS
      `.trim();

      const blob = new Blob([agreementText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Agreement_${agreement.id}_${agreement.property_title?.replace(/\s+/g, '_') || 'Property'}.txt`;
      link.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="agent-dashboard">
        <PageHeader
          title="My Agreements"
          subtitle="View and manage your property agreements"
          user={user}
          onLogout={onLogout}
          actions={
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>
              ← Back to Dashboard
            </button>
          }
        />
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>📄 Agreements</h3>
            <span>{agreements.length} total agreements</span>
          </div>
          
          {agreements.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📄</div>
              <h3>No Agreements Yet</h3>
              <p style={{ color: '#64748b' }}>Your property agreements will appear here</p>
            </div>
          ) : (
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gap: '20px' }}>
                {agreements.map(agreement => (
                  <div key={agreement.id} style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>
                          {agreement.property_title || `Property #${agreement.property_id}`}
                        </h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className={`listing-badge ${agreement.agreement_type}`} style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: agreement.agreement_type === 'sale' ? '#dbeafe' : '#fef3c7',
                            color: agreement.agreement_type === 'sale' ? '#1e40af' : '#92400e'
                          }}>
                            {agreement.agreement_type}
                          </span>
                          <span className={`status-badge ${agreement.status}`} style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: agreement.status === 'active' ? '#d1fae5' : 
                                       agreement.status === 'pending' ? '#fef3c7' : '#fee2e2',
                            color: agreement.status === 'active' ? '#065f46' : 
                                   agreement.status === 'pending' ? '#92400e' : '#991b1b'
                          }}>
                            {agreement.status}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                          {(agreement.amount / 1000000).toFixed(2)}M ETB
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          Agreement #{agreement.id}
                        </div>
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '15px',
                      padding: '15px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Start Date</div>
                        <div style={{ fontWeight: '600' }}>
                          {agreement.start_date ? new Date(agreement.start_date).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>End Date</div>
                        <div style={{ fontWeight: '600' }}>
                          {agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Created</div>
                        <div style={{ fontWeight: '600' }}>
                          {new Date(agreement.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Duration</div>
                        <div style={{ fontWeight: '600' }}>
                          {agreement.start_date && agreement.end_date ? 
                            Math.ceil((new Date(agreement.end_date) - new Date(agreement.start_date)) / (1000 * 60 * 60 * 24)) + ' days' : 
                            'N/A'}
                        </div>
                      </div>
                    </div>

                    {agreement.terms && (
                      <div style={{ 
                        padding: '12px', 
                        background: '#fffbeb', 
                        borderLeft: '3px solid #f59e0b',
                        borderRadius: '4px',
                        marginBottom: '15px',
                        fontSize: '14px',
                        color: '#78350f'
                      }}>
                        <strong>Terms:</strong> {agreement.terms}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => downloadAgreement(agreement)}
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 Download Agreement
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          const property = myProperties.find(p => p.id === agreement.property_id);
                          if (property) {
                            viewProperty(property);
                          } else {
                            alert('Property not found');
                          }
                        }}
                        style={{ 
                          padding: '8px 16px', 
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        👁️ View Property
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="agent-dashboard">
      <PageHeader
        title={`Welcome, ${user.name}!`}
        subtitle="Agent Dashboard - Manage your properties and track your performance"
        user={user}
        onLogout={onLogout}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentView('messages')}
            />
            <button
              className="btn-secondary"
              onClick={() => setCurrentView(currentView === 'browseProperties' ? 'dashboard' : 'browseProperties')}
            >
              🏠 Browse Properties
            </button>
            <button
              className="btn-secondary"
              onClick={() => setCurrentView(currentView === 'agreements' ? 'dashboard' : 'agreements')}
            >
              📄 Agreements
            </button>
            <button
              className={`btn-secondary ${currentView === 'inProgress' ? 'active' : ''}`}
              onClick={() => setCurrentView(currentView === 'inProgress' ? 'dashboard' : 'inProgress')}
            >
              ⏳ In Progress
            </button>
            <button className="btn-secondary" onClick={() => setCurrentView('commission')}>
              💰 Commission Tracking
            </button>
            <button className="btn-primary" onClick={() => setShowAddProperty(true)}>
              <span>➕</span> Add New Property
            </button>
          </div>

        }
      />

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card sales">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <h3>{stats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>
        <div className="stat-card rents">
          <div className="stat-icon">🏠</div>
          <div className="stat-content">
            <h3>{stats.totalRents}</h3>
            <p>Total Rents</p>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.activeListings}</h3>
            <p>Active Listings</p>
          </div>
        </div>
        <div className="stat-card commission">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>{(stats.totalCommission / 1000000).toFixed(2)}M</h3>
            <p>Total Commission (ETB)</p>
          </div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>{(stats.monthlyRevenue / 1000000).toFixed(2)}M</h3>
            <p>Monthly Revenue (ETB)</p>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pendingDeals}</h3>
            <p>Pending Deals</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* My Properties */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>🏠 My Properties</h3>
            <button className="btn-text" onClick={() => setShowAddProperty(true)}>Add New</button>
          </div>
          <div className="properties-table">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Listing</th>
                  <th>Price (ETB)</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(myProperties || [])
                  .filter(p => currentView === 'inProgress' ? (p.status === 'pending' || p.status === 'active') : true)
                  .slice(0, 10).map(property => (
                    <tr key={property.id}>
                      <td><strong>{property.title}</strong></td>
                      <td>{property.type}</td>
                      <td><span className={`listing-badge ${property.listing_type}`}>{property.listing_type}</span></td>
                      <td>{(property.price / 1000000).toFixed(2)}M</td>
                      <td>📍 {property.location}</td>
                      <td><span className={`status-badge ${property.status}`}>{property.status}</span></td>
                      <td>
                        <button className="btn-icon" title="View" onClick={() => viewProperty(property)}>👁️</button>
                        <button className="btn-icon" title="Edit" onClick={() => editProperty(property)}>✏️</button>
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

        {/* Messages */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📧 Recent Messages</h3>
          </div>
          <div className="messages-list">
            {(Array.isArray(messages) ? messages : []).length > 0 ? (Array.isArray(messages) ? messages : []).map(msg => (
              <div key={msg.id} className={`message-item ${!msg.is_read ? 'unread' : ''}`}>
                <div className="message-info">
                  <h4>{msg.subject}</h4>
                  <p>{msg.message.substring(0, 50)}...</p>
                </div>
                {!msg.is_read && <span className="unread-dot"></span>}
              </div>
            )) : (
              <p className="no-data">No messages</p>
            )}
          </div>
        </div>

        {/* Announcements */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>📢 Announcements</h3>
          </div>
          <div className="announcements-grid">
            {(announcements || []).length > 0 ? (announcements || []).map(announcement => (
              <div key={announcement.id} className="announcement-card">
                <span className={`priority-badge ${announcement.priority}`}>{announcement.priority}</span>
                <h4>{announcement.title}</h4>
                <p>{announcement.content.substring(0, 100)}...</p>
              </div>
            )) : (
              <p className="no-data">No announcements</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Property Modal */}
      {showAddProperty && !showImageUpload && !showDocUpload && (
        <div className="modal-overlay" onClick={() => setShowAddProperty(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Add New Property</h2>
              <button className="close-btn" onClick={() => setShowAddProperty(false)}>✕</button>
            </div>
            <form onSubmit={handleAddProperty}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Property Title *</label>
                  <input
                    type="text"
                    value={propertyForm.title}
                    onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })}
                    required
                    placeholder="e.g., Modern Villa in Kezira"
                  />
                </div>
                <div className="form-group">
                  <label>Property Type *</label>
                  <select
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
                    required
                  >
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="house">House</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Listing Type *</label>
                  <select
                    value={propertyForm.listing_type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, listing_type: e.target.value })}
                    required
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (ETB) *</label>
                  <input
                    type="number"
                    value={propertyForm.price}
                    onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                    required
                    placeholder="e.g., 8500000"
                  />
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={propertyForm.location}
                    onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                    required
                    placeholder="e.g., Kezira, Dire Dawa"
                  />
                </div>
                <div className="form-group">
                  <label>Bedrooms</label>
                  <input
                    type="number"
                    value={propertyForm.bedrooms}
                    onChange={(e) => setPropertyForm({ ...propertyForm, bedrooms: e.target.value })}
                    placeholder="e.g., 3"
                  />
                </div>
                <div className="form-group">
                  <label>Distance to Center (km)</label>
                  <input
                    type="number"
                    value={propertyForm.distance_to_center_km}
                    onChange={(e) => setPropertyForm({ ...propertyForm, distance_to_center_km: e.target.value })}
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div className="form-group">
                  <label>Security Rating (1-5)</label>
                  <select
                    value={propertyForm.security_rating}
                    onChange={(e) => setPropertyForm({ ...propertyForm, security_rating: e.target.value })}
                  >
                    <option value="1">1 - Basic</option>
                    <option value="2">2 - Moderate</option>
                    <option value="3">3 - Good</option>
                    <option value="4">4 - High</option>
                    <option value="5">5 - Elite</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={propertyForm.condition}
                    onChange={(e) => setPropertyForm({ ...propertyForm, condition: e.target.value })}
                  >
                    <option value="New">New</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Work">Needs Work</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.near_school}
                      onChange={(e) => setPropertyForm({ ...propertyForm, near_school: e.target.checked })}
                    /> Near School
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.near_hospital}
                      onChange={(e) => setPropertyForm({ ...propertyForm, near_hospital: e.target.checked })}
                    /> Near Hospital
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.near_market}
                      onChange={(e) => setPropertyForm({ ...propertyForm, near_market: e.target.checked })}
                    /> Near Market
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.parking}
                      onChange={(e) => setPropertyForm({ ...propertyForm, parking: e.target.checked })}
                    /> Parking Available
                  </label>
                </div>
                <div className="form-group">
                  <label>Bathrooms</label>
                  <input
                    type="number"
                    value={propertyForm.bathrooms}
                    onChange={(e) => setPropertyForm({ ...propertyForm, bathrooms: e.target.value })}
                    placeholder="e.g., 2"
                  />
                </div>
                <div className="form-group">
                  <label>Area (m²)</label>
                  <input
                    type="number"
                    value={propertyForm.area}
                    onChange={(e) => setPropertyForm({ ...propertyForm, area: e.target.value })}
                    placeholder="e.g., 250"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                  rows="4"
                  placeholder="Enter property description..."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddProperty(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Next: Upload Images →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUpload && newPropertyId && (
        <div className="modal-overlay">
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📷 Upload Property Images</h2>
            </div>
            <div className="modal-body">
              <ImageUploader
                propertyId={newPropertyId}
                uploadedBy={user.id}
                onUploadComplete={handleImageUploadComplete}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleImageUploadComplete}>
                Skip Images
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocUpload && newPropertyId && (
        <div className="modal-overlay">
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Upload Property Documents</h2>
            </div>
            <div className="modal-body">
              <DocumentUploader
                propertyId={newPropertyId}
                uploadedBy={user.id}
                onUploadComplete={handleDocUploadComplete}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-primary" onClick={handleDocUploadComplete}>
                Next: Preview & Submit →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview & Submit Modal */}
      {showPreview && newPropertyId && (
        <div className="modal-overlay">
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ Preview Your Property Listing</h2>
            </div>
            <div className="modal-body">
              <div className="preview-grid">
                <div className="preview-section full-width">
                  <h3>📷 Property Images ({previewImages.length})</h3>
                  {previewImages.length > 0 ? (
                    <div className="preview-images">
                      {previewImages.map(img => (
                        <img key={img.id} src={img.image_url} alt="Property" />
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">No images uploaded</p>
                  )}
                </div>
                <div className="preview-section">
                  <h3>ℹ️ Property Details</h3>
                  <div className="preview-details">
                    <p><strong>Title:</strong> {propertyForm.title}</p>
                    <p><strong>Type:</strong> {propertyForm.type}</p>
                    <p><strong>Listing:</strong> {propertyForm.listing_type}</p>
                    <p><strong>Price:</strong> {(propertyForm.price / 1000000).toFixed(2)}M ETB</p>
                    <p><strong>Location:</strong> {propertyForm.location}</p>
                    <p><strong>Bedrooms:</strong> {propertyForm.bedrooms || 'N/A'}</p>
                    <p><strong>Bathrooms:</strong> {propertyForm.bathrooms || 'N/A'}</p>
                    <p><strong>Area:</strong> {propertyForm.area || 'N/A'} m²</p>
                  </div>
                  {propertyForm.description && (
                    <div className="preview-description">
                      <strong>Description:</strong>
                      <p>{propertyForm.description}</p>
                    </div>
                  )}

                  <div style={{ marginTop: '20px' }}>
                    <AIPriceComparison propertyData={propertyForm} />
                  </div>
                </div>
                <div className="preview-section">
                  <h3>📋 Status</h3>
                  <div className="preview-status">
                    <p>✅ Property details saved</p>
                    <p>✅ Images uploaded ({previewImages.length})</p>
                    <p>✅ Documents uploaded</p>
                    <p>⏳ Pending admin approval</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPreview(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleFinalSubmit}>
                ✅ Submit Property for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditProperty && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowEditProperty(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Edit Property: {selectedProperty.title}</h2>
              <button className="close-btn" onClick={() => setShowEditProperty(false)}>✕</button>
            </div>
            <form onSubmit={handleUpdateProperty}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Property Title *</label>
                  <input
                    type="text"
                    value={propertyForm.title}
                    onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Property Type *</label>
                  <select
                    value={propertyForm.type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
                    required
                  >
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="house">House</option>
                    <option value="land">Land</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Listing Type *</label>
                  <select
                    value={propertyForm.listing_type}
                    onChange={(e) => setPropertyForm({ ...propertyForm, listing_type: e.target.value })}
                    required
                  >
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (ETB) *</label>
                  <input
                    type="number"
                    value={propertyForm.price}
                    onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={propertyForm.location}
                    onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Distance to Center (km)</label>
                  <input
                    type="number"
                    value={propertyForm.distance_to_center_km}
                    onChange={(e) => setPropertyForm({ ...propertyForm, distance_to_center_km: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Security Rating (1-5)</label>
                  <select
                    value={propertyForm.security_rating}
                    onChange={(e) => setPropertyForm({ ...propertyForm, security_rating: e.target.value })}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={propertyForm.condition}
                    onChange={(e) => setPropertyForm({ ...propertyForm, condition: e.target.value })}
                  >
                    <option value="New">New</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Work">Needs Work</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.near_school}
                      onChange={(e) => setPropertyForm({ ...propertyForm, near_school: e.target.checked })}
                    /> Near School
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.near_hospital}
                      onChange={(e) => setPropertyForm({ ...propertyForm, near_hospital: e.target.checked })}
                    /> Near Hospital
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.near_market}
                      onChange={(e) => setPropertyForm({ ...propertyForm, near_market: e.target.checked })}
                    /> Near Market
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={propertyForm.parking}
                      onChange={(e) => setPropertyForm({ ...propertyForm, parking: e.target.checked })}
                    /> Parking
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={propertyForm.description}
                  onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                  rows="4"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditProperty(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Property
                </button>
              </div>
            </form>
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
                <div className="property-view-section">
                  <h3>📷 Images</h3>
                  <ImageGallery
                    propertyId={selectedProperty.id}
                    canDelete={true}
                    onDelete={fetchAgentData}
                  />
                </div>
                <div className="property-view-section">
                  <h3>📄 Documents</h3>
                  <DocumentManager
                    propertyId={selectedProperty.id}
                    uploadedBy={user.id}
                  />
                </div>
                <div className="property-view-section full-width">
                  <h3>ℹ️ Property Details</h3>
                  <div className="property-details-grid">
                    <div><strong>Type:</strong> {selectedProperty.type}</div>
                    <div><strong>Listing:</strong> {selectedProperty.listing_type}</div>
                    <div><strong>Price:</strong> {(selectedProperty.price / 1000000).toFixed(2)}M ETB</div>
                    <div><strong>Location:</strong> {selectedProperty.location}</div>
                    <div><strong>Bedrooms:</strong> {selectedProperty.bedrooms || 'N/A'}</div>
                    <div><strong>Bathrooms:</strong> {selectedProperty.bathrooms || 'N/A'}</div>
                    <div><strong>Area:</strong> {selectedProperty.area || 'N/A'} m²</div>
                    <div><strong>Status:</strong> <span className={`status-badge ${selectedProperty.status}`}>{selectedProperty.status}</span></div>
                  </div>
                  {selectedProperty.description && (
                    <div className="property-description">
                      <strong>Description:</strong>
                      <p>{selectedProperty.description}</p>
                    </div>
                  )}
                  <div style={{ marginTop: '20px' }}>
                    <AIPriceComparison propertyData={selectedProperty} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentDashboardEnhanced;
