import React, { useState, useEffect } from 'react';
import './CustomerDashboard.css';
import DashboardHeader from './DashboardHeader';
import DocumentViewer from './shared/DocumentViewer';
import ImageGallery from './shared/ImageGallery';
import MessageNotificationWidget from './MessageNotificationWidget';
import AgreementManagement from './AgreementManagement';
import PropertyMap from './shared/PropertyMap';
import Property3DViewer from './shared/Property3DViewer';
import axios from 'axios';

const CustomerDashboardEnhanced = ({ user, onLogout, setCurrentPage }) => {
  const [favorites, setFavorites] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [active3DProperty, setActive3DProperty] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [profileStatus, setProfileStatus] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [recentViews, setRecentViews] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 5,
    comment: ''
  });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyData, setReplyData] = useState({
    receiver_id: '',
    subject: '',
    message: '',
    parent_id: null
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideStep, setGuideStep] = useState(1);
  const [guidePrefs, setGuidePrefs] = useState({
    location: '',
    propertyType: 'apartment',
    minPrice: '',
    maxPrice: '',
    bedrooms: ''
  });
  const [guideResults, setGuideResults] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [documentPropertyId, setDocumentPropertyId] = useState(null);
  const [agreementRequests, setAgreementRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAgreementManagement, setShowAgreementManagement] = useState(false);
  const [showAgreementFlowModal, setShowAgreementFlowModal] = useState(false);
  const [agreementFlowPropertyId, setAgreementFlowPropertyId] = useState(null);

  useEffect(() => {
    fetchCustomerData();
    const intervalId = setInterval(fetchCustomerData, 10000); // Poll every 10 seconds
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Fetch profile status
      const profileRes = await axios.get(`http://${window.location.hostname}:5000/api/profiles/customer/${user.id}`);
      setCustomerProfile(profileRes.data);
      setProfileStatus(profileRes.data.profile_status);

      // Fetch ONLY ACTIVE properties
      const propertiesRes = await axios.get(`http://${window.location.hostname}:5000/api/properties/active`);
      setAllProperties(propertiesRes.data);

      // Fetch favorites
      try {
        const favoritesRes = await axios.get(`http://${window.location.hostname}:5000/api/favorites/${user.id}`);
        setFavorites(favoritesRes.data);
      } catch (error) {
        setFavorites([]);
      }

      // Fetch recent views
      try {
        const viewsRes = await axios.get(`http://${window.location.hostname}:5000/api/property-views/user/${user.id}`);
        setRecentViews(viewsRes.data);
      } catch (error) {
        setRecentViews([]);
      }

      try {
        const messagesRes = await axios.get(`http://${window.location.hostname}:5000/api/messages/user/${user.id}`);
        setMessages(messagesRes.data);
      } catch (error) {
        setMessages([]);
      }

      // Fetch announcements
      try {
        const announcementsRes = await axios.get(`http://${window.location.hostname}:5000/api/announcements`);
        setAnnouncements(announcementsRes.data);
      } catch (error) {
        setAnnouncements([]);
      }

      // Fetch Agreement Requests
      try {
        const [agreementsRes, notificationsRes] = await Promise.all([
          axios.get(`http://${window.location.hostname}:5000/api/agreement-requests/customer/${user.id}`),
          axios.get(`http://${window.location.hostname}:5000/api/notifications/${user.id}`)
        ]);
        
        setAgreementRequests(agreementsRes.data);
        setNotifications(notificationsRes.data);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setAgreementRequests([]);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }

  };

  const addToFavorites = async (propertyId) => {
    try {
      await axios.post(`http://${window.location.hostname}:5000/api/favorites`, {
        user_id: user.id,
        property_id: propertyId
      });
      alert('Added to favorites!');
      fetchCustomerData();
    } catch (error) {
      console.error('Error adding to favorites:', error);
      alert('Failed to add to favorites');
    }
  };

  const removeFavorite = async (propertyId) => {
    try {
      await axios.delete(`http://${window.location.hostname}:5000/api/favorites/${user.id}/${propertyId}`);
      alert('Removed from favorites');
      fetchCustomerData();
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert('Failed to remove favorite');
    }
  };

  const viewProperty = async (property) => {
    setSelectedProperty(property);
    setShowPropertyModal(true);

    // Record property view
    try {
      await axios.post(`http://${window.location.hostname}:5000/api/property-views`, {
        user_id: user.id,
        property_id: property.id
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const viewDocuments = (propertyId) => {
    setDocumentPropertyId(propertyId);
    setShowDocumentViewer(true);
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://${window.location.hostname}:5000/api/feedback`, {
        user_id: user.id,
        property_id: selectedProperty?.id,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment
      });
      alert('Feedback submitted successfully!');
      setShowFeedbackModal(false);
      setFeedbackForm({ rating: 5, comment: '' });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback');
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await axios.put(`http://${window.location.hostname}:5000/api/messages/read/${messageId}`);
      fetchCustomerData();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const openReplyModal = (msg) => {
    setReplyData({
      receiver_id: msg.sender_id,
      subject: `Re: ${msg.subject}`,
      message: '',
      parent_id: msg.id
    });
    setShowReplyModal(true);
  };

  const handleReply = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://${window.location.hostname}:5000/api/messages`, {
        sender_id: user.id,
        ...replyData
      });
      alert('Reply sent successfully!');
      setShowReplyModal(false);
      setReplyData({ receiver_id: '', subject: '', message: '', parent_id: null });
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    }
  };


  const isFavorite = (propertyId) => {
    return favorites.some(fav => fav.property_id === propertyId);
  };
  const handleGuideSubmit = (e) => {
    e.preventDefault();
    const recommendations = allProperties.filter(p => {
      const matchLoc = !guidePrefs.location || p.location.toLowerCase().includes(guidePrefs.location.toLowerCase());
      const matchType = p.type === guidePrefs.propertyType;
      const price = parseInt(p.price);
      const matchMin = !guidePrefs.minPrice || price >= parseInt(guidePrefs.minPrice);
      const matchMax = !guidePrefs.maxPrice || price <= parseInt(guidePrefs.maxPrice);
      const matchBed = !guidePrefs.bedrooms || p.bedrooms >= parseInt(guidePrefs.bedrooms);
      return matchLoc && matchType && matchMin && matchMax && matchBed;
    });
    setGuideResults(recommendations.slice(0, 5));
    setGuideStep(2);
  };

  const hasAgreement = (propertyId) => {
    return (agreementRequests || []).some(req => req.property_id === propertyId);
  };

  if (isInitialLoad) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏳</div>
        <h3 style={{ color: '#475569' }}>Loading Dashboard...</h3>
      </div>
    );
  }

  return (
    <div className="customer-dashboard">
      <DashboardHeader
        user={user}
        onLogout={onLogout}
        dashboardTitle="🏠 Customer Dashboard"
        onSettingsClick={() => setCurrentPage && setCurrentPage('settings')}
      />

      <div style={{ padding: '0 30px', marginTop: '20px' }}>
        {profileStatus === 'pending' && (
          <div className="alert alert-info">
            ⏳ Your profile is <strong>pending approval</strong>. You will have full access to property details once approved.
          </div>
        )}
        {profileStatus === 'rejected' && (
          <div className="alert alert-danger" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <strong>❌ Profile Rejected</strong>
              <p style={{ margin: '5px 0 0 0' }}>{customerProfile?.rejection_reason || 'Please review your info and resubmit.'}</p>
            </div>
            <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setCurrentPage('profile')}>Update Profile</button>
          </div>
        )}
      </div>

      {profileStatus !== 'approved' && (
        <div className="profile-gate" style={{ padding: '40px 20px', textAlign: 'center', background: 'white', borderRadius: '15px', margin: '20px 30px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔐</div>
          <h3>Profile Approval Required</h3>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>Complete your profile and wait for admin approval to view property details and request access.</p>
          <button className="btn-primary" onClick={() => setCurrentPage('profile')}>Go to Profile</button>
        </div>
      )}

      {profileStatus === 'approved' && (
        <>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto', marginBottom: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginLeft: '10px', marginRight: '10px' }}>
        <MessageNotificationWidget 
          userId={user?.id}
          onNavigateToMessages={() => setCurrentPage('messages')}
        />
        <button onClick={() => setCurrentPage('agreements')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>🤝 Agreements</button>
        <button onClick={() => setShowAgreementManagement(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>📋 Management</button>
          <button onClick={() => setShowGuideModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤖 AI Guide</button>
        <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>💬 Give Feedback</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>❤️</div>
          <div className="stat-content">
            <h3>{favorites.length}</h3>
            <p>Favorites</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}>👁️</div>
          <div className="stat-content">
            <h3>{recentViews.length}</h3>
            <p>Viewed Properties</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#d1fae5', color: '#10b981' }}>🏠</div>
          <div className="stat-content">
            <h3>{allProperties.length}</h3>
            <p>Available Properties</p>
          </div>
        </div>
        <div className="stat-card clickable" onClick={() => setCurrentPage('messages')}>
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>📧</div>
          <div className="stat-content">
            <h3>{(Array.isArray(messages) ? messages : []).filter(m => !m.is_read).length}</h3>
            <p>Unread Messages</p>
          </div>
        </div>
      </div>

      {/* Completed Agreements with Handshake */}
      {agreementRequests.filter(a => a.status === 'completed' || a.status === 'payment_confirmed' || a.status === 'handover_confirmed').length > 0 && (
        <div className="dashboard-card full-width" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🤝</span> Completed Agreements
            </h3>
            <button className="btn-text" onClick={() => setCurrentPage('agreements')}>View All</button>
          </div>
          <div style={{ display: 'grid', gap: '12px', padding: '10px 0' }}>
            {agreementRequests
              .filter(a => a.status === 'completed' || a.status === 'payment_confirmed' || a.status === 'handover_confirmed')
              .map(agreement => (
              <div key={agreement.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                borderRadius: '12px',
                border: '1px solid #a7f3d0',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', color: '#fff', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}>✓</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#064e3b' }}>
                      {agreement.property_title || 'Property Agreement'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      {agreement.property_location || 'Completed'} • {new Date(agreement.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: '#fff', padding: '8px 16px',
                  borderRadius: '24px', border: '2px solid #10b981',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
                }}>
                  <span style={{ fontSize: '22px' }}>🤝</span>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#059669', letterSpacing: '0.5px' }}>COMPLETED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="dashboard-grid">
        <div className="dashboard-card" style={{ padding: '16px' }}>
          <h3>🔔 Notifications</h3>
          <p style={{ marginBottom: '10px' }}>Unread: {notifications.filter(n => !n.is_read).length}</p>
          {notifications.slice(0, 4).map(note => (
            <div key={note.id} style={{ border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', marginBottom: '8px', background: note.is_read ? '#f8fafc' : '#e0f2fe' }}>
              <div style={{ fontWeight: 'bold' }}>{note.title}</div>
              <div style={{ fontSize: '13px', color: '#475569' }}>{note.message}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(note.created_at).toLocaleString()}</div>
            </div>
          ))}
          {notifications.length === 0 && <div>No notifications yet.</div>}
        </div>
      </div>

      <div className="dashboard-grid">
        {/* My Favorites */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>❤️ My Favorites</h3>
            <button className="btn-text">View All</button>
          </div>

          <div className="favorites-grid">
            {favorites.length > 0 ? favorites.slice(0, 4).map(fav => (
              <div key={fav.id} className="favorite-card">
                <div className="favorite-image">
                    {fav.main_image && !imageErrors[`fav_${fav.id}`] ? (
                      <img
                        src={fav.main_image}
                        alt={fav.property_title}
                        onClick={() => {
                          const property = allProperties.find(p => p.id === fav.property_id);
                          if (property) viewProperty(property);
                        }}
                        style={{ cursor: 'pointer' }}
                        title="Click to view details"
                        onError={() => setImageErrors(prev => ({ ...prev, [`fav_${fav.id}`]: true }))}
                      />
                    ) : (
                      <div 
                        style={{ width: '100%', height: '200px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', cursor: 'pointer' }}
                        onClick={() => {
                          const property = allProperties.find(p => p.id === fav.property_id);
                          if (property) viewProperty(property);
                        }}
                        title="Click to view details"
                      >🏠 No Image</div>
                    )}
                  <button className="remove-favorite" onClick={() => removeFavorite(fav.property_id)}>
                    ❌
                  </button>
                </div>
                <div className="favorite-content">
                  <h4>{fav.property_title}</h4>
                  <p>📍 {fav.property_location}</p>
                  <div className="favorite-footer">
                    <span className="price">{(fav.property_price / 1000000).toFixed(2)}M ETB</span>
                    <button className="btn-small" onClick={() => {
                      const property = allProperties.find(p => p.id === fav.property_id);
                      if (property) viewProperty(property);
                    }}>View</button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="empty-state">
                <div className="empty-icon">❤️</div>
                <p>No favorites yet</p>
                <span>Browse properties and add them to favorites</span>
              </div>
            )}
          </div>
        </div>

        {/* Browse Active Properties */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>🏠 Browse Properties (Active Listings)</h3>
            <select className="filter-select">
              <option>All Types</option>
              <option>Villa</option>
              <option>Apartment</option>
              <option>House</option>
              <option>Land</option>
              <option>Commercial</option>
            </select>
          </div>
          <div className="properties-grid">
            {allProperties.slice(0, 6).map(property => (
              <div key={property.id} className="property-card">
                <div className="property-image">
                  {property.main_image && !imageErrors[`prop_${property.id}`] ? (
                    <img
                      src={property.main_image}
                      alt={property.title}
                      onClick={() => viewProperty(property)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view details"
                      onError={() => setImageErrors(prev => ({ ...prev, [`prop_${property.id}`]: true }))}
                    />
                  ) : (
                    <div 
                      style={{ width: '100%', height: '200px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', cursor: 'pointer' }}
                      onClick={() => viewProperty(property)}
                      title="Click to view details"
                    >🏠 No Image</div>
                  )}
                  <button
                    className={`favorite-btn ${isFavorite(property.id) ? 'active' : ''}`}
                    onClick={() => isFavorite(property.id) ? removeFavorite(property.id) : addToFavorites(property.id)}
                  >
                    {isFavorite(property.id) ? '❤️' : '🤍'}
                  </button>
                  <span className="property-badge">{property.listing_type}</span>
                </div>
                <div className="property-content">
                  <h4>{property.title}</h4>
                  <p>📍 {property.location}</p>
                  <div className="property-specs">
                    {property.bedrooms && <span>🛏️ {property.bedrooms}</span>}
                    {property.bathrooms && <span>🚿 {property.bathrooms}</span>}
                    {property.area && <span>📐 {property.area}m²</span>}
                  </div>
                  <div className="property-footer">
                    <span className="price">{(property.price / 1000000).toFixed(2)}M ETB</span>
                    <div className="property-actions">
                      <button className="btn-view" onClick={() => viewProperty(property)}>
                        View Details
                      </button>
                      <button className="btn-documents" onClick={() => viewDocuments(property.id)}>
                        📄 Documents
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Viewed */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>🕐 Recently Viewed Properties</h3>
          </div>
          <div className="recent-views-grid">
            {recentViews.length > 0 ? recentViews.slice(0, 6).map(view => (
              <div key={view.id} className="recent-view-card">
                <div className="recent-view-image">
                  {view.main_image && !imageErrors[`view_${view.id}`] ? (
                    <img
                      src={view.main_image}
                      alt={view.property_title}
                      onClick={() => {
                        const property = allProperties.find(p => p.id === view.property_id);
                        if (property) viewProperty(property);
                      }}
                      style={{ cursor: 'pointer' }}
                      title="Click to view details"
                      onError={() => setImageErrors(prev => ({ ...prev, [`view_${view.id}`]: true }))}
                    />
                  ) : (
                    <div 
                      style={{ width: '100%', height: '120px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '24px', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => {
                        const property = allProperties.find(p => p.id === view.property_id);
                        if (property) viewProperty(property);
                      }}
                      title="Click to view details"
                    >🏠</div>
                  )}
                  <button
                    className="view-icon-btn"
                    onClick={() => {
                      const property = allProperties.find(p => p.id === view.property_id);
                      if (property) viewProperty(property);
                    }}
                    title="View Property"
                  >
                    👁️
                  </button>
                </div>
                <div className="recent-view-content">
                  <h4>{view.property_title}</h4>
                  <p>📍 {view.property_location}</p>
                  <span className="view-time">{new Date(view.viewed_at).toLocaleDateString()}</span>
                </div>
              </div>
            )) : (
              <div className="empty-state">
                <div className="empty-icon">🕐</div>
                <p>No recently viewed properties</p>
                <span>Browse properties to see them here</span>
              </div>
            )}
          </div>
        </div>

        {/* Announcements Section */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>📢 Latest Announcements</h3>
            <button className="btn-text">View All</button>
          </div>
          <div className="announcements-grid">
            {announcements.length > 0 ? announcements.map(ann => (
              <div key={ann.id} className={`announcement-card ${ann.priority}`}>
                <div className="ann-header">
                  <span className="priority-dot"></span>
                  <h4>{ann.title}</h4>
                  <span className="ann-date">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <p>{ann.content}</p>
              </div>
            )) : (
              <p className="no-data">No active announcements</p>
            )}
          </div>
        </div>

        {/* Most Viewed / Recommendations */}
        <div className="dashboard-card full-width">
          <div className="card-header">
            <h3>📈 Most Viewed Properties</h3>
          </div>
          <div className="properties-grid">
            {allProperties
              .sort((a, b) => (b.views || 0) - (a.views || 0))
              .slice(0, 4)
              .map(property => (
                <div key={property.id} className="property-card mini">
                  <div className="property-image">
                    <img src={property.main_image || '/placeholder.jpg'} alt={property.title} onClick={() => viewProperty(property)} style={{ cursor: 'pointer' }} title="Click to view details" />
                    <span className="view-count">👁️ {property.views || 0}</span>
                  </div>
                  <div className="property-content">
                    <h4>{property.title}</h4>
                    <p>{(property.price / 1000000).toFixed(2)}M ETB</p>
                    <button className="btn-view-small" onClick={() => viewProperty(property)}>View</button>
                  </div>
                </div>
              ))}
          </div>
      </div>
    </div>
  </>
)}

      {/* Property View Modal */}
      {showPropertyModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowPropertyModal(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🏠 {selectedProperty.title}</h2>
              <button className="close-btn" onClick={() => setShowPropertyModal(false)}>✕</button>
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

                  {/* 3D Property Viewer Button */}
                  {selectedProperty.model_3d_path && (
                    <div className="3d-viewer-cta" style={{ marginTop: '20px', padding: '15px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="cta-content">
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>🌐 Virtual 3D Tour Available</div>
                        <div style={{ fontSize: '12px', opacity: 0.9 }}>Explore this property in an interactive 3D environment.</div>
                      </div>
                      <button 
                        className="btn-primary" 
                        style={{ background: 'white', color: '#667eea', fontWeight: 'bold' }}
                        onClick={() => {
                          setActive3DProperty(selectedProperty);
                          setShow3DViewer(true);
                        }}
                      >
                        Launch 3D Viewer
                      </button>
                    </div>
                  )}


                  {/* Property Location Map */}
                  {(selectedProperty.latitude || selectedProperty.longitude) && (
                    <div style={{ marginTop: '20px' }}>
                      <h3>📍 Property Location</h3>
                      <PropertyMap 
                        latitude={selectedProperty.latitude} 
                        longitude={selectedProperty.longitude} 
                        title={selectedProperty.title} 
                      />
                    </div>
                  )}

                  {/* AI Price Analysis Integration */}
                  <div className="ai-analysis-container" style={{ marginTop: '20px' }}>
                    
                  </div>
                </div>

                <div className="property-view-section">
                  <h3>📄 Property Documents</h3>
                  <DocumentViewer
                    propertyId={selectedProperty.id}
                    userId={user.id}
                  />

                  {/* Relocated Request Buttons */}
                  <div className="relocated-actions" style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    borderTop: '1px solid #e2e8f0', 
                    display: 'flex', 
                    flexWrap: 'wrap',
                    gap: '12px',
                    background: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    <button
                      className={`btn-favorite ${isFavorite(selectedProperty.id) ? 'active' : ''}`}
                      onClick={() => isFavorite(selectedProperty.id) ? removeFavorite(selectedProperty.id) : addToFavorites(selectedProperty.id)}
                    >
                      {isFavorite(selectedProperty.id) ? '❤️ Remove from Favorites' : '🤍 Add to Favorites'}
                    </button>

                    {!hasAgreement(selectedProperty.id) && (
                      <button
                        className="btn-success"
                        onClick={() => {
                          setAgreementFlowPropertyId(selectedProperty.id);
                          setShowPropertyModal(false);
                          setShowAgreementFlowModal(true);
                        }}
                      >
                        🤝 Request Agreement
                      </button>
                    )}

                    {hasAgreement(selectedProperty.id) && (
                      <button className="btn-secondary" disabled style={{ opacity: 0.7 }}>
                        📄 Agreement Requested
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessagesModal && (
        <div className="modal-overlay" onClick={() => setShowMessagesModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📧 My Messages</h2>
              <button className="close-btn" onClick={() => setShowMessagesModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="messages-full-list">
                {(Array.isArray(messages) ? messages : []).length > 0 ? (Array.isArray(messages) ? messages : []).map(msg => (
                  <div
                    key={msg.id}
                    className={`message-card ${!msg.is_read ? 'unread' : ''}`}
                    onClick={() => markMessageAsRead(msg.id)}
                  >
                    <div className="message-header">
                      <h4>{msg.subject}</h4>
                      <div className="message-meta">
                        <span className="message-date">{new Date(msg.created_at).toLocaleString()}</span>
                        <button
                          className="btn-reply-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            openReplyModal(msg);
                          }}
                        >
                          ↩️ Reply
                        </button>
                      </div>
                    </div>
                    <p className="message-body">{msg.message}</p>
                    {!msg.is_read && <span className="unread-badge">New</span>}

                  </div>
                )) : (
                  <div className="empty-state">
                    <div className="empty-icon">📧</div>
                    <p>No messages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💬 Give Feedback</h2>
              <button className="close-btn" onClick={() => setShowFeedbackModal(false)}>✕</button>
            </div>
            <form onSubmit={submitFeedback}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Rating</label>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`star ${star <= feedbackForm.rating ? 'active' : ''}`}
                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Your Feedback</label>
                  <textarea
                    value={feedbackForm.comment}
                    onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                    rows="6"
                    placeholder="Share your experience with our service..."
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Reply Modal */}
      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 Reply to Message</h2>
              <button className="close-btn" onClick={() => setShowReplyModal(false)}>✕</button>
            </div>
            <form onSubmit={handleReply}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Subject</label>
                  <input type="text" value={replyData.subject} readOnly className="read-only-input" />
                </div>
                <div className="form-group">
                  <label>Your Message</label>
                  <textarea
                    value={replyData.message}
                    onChange={(e) => setReplyData({ ...replyData, message: e.target.value })}
                    rows="6"
                    required
                    placeholder="Type your reply..."
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowReplyModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Send Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {showDocumentViewer && (
        <div className="modal-overlay" onClick={() => setShowDocumentViewer(false)}>
          <div className="modal-content document-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📄 Property Documents</h2>
              <button className="close-btn" onClick={() => setShowDocumentViewer(false)}>✕</button>
            </div>
            <div className="modal-body">
              <DocumentViewer propertyId={documentPropertyId} userId={user.id} />
            </div>
          </div>
        </div>
      )}

      {/* AI Guide Modal */}
      {showGuideModal && (
        <div className="modal-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()} style={{ background: '#f8fafc' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: '#3b82f6', borderRadius: '12px', fontSize: '24px' }}>🤖</div>
                <div>
                  <h2 style={{ margin: 0 }}>AI Property Guide</h2>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Let our AI help you find your dream home</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowGuideModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '30px' }}>
              {guideStep === 1 ? (
                <form onSubmit={handleGuideSubmit}>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Preferred Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Kezira, Addis Ababa"
                        value={guidePrefs.location}
                        onChange={(e) => setGuidePrefs({ ...guidePrefs, location: e.target.value })}
                        style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Property Type</label>
                      <select 
                        value={guidePrefs.propertyType}
                        onChange={(e) => setGuidePrefs({ ...guidePrefs, propertyType: e.target.value })}
                        style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      >
                        <option value="apartment">Apartment</option>
                        <option value="house">House</option>
                        <option value="villa">Villa</option>
                        <option value="shop">Shop</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Min Price (ETB)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 500000"
                        value={guidePrefs.minPrice}
                        onChange={(e) => setGuidePrefs({ ...guidePrefs, minPrice: e.target.value })}
                        style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Max Price (ETB)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 10000000"
                        value={guidePrefs.maxPrice}
                        onChange={(e) => setGuidePrefs({ ...guidePrefs, maxPrice: e.target.value })}
                        style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>Minimum Bedrooms</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 2"
                        value={guidePrefs.bedrooms}
                        onChange={(e) => setGuidePrefs({ ...guidePrefs, bedrooms: e.target.value })}
                        style={{ padding: '12px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '30px', textAlign: 'right' }}>
                    <button type="submit" className="btn-primary" style={{ padding: '12px 30px', fontSize: '16px', fontWeight: 'bold' }}>
                      Get Recommendations →
                    </button>
                  </div>
                </form>
              ) : (
                <div className="guide-results">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>✨ AI Recommended Properties</h3>
                    <button className="btn-text" onClick={() => setGuideStep(1)}>← Change Criteria</button>
                  </div>
                  
                  {guideResults.length > 0 ? (
                    <div className="results-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {guideResults.map(p => (
                        <div key={p.id} className="result-card" style={{ 
                          display: 'flex', gap: '15px', padding: '15px', background: 'white', 
                          borderRadius: '12px', cursor: 'pointer', border: '1px solid #e2e8f0',
                          transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }} onClick={() => { setShowGuideModal(false); viewProperty(p); }}>
                          <img src={p.main_image || '/placeholder.jpg'} alt={p.title} style={{ width: '100px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{p.title}</h4>
                            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#64748b' }}>📍 {p.location}</p>
                            <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{(p.price / 1000000).toFixed(2)}M ETB</span>
                          </div>
                          <div style={{ alignSelf: 'center' }}>
                            <button className="btn-view-small">View</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state" style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '15px' }}>🔍</div>
                      <h4>No exact matches found</h4>
                      <p>Try broadening your criteria for more results.</p>
                      <button className="btn-secondary" onClick={() => setGuideStep(1)}>Adjust Preferences</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Agreement Management Modal */}
      {showAgreementManagement && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{ background: '#f8fafc', borderRadius: '16px', width: '95%', maxWidth: '1400px', height: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button onClick={() => setShowAgreementManagement(false)} style={{ position: 'absolute', top: 20, right: 20, background: '#e2e8f0', color: '#475569', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#cbd5e1'; e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}>✕</button>
            <AgreementManagement user={user} />
          </div>
        </div>
      )}
      {/* Property 3D Viewer Modal */}
      {show3DViewer && active3DProperty && (
        <Property3DViewer
          property={active3DProperty}
          onClose={() => {
            setShow3DViewer(false);
            setActive3DProperty(null);
          }}
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
                  setShowPropertyModal(false);
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
                  setShowPropertyModal(false);
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
    </div>
  );
};


export default CustomerDashboardEnhanced;
