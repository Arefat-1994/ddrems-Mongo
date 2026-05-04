import React, { useState } from 'react';
import axios from 'axios';
import MapPropertyPicker from './MapPropertyPicker';
import ImageUploader from './ImageUploader';
import DocumentUploader from './DocumentUploader';


const PropertyUploaderModal = ({ user, onClose, onSuccess }) => {
  const [addStep, setAddStep] = useState('form');
  const [newPropertyId, setNewPropertyId] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [previewProperty, setPreviewProperty] = useState(null);
  const [previewImages, setPreviewImages] = useState([]);
  const [previewDocs, setPreviewDocs] = useState([]);
  
  // AI Price Prediction state
  const [aiPrediction, setAiPrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const [propertyForm, setPropertyForm] = useState({
    title: '', type: 'apartment', listing_type: 'sale', price: '', location: '',
    bedrooms: '', bathrooms: '', area: '', description: '',
    distance_to_center_km: '3', near_school: false, near_hospital: false,
    near_market: false, parking: false, security_rating: '3', condition: 'Good',
    latitude: '', longitude: '', model_3d_path: '', owner_id: ''
  });

  // Owner Search & Invitation State
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerResults, setOwnerResults] = useState([]);
  const [showOwnerResults, setShowOwnerResults] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // ── AI Price Prediction ──
  const handlePredictPrice = async () => {
    if (!propertyForm.location && !propertyForm.latitude) {
      alert('📍 Please select a location first using the Map button');
      return;
    }
    if (!propertyForm.bedrooms) {
      alert('🛏️ Please enter the number of bedrooms');
      return;
    }

    setPredictionLoading(true);
    setAiPrediction(null);

    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      // Extract location name from the full address
      const locationName = propertyForm.location
        ? propertyForm.location.split(',')[0].trim()
        : 'Dire Dawa';

      const response = await axios.post(`${API_BASE}/ai/predict-property`, {
        latitude: parseFloat(propertyForm.latitude) || 9.6009,
        longitude: parseFloat(propertyForm.longitude) || 41.8596,
        location_name: locationName,
        bedrooms: parseInt(propertyForm.bedrooms) || 2,
        bathrooms: parseInt(propertyForm.bathrooms) || 1,
        property_type: propertyForm.type || 'apartment',
        condition: propertyForm.condition || 'Good',
        near_school: propertyForm.near_school ? 1 : 0,
        near_hospital: propertyForm.near_hospital ? 1 : 0,
        near_market: propertyForm.near_market ? 1 : 0,
        parking: propertyForm.parking ? 1 : 0,
        security_rating: parseInt(propertyForm.security_rating) || 3,
        listing_type: propertyForm.listing_type || 'sale',
        size_m2: parseInt(propertyForm.area) || 120
      });

      if (response.data.success) {
        setAiPrediction(response.data);
      } else {
        alert('❌ Prediction failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('AI Prediction error:', error);
      alert('❌ Failed to get AI prediction: ' + (error.response?.data?.message || error.message));
    } finally {
      setPredictionLoading(false);
    }
  };

  const handleApplyPrediction = () => {
    if (aiPrediction?.predicted_price) {
      setPropertyForm(prev => ({
        ...prev,
        price: String(aiPrediction.predicted_price)
      }));
    }
  };

  const handleOwnerSearch = async (query) => {
    setOwnerSearch(query);
    if (query.length < 2) {
      setOwnerResults([]);
      setShowOwnerResults(false);
      return;
    }

    setSearchLoading(true);
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      const response = await axios.get(`${API_BASE}/users/search?role=owner&q=${query}`);
      setOwnerResults(response.data);
      setShowOwnerResults(true);
    } catch (error) {
      console.error('Owner search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectOwner = (owner) => {
    setSelectedOwner(owner);
    setPropertyForm(prev => ({ ...prev, owner_id: owner.id }));
    setOwnerSearch(owner.name);
    setShowOwnerResults(false);
    setIsInviting(false);
  };

  const handleAddProperty = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...propertyForm,
        status: newPropertyId ? propertyForm.status : 'draft'
      };
      
      // Map the creating user ID correctly based on their role
      if (user.role === 'owner') {
        payload.owner_id = user.id;
      } else if (user.role === 'broker') {
        payload.broker_id = user.id;
      }

      // Automatically map frontend input names resolving some mapping collisions if backend expected different labels
      payload.size_m2 = propertyForm.area;
      payload.property_type = propertyForm.type;
      payload.location_name = propertyForm.location;

      if (isInviting) {
        payload.invite_name = inviteName;
        payload.invite_email = inviteEmail;
        payload.owner_id = null; // Backend will create the user
      }

      let response;
      if (newPropertyId) {
        // Update existing property
        response = await axios.put(`http://localhost:5000/api/properties/${newPropertyId}`, payload);
      } else {
        // Create new property
        response = await axios.post('http://localhost:5000/api/properties', payload);
        setNewPropertyId(response.data.id);
      }

      setAddStep('images');
      alert(newPropertyId ? '✅ Property details updated!' : '✅ Property details saved! Now upload images.');
    } catch (error) {
      console.error('Error saving property:', error);
      alert('❌ Failed to save property: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  const handleImageUploadComplete = () => {
    setAddStep('documents');
  };

  const handleDocUploadComplete = () => {
    setAddStep('preview');
    fetchPreviewData();
  };

  const fetchPreviewData = async () => {
    try {
      const [propertyRes, imagesRes, docsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/properties/${newPropertyId}`),
        axios.get(`http://localhost:5000/api/property-images/property/${newPropertyId}`),
        axios.get(`http://localhost:5000/api/property-documents/property/${newPropertyId}`).catch(() => ({ data: [] }))
      ]);
      setPreviewProperty(propertyRes.data);
      setPreviewImages(imagesRes.data);
      setPreviewDocs(docsRes.data);
    } catch (error) {
      console.error('Error fetching preview data:', error);
    }
  };

  const handleFinalSubmit = async () => {
    if (previewImages.length === 0) {
      alert('⚠️ Please upload at least one image before submitting.');
      setAddStep('images');
      return;
    }

    try {
      // Set status to pending for admin approval
      await axios.put(`http://localhost:5000/api/properties/${newPropertyId}`, {
        ...previewProperty,
        status: 'pending'
      });
      
      alert('🎉 Property submitted successfully! Waiting for admin approval.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error finalizing property:', error);
      alert('❌ Failed to submit property: ' + (error.response?.data?.message || 'Server error'));
    }
  };

  const handleCancelAdd = () => {
    if (newPropertyId && addStep !== 'preview') {
      if (!window.confirm('Are you sure? Property details have been saved. You can continue later.')) return;
    }
    onClose();
  };

  
  return (
    <div className="modal-overlay">
      <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
        {/* Step Indicator */}
        <div className="modal-header">
          <h2>
            {addStep === 'form' && '➕ Step 1: Property Details'}
            {addStep === 'images' && '📷 Step 2: Upload Images'}
            {addStep === 'documents' && '📄 Step 3: Upload Documents'}
            {addStep === 'preview' && '👁️ Step 4: Preview & Submit'}
          </h2>
          <button className="close-btn" onClick={handleCancelAdd}>✕</button>
        </div>

        {/* Step Progress Bar */}
        <div style={{ display: 'flex', gap: '4px', padding: '0 30px', marginBottom: '20px' }}>
          {['form', 'images', 'documents', 'preview'].map((step, index) => (
            <div key={step} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: ['form', 'images', 'documents', 'preview'].indexOf(addStep) >= index ? '#3b82f6' : '#e2e8f0'
            }} />
          ))}
        </div>

        {/* STEP 1: Property Form */}
        {addStep === 'form' && (
          <form onSubmit={handleAddProperty}>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Property Title *</label>
                  <input type="text" value={propertyForm.title} onChange={(e) => setPropertyForm({ ...propertyForm, title: e.target.value })} required placeholder="e.g., Modern Villa in Kezira" />
                </div>
                <div className="form-group">
                  <label>Property Type *</label>
                  <select value={propertyForm.type} onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })} required>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="house">House</option>
                    <option value="shop">Shop</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Listing Type *</label>
                  <select value={propertyForm.listing_type} onChange={(e) => setPropertyForm({ ...propertyForm, listing_type: e.target.value })} required>
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Location *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" value={propertyForm.location} onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })} required placeholder="e.g., Kezira, Dire Dawa" style={{ flex: 1 }} />
                    <button
                      type="button"
                      onClick={() => setShowMapPicker(true)}
                      className="btn-secondary"
                      style={{ padding: '0 20px' }}
                    >
                      📍 Map
                    </button>
                  </div>
                  {/* Show selected coordinates */}
                  {propertyForm.latitude && propertyForm.longitude && (
                    <div style={{ marginTop: '6px', display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b' }}>
                      <span>📍 Lat: <strong style={{ color: '#1e293b' }}>{parseFloat(propertyForm.latitude).toFixed(6)}</strong></span>
                      <span>📍 Lng: <strong style={{ color: '#1e293b' }}>{parseFloat(propertyForm.longitude).toFixed(6)}</strong></span>
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ color: '#475569', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
                    📊 Property Specifications (ML Features)
                  </label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: '15px',
                    padding: '20px',
                    background: '#f1f5f9',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>🛏️ Bedrooms</label>
                      <input 
                        type="number" 
                        value={propertyForm.bedrooms} 
                        onChange={(e) => {
                          setPropertyForm({ ...propertyForm, bedrooms: e.target.value });
                          if (aiPrediction) handlePredictPrice();
                        }} 
                        placeholder="3" 
                        style={{ background: 'white' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>🚿 Bathrooms</label>
                      <input 
                        type="number" 
                        value={propertyForm.bathrooms} 
                        onChange={(e) => {
                          setPropertyForm({ ...propertyForm, bathrooms: e.target.value });
                          if (aiPrediction) handlePredictPrice();
                        }} 
                        placeholder="2" 
                        style={{ background: 'white' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>📐 Area (m²)</label>
                      <input 
                        type="number" 
                        value={propertyForm.area} 
                        onChange={(e) => {
                          setPropertyForm({ ...propertyForm, area: e.target.value });
                          if (aiPrediction) handlePredictPrice();
                        }} 
                        required 
                        placeholder="250" 
                        style={{ background: 'white' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '12px' }}>✨ Condition</label>
                      <select 
                        value={propertyForm.condition} 
                        onChange={(e) => {
                          setPropertyForm({ ...propertyForm, condition: e.target.value });
                          if (aiPrediction) handlePredictPrice();
                        }}
                        style={{ background: 'white' }}
                      >
                        <option value="new">New / Excellent</option>
                        <option value="good">Good / Well Maintained</option>
                        <option value="needs renovation">Needs Renovation</option>
                      </select>
                    </div>
                  </div>
                </div>
                {user.role === 'broker' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>👤 Property Owner Selection *</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsInviting(!isInviting);
                          setSelectedOwner(null);
                          setPropertyForm(prev => ({ ...prev, owner_id: '' }));
                        }}
                        style={{ 
                          fontSize: '11px', 
                          background: isInviting ? '#fef2f2' : '#eff6ff', 
                          color: isInviting ? '#ef4444' : '#3b82f6',
                          border: `1px solid ${isInviting ? '#fecaca' : '#bfdbfe'}`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        {isInviting ? '↩️ Back to Search' : '➕ Invite New Owner'}
                      </button>
                    </label>

                    {!isInviting ? (
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="text" 
                            value={ownerSearch} 
                            onChange={(e) => handleOwnerSearch(e.target.value)} 
                            placeholder="Search existing owner by name or email..." 
                            style={{ 
                              paddingLeft: '35px',
                              borderColor: selectedOwner ? '#10b981' : '#cbd5e1',
                              background: selectedOwner ? '#f0fdf4' : 'white'
                            }}
                          />
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                          {searchLoading && (
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#3b82f6' }}>⌛</span>
                          )}
                          {selectedOwner && (
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }}>✅</span>
                          )}
                        </div>

                        {showOwnerResults && ownerResults.length > 0 && (
                          <div style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', marginTop: '4px',
                            maxHeight: '200px', overflowY: 'auto'
                          }}>
                            {ownerResults.map(owner => (
                              <div 
                                key={owner.id} 
                                onClick={() => selectOwner(owner)}
                                style={{ 
                                  padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                                  transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                                onMouseOut={(e) => e.target.style.background = 'transparent'}
                              >
                                <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{owner.name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>📧 {owner.email} • ID: {owner.id}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {showOwnerResults && ownerResults.length === 0 && ownerSearch.length >= 2 && (
                          <div style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                            background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px',
                            padding: '10px 15px', marginTop: '4px', fontSize: '12px', color: '#92400e'
                          }}>
                            No owner found. <span style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }} onClick={() => setIsInviting(true)}>Invite them instead?</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', 
                        padding: '15px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' 
                      }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', color: '#991b1b' }}>Owner Full Name *</label>
                          <input 
                            type="text" 
                            value={inviteName} 
                            onChange={(e) => setInviteName(e.target.value)} 
                            placeholder="Full Legal Name" 
                            required={isInviting}
                            style={{ borderColor: '#fecaca' }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label style={{ fontSize: '11px', color: '#991b1b' }}>Owner Email Address *</label>
                          <input 
                            type="email" 
                            value={inviteEmail} 
                            onChange={(e) => setInviteEmail(e.target.value)} 
                            placeholder="email@example.com" 
                            required={isInviting}
                            style={{ borderColor: '#fecaca' }}
                          />
                        </div>
                        <div style={{ gridColumn: '1 / -1', fontSize: '10px', color: '#dc2626', marginTop: '4px' }}>
                          ℹ️ An automated invitation with temporary login credentials will be sent to this email.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── AMENITIES & NEARBY FACILITIES ── */}
                <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                  <label style={{ color: '#475569', fontWeight: '700', marginBottom: '12px', display: 'block' }}>
                    📍 Nearby Facilities & Amenities (Influences Price)
                  </label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                    gap: '12px',
                    padding: '15px',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {[
                      { id: 'near_school', label: '🏫 Near School', color: '#3b82f6' },
                      { id: 'near_hospital', label: '🏥 Near Hospital', color: '#ef4444' },
                      { id: 'near_market', label: '🛒 Near Market', color: '#f59e0b' },
                      { id: 'parking', label: '🅿️ Parking', color: '#10b981' }
                    ].map(item => (
                      <label key={item.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: propertyForm[item.id] ? '#fff' : 'transparent',
                        borderRadius: '8px',
                        border: `1px solid ${propertyForm[item.id] ? item.color : '#cbd5e1'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: propertyForm[item.id] ? `0 2px 4px ${item.color}20` : 'none',
                        fontSize: '13px',
                        fontWeight: propertyForm[item.id] ? '600' : '500',
                        color: propertyForm[item.id] ? '#1e293b' : '#64748b'
                      }}>
                        <input
                          type="checkbox"
                          checked={propertyForm[item.id]}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            setPropertyForm({ ...propertyForm, [item.id]: newValue });
                            // Trigger re-predict if already predicted
                            if (aiPrediction) handlePredictPrice();
                          }}
                          style={{ display: 'none' }}
                        />
                        <span style={{ 
                          width: '18px', 
                          height: '18px', 
                          borderRadius: '4px', 
                          border: `2px solid ${item.color}`,
                          background: propertyForm[item.id] ? item.color : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}>
                          {propertyForm[item.id] && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                        </span>
                        {item.label}
                      </label>
                    ))}
                    
                    <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', display: 'block' }}>🛡️ Security Rating (1-5)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setPropertyForm({ ...propertyForm, security_rating: String(star) });
                              if (aiPrediction) handlePredictPrice();
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: parseInt(propertyForm.security_rating) >= star ? '#f59e0b' : '#cbd5e1',
                              background: parseInt(propertyForm.security_rating) >= star ? '#fffbeb' : 'white',
                              color: parseInt(propertyForm.security_rating) >= star ? '#d97706' : '#94a3b8',
                              cursor: 'pointer',
                              fontSize: '14px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            ⭐ {star}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── AI PRICE PREDICTION SECTION ── */}
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>💰 Price (ETB) *</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <input
                      type="number"
                      value={propertyForm.price}
                      onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                      required
                      placeholder="e.g., 8500000"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handlePredictPrice}
                      disabled={predictionLoading}
                      style={{
                        padding: '10px 18px',
                        background: predictionLoading
                          ? '#94a3b8'
                          : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: predictionLoading ? 'not-allowed' : 'pointer',
                        fontWeight: '700',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(139,92,246,0.3)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {predictionLoading ? '⏳ Predicting...' : '🤖 Predict Price'}
                    </button>
                  </div>

                  {/* AI Prediction Result Card */}
                  {aiPrediction && (
                    <div style={{
                      marginTop: '12px',
                      padding: '16px',
                      background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                      borderRadius: '12px',
                      border: '1px solid #c4b5fd',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            🤖 AI Predicted Price
                          </div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: '#4c1d95' }}>
                            {Number(aiPrediction.predicted_price).toLocaleString()} ETB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyPrediction}
                          style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '13px',
                            boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✅ Apply Price
                        </button>
                      </div>

                      {/* Price Range */}
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '12px', color: '#6d28d9' }}>
                          📉 Low: <strong>{Number(aiPrediction.low_estimate).toLocaleString()} ETB</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6d28d9' }}>
                          📈 High: <strong>{Number(aiPrediction.high_estimate).toLocaleString()} ETB</strong>
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7c3aed', marginBottom: '4px' }}>
                          <span>Confidence Index</span>
                          <span>{aiPrediction.confidence}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#ddd6fe', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${aiPrediction.confidence}%`,
                            background: aiPrediction.confidence >= 80 ? 'linear-gradient(90deg, #10b981, #059669)' : aiPrediction.confidence >= 60 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease'
                          }} />
                        </div>
                      </div>

                      {/* Hybrid Model Details */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '10px', 
                        marginBottom: '10px',
                        background: 'rgba(255,255,255,0.4)',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: '2px' }}>ML Base Price/m²</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{Number(aiPrediction.ml_base_price_per_sqm).toLocaleString()} ETB</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: '2px' }}>GIS Adjusted/m²</div>
                          <div style={{ fontWeight: '600', color: '#1e293b' }}>{Number(aiPrediction.gis_price_per_sqm).toLocaleString()} ETB</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: '2px' }}>Amenity Mult.</div>
                          <div style={{ fontWeight: '600', color: '#059669' }}>× {aiPrediction.amenity_multiplier}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', marginBottom: '2px' }}>Center Dist.</div>
                          <div style={{ fontWeight: '600', color: '#3b82f6' }}>{aiPrediction.distance_to_center} km</div>
                        </div>
                      </div>

                      {/* Model Info */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8b5cf6' }}>
                        <span>🔬 {aiPrediction.model_name || 'Hybrid ML+GIS Engine'}</span>
                        <span>{aiPrediction.is_gis ? '🌍 GIS Powered' : '📊 ML Base'} • {aiPrediction.dataset_size || 0} samples</span>
                      </div>

                      {/* Location Stats */}
                      {aiPrediction.location_stats && aiPrediction.location_stats.num_properties > 0 && (
                        <div style={{
                          marginTop: '10px',
                          padding: '8px 12px',
                          background: 'rgba(255,255,255,0.6)',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#4c1d95'
                        }}>
                          <strong>📍 Area Market Data:</strong>{' '}
                          Avg: {Number(aiPrediction.location_stats.avg_price).toLocaleString()} ETB •{' '}
                          Range: {Number(aiPrediction.location_stats.min_price).toLocaleString()} – {Number(aiPrediction.location_stats.max_price).toLocaleString()} ETB •{' '}
                          {aiPrediction.location_stats.num_properties} properties
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="form-group full-width" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <textarea 
                    value={propertyForm.description} 
                    onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })} 
                    placeholder="Tell us more about the property..."
                    rows="3"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                  ></textarea>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary">Next: Upload Images →</button>
            </div>
          </form>
        )}

        {/* STEP 2: Images */}
        {addStep === 'images' && (
          <div className="modal-body">
            <ImageUploader 
              propertyId={newPropertyId} 
              uploadedBy={user.id}
              onUploadComplete={handleImageUploadComplete} 
            />
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setAddStep('form')}>← Back to Details</button>
            </div>
          </div>
        )}

        {/* STEP 3: Documents */}
        {addStep === 'documents' && (
          <div className="modal-body">
            <DocumentUploader 
              propertyId={newPropertyId} 
              uploadedBy={user.id}
              onUploadComplete={handleDocUploadComplete} 
            />
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setAddStep('images')}>← Back to Images</button>
            </div>
          </div>
        )}

        {/* STEP 4: Preview */}
        {addStep === 'preview' && (
          <div className="modal-body">
            <div className="property-preview" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
              <h3>{previewProperty?.title}</h3>
              <p>📍 {previewProperty?.location}</p>
              <p>💰 {new Intl.NumberFormat().format(previewProperty?.price)} ETB</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '15px' }}>
                {previewImages.map((img, i) => (
                  <img key={i} src={img.image_url} alt="Preview" style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px' }} />
                ))}
              </div>

              <div style={{ marginTop: '15px' }}>
                <p><strong>Documents:</strong> {previewDocs.length} uploaded</p>
              </div>
            </div>
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setAddStep('documents')}>← Back to Documents</button>
              <button className="btn-primary btn-large" onClick={handleFinalSubmit}>
                🎉 Submit Property for Approval
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPropertyPicker
          onLocationSelect={(location) => {
            setPropertyForm(prev => ({
              ...prev,
              latitude: location.lat.toString(),
              longitude: location.lng.toString(),
              location: location.address || `Dire Dawa (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`
            }));
            setShowMapPicker(false);
            // Reset prediction when location changes
            setAiPrediction(null);
          }}
          onClose={() => setShowMapPicker(false)}
          initialLocation={
            propertyForm.latitude && propertyForm.longitude
              ? { lat: parseFloat(propertyForm.latitude), lng: parseFloat(propertyForm.longitude), address: propertyForm.location }
              : undefined
          }
        />
      )}
      
    </div>
  );
};

export default PropertyUploaderModal;
