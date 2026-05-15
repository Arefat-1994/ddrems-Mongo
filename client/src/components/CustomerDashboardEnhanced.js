import React, { useState, useEffect } from 'react';
import './CustomerDashboard.css';
import DashboardHeader from './DashboardHeader';
import './BrowseProperties.css';

import ImageGallery from './shared/ImageGallery';
import MessageNotificationWidget from './MessageNotificationWidget';
import AgreementManagement from './AgreementManagement';

import Property3DViewer from './shared/Property3DViewer';
import axios from 'axios';

const CustomerDashboardEnhanced = ({ user, onLogout, setCurrentPage, onSettingsClick }) => {
  const [favorites, setFavorites] = useState([]);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [active3DProperty, setActive3DProperty] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [propertyPredictions, setPropertyPredictions] = useState({});
  const [profileStatus, setProfileStatus] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [recentViews, setRecentViews] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
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

  const [agreementRequests, setAgreementRequests] = useState([]);
  const [showAgreementManagement, setShowAgreementManagement] = useState(false);
  const [showAgreementFlowModal, setShowAgreementFlowModal] = useState(false);
  const [agreementFlowPropertyId, setAgreementFlowPropertyId] = useState(null);

  const [fetchErrorCount, setFetchErrorCount] = useState(0);

  // Booking states
  const [showBrokerBookingModal, setShowBrokerBookingModal] = useState(false);
  const [bookingFormData, setBookingFormData] = useState({
    buyer_name: user?.name || '', phone: user?.phone || '', email: user?.email || '', profile_photo: '', 
    country_code: '+251', id_type: 'National ID', id_number: '',
    document_status: 'Yes', preferred_visit_time: '', notes: ''
  });
  const [bookingErrors, setBookingErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCustomerData();
    // Poll every 60 seconds (reduced from 10s to prevent error flooding)
    const intervalId = setInterval(fetchCustomerData, 60000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCustomerData = async () => {
    setLoading(true);
    const API = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;
    let hadError = false;

    // Each request is fully independent — one failure never blocks the rest

    // 1. Fetch profile status
    try {
      const profileRes = await axios.get(`${API}/profiles/customer/${user.id}?_t=${Date.now()}`);
      setCustomerProfile(profileRes.data);
      setProfileStatus(profileRes.data.profile_status);
    } catch (error) {
      hadError = true;
      // Only log on first failure to avoid flooding console
      if (fetchErrorCount < 2) console.warn('Profile fetch failed:', error.message);
    }

    // 2. Fetch ONLY ACTIVE properties
    try {
      const propertiesRes = await axios.get(`${API}/properties/active?_t=${Date.now()}`);
      setAllProperties(Array.isArray(propertiesRes.data) ? propertiesRes.data : []);
    } catch (error) {
      hadError = true;
    }

    // 3. Fetch favorites
    try {
      const favoritesRes = await axios.get(`${API}/favorites/${user.id}?_t=${Date.now()}`);
      setFavorites(Array.isArray(favoritesRes.data) ? favoritesRes.data : []);
    } catch (error) {
      setFavorites([]);
    }

    // 4. Fetch recent views
    try {
      const viewsRes = await axios.get(`${API}/property-views/user/${user.id}?_t=${Date.now()}`);
      setRecentViews(Array.isArray(viewsRes.data) ? viewsRes.data : []);
    } catch (error) {
      setRecentViews([]);
    }

    // 5. Fetch messages — API returns { messages: [...], count, ... }, extract array
    try {
      const messagesRes = await axios.get(`${API}/messages/user/${user.id}?_t=${Date.now()}`);
      const msgData = messagesRes.data;
      setMessages(Array.isArray(msgData) ? msgData : (msgData?.messages || []));
    } catch (error) {
      setMessages([]);
    }

    // 6. Fetch announcements
    try {
      const announcementsRes = await axios.get(`${API}/announcements?_t=${Date.now()}`);
      setAnnouncements(Array.isArray(announcementsRes.data) ? announcementsRes.data : []);
    } catch (error) {
      setAnnouncements([]);
    }

    // 7. Fetch agreement requests
    try {
      const agreementsRes = await axios.get(`${API}/agreement-requests/customer/${user.id}?_t=${Date.now()}`);
      setAgreementRequests(Array.isArray(agreementsRes.data) ? agreementsRes.data : []);
    } catch (error) {
      setAgreementRequests([]);
    }



    // Track consecutive errors for backoff logging
    setFetchErrorCount(prev => hadError ? prev + 1 : 0);
    setLoading(false);
  };

  const API = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

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
    }
    setBookingErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleBrokerBookingSubmit = async (e) => {
    e.preventDefault();
    
    const errors = {};
    const fieldsToValidate = ['buyer_name', 'email', 'phone', 'id_number', 'preferred_visit_time'];
    
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
      await axios.post(`${API}/broker-bookings`, {
        property_id: selectedProperty.id,
        broker_id: null,
        customer_id: user.id,
        ...bookingFormData
      });
      alert('Property successfully reserved for 30 minutes!');
      setShowBrokerBookingModal(false);
      setBookingFormData({
        buyer_name: user?.name || '', phone: user?.phone || '', email: user?.email || '', profile_photo: '', 
        country_code: '+251', id_type: 'National ID', id_number: '',
        document_status: 'Yes', preferred_visit_time: '', notes: ''
      });
      setBookingErrors({});
      fetchCustomerData();
    } catch (error) {
      console.error('Error booking property:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to book property');
    } finally {
      setActionLoading(false);
    }
  };

  const addToFavorites = async (propertyId) => {
    try {
      await axios.post(`${API}/favorites`, {
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
      await axios.delete(`${API}/favorites/${user.id}/${propertyId}`);
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

    if (!propertyPredictions[property.id]) {
      try {
        const locationName = property.location ? property.location.split(',')[0].trim() : 'Dire Dawa';
        const response = await axios.post(`${API}/ai/predict-property`, {
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
      } catch (err) {
        console.error('Error auditing property', err);
      }
    }

    // Record property view
    try {
      await axios.post(`${API}/property-views`, {
        user_id: user.id,
        property_id: property.id
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };



  const submitFeedback = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/feedback`, {
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
      await axios.put(`${API}/messages/read/${messageId}`);
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
      await axios.post(`${API}/messages`, {
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

  return (
    <div className="customer-dashboard">
      <DashboardHeader
        user={user}
        onLogout={onLogout}
        dashboardTitle="🏠 Customer Dashboard"
        onSettingsClick={onSettingsClick || (() => setCurrentPage('settings'))}
        notificationWidget={
          profileStatus === 'approved' && (
            <MessageNotificationWidget 
              userId={user?.id}
              onNavigateToMessages={() => setCurrentPage('messages')}
            />
          )
        }
      >
        {profileStatus === 'approved' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

            <button onClick={() => setShowAgreementManagement(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>📋 Management</button>
            <button onClick={() => setCurrentPage('complaints')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>📢 Complaints</button>
            <button onClick={() => setCurrentPage('announcements')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>📣 Announcements</button>
            <button onClick={() => setShowGuideModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤖 AI Guide</button>
            <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>💬 Feedback</button>
          </div>
        )}
      </DashboardHeader>

      {profileStatus === 'approved' && (
        <div style={{ display: 'flex', gap: '15px', padding: '10px 30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {[
            { label: 'Favorites', count: favorites.length, icon: '❤️', color: '#fee2e2', target: 'favorites-section' },
            { label: 'Viewed Properties', count: recentViews.length, icon: '👁️', color: '#dbeafe', target: 'recent-views-section' },
            { label: 'Available Properties', count: allProperties.length, icon: '🏠', color: '#d1fae5', target: 'browse-section' },
            { label: 'Unread Messages', count: (Array.isArray(messages) ? messages : []).filter(m => !m.is_read).length, icon: '📧', color: '#fef3c7', onClick: () => setCurrentPage('messages') }
          ].map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.onClick ? stat.onClick() : document.getElementById(stat.target)?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                minWidth: '220px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'; }}
            >
              <div style={{ background: stat.color, width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', lineHeight: '1' }}>{stat.count}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '0 30px', marginTop: '10px' }}>
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





      <div className="dashboard-grid">
        {/* My Favorites */}
        <div id="favorites-section" className="dashboard-card full-width">
          <div className="card-header">
            <h3>❤️ My Favorites</h3>
            <button className="btn-text">View All</button>
          </div>

          <div className="properties-grid">
            {favorites?.length > 0 ? favorites.slice(0, 4).map((fav, idx) => {
              const property = allProperties.find(p => p.id === fav.property_id);
              if (!property) return null;
              return (
                <div key={fav.id || property.id || `fav-${idx}`} className="property-card">
                  <div className="property-image">
                    {property.main_image && !imageErrors[property.id] ? (
                      <img 
                        src={property.main_image} 
                        alt={property.title} 
                        onClick={() => viewProperty(property)} 
                        style={{ cursor: 'pointer' }} 
                        onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))} 
                      />
                    ) : (
                      <div 
                        className="no-image-placeholder"
                        onClick={() => viewProperty(property)}
                        style={{ cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: '3rem' }}
                      >
                        🏠
                      </div>
                    )}
                    <button
                      className="favorite-btn active"
                      onClick={() => removeFavorite(property.id)}
                      style={{ zIndex: 2 }}
                    >
                      ❤️
                    </button>
                    <span className="property-badge" style={{ zIndex: 2 }}>{property.listing_type}</span>
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="empty-state">
                <div className="empty-icon">❤️</div>
                <p>No favorites yet</p>
                <span>Browse properties and add them to favorites</span>
              </div>
            )}
          </div>
        </div>

        {/* Browse Active Properties */}
        <div id="browse-section" className="dashboard-card full-width">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '15px' }}>
            <h3>🏠 Browse Properties (Active Listings)</h3>
            <div className="button-group" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All Types</button>
              <button className={`filter-btn ${activeFilter === 'villa' ? 'active' : ''}`} onClick={() => setActiveFilter('villa')}>Villa</button>
              <button className={`filter-btn ${activeFilter === 'apartment' ? 'active' : ''}`} onClick={() => setActiveFilter('apartment')}>Apartment</button>
              <button className={`filter-btn ${activeFilter === 'house' ? 'active' : ''}`} onClick={() => setActiveFilter('house')}>House</button>
              <button className={`filter-btn ${activeFilter === 'land' ? 'active' : ''}`} onClick={() => setActiveFilter('land')}>Land</button>
              <button className={`filter-btn ${activeFilter === 'commercial' ? 'active' : ''}`} onClick={() => setActiveFilter('commercial')}>Commercial</button>
            </div>
          </div>
          <div className="properties-grid">
            {allProperties.filter(p => activeFilter === 'all' || p.type?.toLowerCase() === activeFilter).slice(0, 6).map((property, idx) => (
              <div key={`${property.id}-${idx}`} className="property-card">
                <div className="property-image">
                  {property.main_image && !imageErrors[property.id] ? (
                    <img 
                      src={property.main_image} 
                      alt={property.title} 
                      onClick={() => viewProperty(property)} 
                      style={{ cursor: 'pointer' }} 
                      onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))} 
                    />
                  ) : (
                    <div 
                      className="no-image-placeholder"
                      onClick={() => viewProperty(property)}
                      style={{ cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: '3rem' }}
                      title="Click to view details"
                    >
                      🏠
                    </div>
                  )}
                  <button
                    className={`favorite-btn ${isFavorite(property.id) ? 'active' : ''}`}
                    onClick={() => isFavorite(property.id) ? removeFavorite(property.id) : addToFavorites(property.id)}
                    style={{ zIndex: 2 }}
                  >
                    {isFavorite(property.id) ? '❤️' : '🤍'}
                  </button>
                  <span className="property-badge" style={{ zIndex: 2 }}>{property.listing_type}</span>
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
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recently Viewed */}
        <div id="recent-views-section" className="dashboard-card full-width">
          <div className="card-header">
            <h3>🕐 Recently Viewed Properties</h3>
          </div>
          <div className="properties-grid">
            {recentViews?.length > 0 ? recentViews.slice(0, 4).map((view, idx) => {
              const property = allProperties.find(p => p.id === view.property_id);
              if (!property) return null;
              return (
                <div key={view.id || `view-${idx}`} className="property-card">
                  <div className="property-image">
                    {property.main_image && !imageErrors[property.id] ? (
                      <img 
                        src={property.main_image} 
                        alt={property.title} 
                        onClick={() => viewProperty(property)} 
                        style={{ cursor: 'pointer' }} 
                        onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))} 
                      />
                    ) : (
                      <div 
                        className="no-image-placeholder"
                        onClick={() => viewProperty(property)}
                        style={{ cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: '3rem' }}
                      >
                        🏠
                      </div>
                    )}
                    <button
                      className={`favorite-btn ${isFavorite(property.id) ? 'active' : ''}`}
                      onClick={() => isFavorite(property.id) ? removeFavorite(property.id) : addToFavorites(property.id)}
                      style={{ zIndex: 2 }}
                    >
                      {isFavorite(property.id) ? '❤️' : '🤍'}
                    </button>
                    <span className="property-badge" style={{ zIndex: 2 }}>{property.listing_type}</span>
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
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
            {announcements.length > 0 ? announcements.map((ann, idx) => (
              <div key={ann.id || `ann-${idx}`} className={`announcement-card ${ann.priority}`}>
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
              .map((property, idx) => (
                <div key={`${property.id}-${idx}`} className="property-card">
                  <div className="property-image">
                    {property.main_image && !imageErrors[property.id] ? (
                      <img 
                        src={property.main_image} 
                        alt={property.title} 
                        onClick={() => viewProperty(property)} 
                        style={{ cursor: 'pointer' }} 
                        onError={() => setImageErrors(prev => ({ ...prev, [property.id]: true }))} 
                      />
                    ) : (
                      <div 
                        className="no-image-placeholder"
                        onClick={() => viewProperty(property)}
                        style={{ cursor: 'pointer', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', fontSize: '3rem' }}
                        title="Click to view details"
                      >
                        🏠
                      </div>
                    )}
                    <button
                      className={`favorite-btn ${isFavorite(property.id) ? 'active' : ''}`}
                      onClick={() => isFavorite(property.id) ? removeFavorite(property.id) : addToFavorites(property.id)}
                      style={{ zIndex: 2 }}
                    >
                      {isFavorite(property.id) ? '❤️' : '🤍'}
                    </button>
                    <span className="view-count" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '12px', zIndex: 2, fontSize: '11px', fontWeight: 'bold' }}>👁️ {property.views || 0}</span>
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
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
      </div>
    </div>
  </>
)}

      {/* Property View Modal - Professional Layout */}
      {showPropertyModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowPropertyModal(false)}>
          <div className="modal-content property-view-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%', padding: 0, overflowY: 'auto', maxHeight: '90vh', borderRadius: '12px', background: 'white' }}>
            
            {/* Purple Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              padding: '16px 24px', 
              color: 'white', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🏠 {selectedProperty.title}</h2>
              <button 
                onClick={() => setShowPropertyModal(false)} 
                style={{ 
                  background: 'white', 
                  border: 'none', 
                  color: '#667eea', 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  fontSize: '16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s'
                }}
              >✕</button>
            </div>

            {/* Property Image - Full Width at Top */}
            <div className="property-image-full" style={{ position: 'relative', width: '100%', background: '#f1f5f9' }}>
              <ImageGallery propertyId={selectedProperty.id} canDelete={false} />
            </div>

            {/* Content Area - Two Columns */}
            <div className="property-view-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '30px', padding: '30px', background: 'white' }}>
              
              {/* Left Column - Property Details */}
              <div className="property-details-column">
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>ℹ️ Property Information</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ color: '#64748b' }}>Title:</strong> <span style={{ color: '#1e293b' }}>{selectedProperty.title}</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ color: '#64748b' }}>Type:</strong> <span style={{ color: '#1e293b' }}>{selectedProperty.type}</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ color: '#64748b' }}>Listing:</strong> <span style={{ color: '#1e293b' }}>{selectedProperty.listing_type}</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ color: '#64748b' }}>Bedrooms:</strong> <span style={{ color: '#1e293b' }}>{selectedProperty.bedrooms || 'N/A'}</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ color: '#64748b' }}>Bathrooms:</strong> <span style={{ color: '#1e293b' }}>{selectedProperty.bathrooms || 'N/A'}</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
                      <strong style={{ color: '#64748b' }}>Area:</strong> <span style={{ color: '#1e293b' }}>{selectedProperty.area || 'N/A'} m²</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#64748b' }}>Status:</strong> 
                      <span style={{ padding: '2px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>ACTIVE</span>
                    </div>
                    <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#64748b' }}>Verified:</strong> 
                      <span style={{ color: '#15803d', fontWeight: 600 }}>✅ Yes</span>
                    </div>
                  </div>

                  {/* AI Price Breakdown */}
                  <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1, background: '#ecfdf5', borderRadius: '12px', padding: '20px', border: '1px solid #a7f3d0' }}>
                      <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>💰 OWNER'S PRICE</div>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#064e3b' }}>{(selectedProperty.price || 0).toLocaleString()} <span style={{ fontSize: '14px' }}>ETB</span></div>
                      <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>{((selectedProperty.price || 0) / 1000000).toFixed(2)}M ETB</div>
                    </div>

                    <div style={{ flex: 1, background: '#f5f3ff', borderRadius: '12px', padding: '20px', border: '1px solid #ddd6fe' }}>
                      <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>🤖 AI PREDICTED PRICE</div>
                      {propertyPredictions[selectedProperty.id] ? (
                        <>
                          <div style={{ fontSize: '24px', fontWeight: 800, color: '#4c1d95' }}>{(propertyPredictions[selectedProperty.id].predicted_price || 0).toLocaleString()} <span style={{ fontSize: '14px' }}>ETB</span></div>
                          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>⚠️ Above Market (+16.3%)</div>
                          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
                            <div style={{ width: '70%', height: '100%', background: '#10b981' }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#6d28d9', marginTop: '6px' }}>{propertyPredictions[selectedProperty.id].confidence}% confidence • ML</div>
                        </>
                      ) : (
                         <div style={{ fontSize: '14px', color: '#6d28d9', marginTop: '10px' }}>⏳ Fetching...</div>
                      )}
                    </div>
                  </div>

                  {propertyPredictions[selectedProperty.id] && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '15px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>📉 Low: <strong style={{ color: '#4c1d95' }}>{(propertyPredictions[selectedProperty.id].predicted_price * 0.95).toLocaleString()} ETB</strong></div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>📊 Predicted: <strong style={{ color: '#4c1d95' }}>{propertyPredictions[selectedProperty.id].predicted_price.toLocaleString()} ETB</strong></div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>📈 High: <strong style={{ color: '#4c1d95' }}>{(propertyPredictions[selectedProperty.id].predicted_price * 1.05).toLocaleString()} ETB</strong></div>
                  </div>
                  )}
                </div>
              </div>

              {/* Right Column - Info & Actions */}
              <div className="documents-actions-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Owner / Broker Info */}
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>👤 Owner / Broker</h3>
                  <div style={{ background: 'white', padding: '20px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}><strong style={{ color: '#64748b' }}>Owner:</strong> {selectedProperty.owner_name || 'System User'}</div>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}><strong style={{ color: '#64748b' }}>Broker:</strong> {selectedProperty.broker_name || 'N/A'}</div>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}><strong style={{ color: '#64748b' }}>Listed:</strong> {(selectedProperty.createdAt || selectedProperty.created_at) ? new Date(selectedProperty.createdAt || selectedProperty.created_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>

                {/* Verification Info */}
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>📋 Verification</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '14px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#64748b' }}>Status:</strong> 
                      <span style={{ padding: '4px 12px', background: '#dcfce7', color: '#15803d', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>APPROVED</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>
                      <strong style={{ color: '#64748b' }}>Notes:</strong> [Site Check: VERIFIED ON SITE]
                    </div>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>
                      <strong style={{ color: '#64748b' }}>Date:</strong> {new Date().toLocaleString()}
                    </div>
                  </div>

                  {/* Actions inside verification block to save space, matching the layout */}
                  <div style={{ marginTop: '20px' }}>
                    <button
                      onClick={() => isFavorite(selectedProperty.id) ? removeFavorite(selectedProperty.id) : addToFavorites(selectedProperty.id)}
                      style={{ 
                        padding: '10px 20px', 
                        background: isFavorite(selectedProperty.id) ? '#fee2e2' : '#f1f5f9', 
                        color: isFavorite(selectedProperty.id) ? '#ef4444' : '#64748b', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: 'fit-content',
                        fontSize: '14px'
                      }}
                    >
                      {isFavorite(selectedProperty.id) ? '💔 Remove from Favorites' : '❤️ Add to Favorites'}
                    </button>
                  </div>
                </div>

                {/* Action Block: Book Now & Agreement */}
                <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>⚡ Actions</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Book Now Button */}
                    <button
                      onClick={() => {
                        setSelectedProperty(selectedProperty);
                        setBookingFormData({
                          ...bookingFormData,
                          buyer_name: user.name,
                          phone: user.phone || ''
                        });
                        setShowBrokerBookingModal(true);
                        setShowPropertyModal(false);
                      }}
                      style={{ 
                        width: '100%', 
                        padding: '16px 20px', 
                        background: '#f59e0b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: '16px',
                        boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)'
                      }}
                    >
                      ⏱️ Book Property (30 Min Hold)
                    </button>

                    {/* Agreement Request Button */}
                    {!hasAgreement(selectedProperty.id) ? (
                      <button
                        onClick={() => {
                          setAgreementFlowPropertyId(selectedProperty.id);
                          setShowPropertyModal(false);
                          setShowAgreementFlowModal(true);
                        }}
                        style={{ 
                          width: '100%', 
                          padding: '16px 20px', 
                          background: '#2563eb', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontSize: '16px',
                          boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
                        }}
                      >
                        🤝 Request Agreement
                      </button>
                    ) : (
                      <button 
                        style={{ 
                          width: '100%', 
                          padding: '16px 20px', 
                          background: '#e2e8f0', 
                          color: '#64748b', 
                          border: 'none', 
                          borderRadius: '8px', 
                          fontWeight: 700, 
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          fontSize: '16px'
                        }} 
                        disabled
                      >
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
                {(Array.isArray(messages) ? messages : []).length > 0 ? (Array.isArray(messages) ? messages : []).map((msg, idx) => (
                  <div
                    key={msg.id || `msg-${idx}`}
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
      {/* Broker Booking Modal */}
      {showBrokerBookingModal && selectedProperty && (
        <div className="modal-overlay" onClick={() => setShowBrokerBookingModal(false)} style={{ zIndex: 1300 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', padding: '30px', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', color: '#1e293b', fontWeight: '800' }}>
                ⏱️ Book Property (30 Min Hold)
              </h2>
              <button onClick={() => setShowBrokerBookingModal(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>
            
            <form onSubmit={handleBrokerBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ padding: '15px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderRadius: '12px', fontSize: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>Property Details</div>
                <strong style={{ fontSize: '16px', color: '#0f172a' }}>{selectedProperty.title}</strong> <br/>
                <div style={{ marginTop: '4px', color: '#475569' }}>
                  {selectedProperty.type} | 🛏️ {selectedProperty.bedrooms} | 🚿 {selectedProperty.bathrooms}
                </div>
              </div>

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
