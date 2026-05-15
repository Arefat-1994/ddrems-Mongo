import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SiteCheckManager.css';

const API_BASE = `${window.API_URL}`;

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const inspectorIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: '<div style="background:#6366f1;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(99,102,241,0.6);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const propertyIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: '<div style="background:#ef4444;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px rgba(239,68,68,0.6);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const MapAutoCenter = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 17, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

const SiteCheckManager = ({ user, setCurrentPage, initialPropertyId }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectorGPS, setInspectorGPS] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [withinRadius, setWithinRadius] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoTimestamp, setPhotoTimestamp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [previousChecks, setPreviousChecks] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [legalDocs, setLegalDocs] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const fileInputRef = useRef(null);
  const docInputRefs = useRef({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/properties`);
      const validProperties = res.data.filter(p => p.latitude && p.longitude && p.status === 'pending');
      setProperties(validProperties);
      
      // Select initial property if provided
      if (initialPropertyId) {
        const initialProp = validProperties.find(p => p.id === initialPropertyId);
        if (initialProp) {
          setSelectedProperty(initialProp);
        }
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  }, [initialPropertyId]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  // When property selected, fetch its checks and verification status
  useEffect(() => {
    if (!selectedProperty) return;
    const fetchData = async () => {
      try {
        const [checksRes, statusRes, docsRes] = await Promise.all([
          axios.get(`${API_BASE}/site-check/property/${selectedProperty.id}`),
          axios.get(`${API_BASE}/site-check/verification-status/${selectedProperty.id}`),
          axios.get(`${API_BASE}/site-check/legal-documents/${selectedProperty.id}`)
        ]);
        setPreviousChecks(checksRes.data);
        setVerificationStatus(statusRes.data);
        setLegalDocs(docsRes.data);
      } catch (err) {
        console.error('Error fetching property data:', err);
      }
    };
    fetchData();
  }, [selectedProperty]);

  // Haversine (client-side for display)
  const haversine = (lat1, lng1, lat2, lng2) => {
    const R = 6371000;
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Get GPS location
  const getLocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setInspectorGPS(loc);
        setGpsLoading(false);

        if (selectedProperty) {
          const d = haversine(loc.lat, loc.lng, parseFloat(selectedProperty.latitude), parseFloat(selectedProperty.longitude));
          setDistance(Math.round(d * 100) / 100);
          setWithinRadius(d <= 100);
        }
      },
      (error) => {
        setGpsError(`GPS Error: ${error.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Image Compression Helper
  const compressImage = (file, callback) => {
    // Skip small images (< 1MB)
    if (file.size < 1024 * 1024) {
      return callback(file);
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        // Max dimension 1920
        const MAX_DIMENSION = 1920;
        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          callback(compressedFile);
        }, 'image/jpeg', 0.85);
      };
    };
  };

  // Photo capture
  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    compressImage(file, (compressedFile) => {
      setPhoto(compressedFile);
      setPhotoTimestamp(new Date());
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target.result);
      reader.readAsDataURL(compressedFile);
    });
  };

  // Submit site check
  const handleSubmit = async () => {
    if (!selectedProperty || !inspectorGPS || !photo) {
      showToast('Please complete all steps: select property, get GPS, and capture photo', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('property_id', selectedProperty.id);
      formData.append('inspector_id', user.id);
      formData.append('inspector_gps_lat', inspectorGPS.lat);
      formData.append('inspector_gps_lng', inspectorGPS.lng);
      formData.append('within_radius', withinRadius);
      formData.append('distance_meters', distance);
      formData.append('photo', photo);

      const res = await axios.post(`${API_BASE}/site-check/start`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(res.data.message, res.data.within_radius ? 'success' : 'warning');

      // Reset form
      setInspectorGPS(null);
      setDistance(null);
      setPhoto(null);
      setPhotoPreview(null);
      setPhotoTimestamp(null);

      // Refresh data
      const [checksRes, statusRes] = await Promise.all([
        axios.get(`${API_BASE}/site-check/property/${selectedProperty.id}`),
        axios.get(`${API_BASE}/site-check/verification-status/${selectedProperty.id}`)
      ]);
      setPreviousChecks(checksRes.data);
      setVerificationStatus(statusRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit site check', 'error');
    }
    setSubmitting(false);
  };

  // Upload legal document
  const handleDocUpload = async (docType, file) => {
    if (!file || !selectedProperty) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast('Document is too large. Maximum size is 50MB.', 'error');
      return;
    }
    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      formData.append('property_id', selectedProperty.id);
      formData.append('uploaded_by', user.id);
      formData.append('document_type', docType);
      formData.append('document', file);

      await axios.post(`${API_BASE}/site-check/legal-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Document uploaded successfully!');

      // Refresh docs
      const docsRes = await axios.get(`${API_BASE}/site-check/legal-documents/${selectedProperty.id}`);
      setLegalDocs(docsRes.data);
      const statusRes = await axios.get(`${API_BASE}/site-check/verification-status/${selectedProperty.id}`);
      setVerificationStatus(statusRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload document', 'error');
    }
    setUploadingDoc(null);
  };

  const filteredProperties = properties.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const docTypes = [
    { key: 'title_deed', label: 'Title Deed', icon: '📜' },
    { key: 'ownership_document', label: 'Ownership Document', icon: '🏛️' },
    { key: 'id_card', label: 'ID Card', icon: '🪪' }
  ];

  const getDocForType = (type) => legalDocs.find(d => d.document_type === type);
  const mapCenter = inspectorGPS
    ? [inspectorGPS.lat, inspectorGPS.lng]
    : selectedProperty
      ? [parseFloat(selectedProperty.latitude), parseFloat(selectedProperty.longitude)]
      : [9.6009, 41.8596];

  return (
    <div className="site-check-manager">
      {toast && <div className={`sc-toast ${toast.type}`}>{toast.message}</div>}

      {/* Header */}
      <div className="sc-header">
        <h1>📍 Property Site Check</h1>
        <p>Verify property location with GPS, capture photo proof, and upload legal documents</p>
      </div>

      {/* Step 1: Select Property */}
      {!selectedProperty ? (
        <div className="sc-property-selector">
          <h3>🏠 Step 1: Select a Property to Check</h3>
          <input
            className="sc-property-search"
            type="text"
            placeholder="🔍 Search properties by name or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="sc-property-list">
            {filteredProperties.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                No properties with GPS coordinates found. Properties must have latitude/longitude set.
              </p>
            ) : (
              filteredProperties.map(p => (
                <div
                  key={p.id}
                  className="sc-property-item"
                  onClick={() => { setSelectedProperty(p); setInspectorGPS(null); setDistance(null); setPhoto(null); setPhotoPreview(null); }}
                >
                  <div>
                    <h4>{p.title}</h4>
                    <p>📍 {p.location} • {p.type} • ETB {parseFloat(p.price).toLocaleString()}</p>
                  </div>
                  <span className="sc-has-coords-badge">📍 GPS Ready</span>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Selected Property Banner */}
          <div className="sc-property-selector" style={{ background: 'linear-gradient(135deg, #eef2ff, #e0e7ff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>🏠 {selectedProperty.title}</h3>
                <p style={{ margin: '4px 0 0 0', color: '#6366f1' }}>
                  📍 {selectedProperty.location} • Lat: {parseFloat(selectedProperty.latitude).toFixed(6)}, Lng: {parseFloat(selectedProperty.longitude).toFixed(6)}
                </p>
              </div>
              <button className="sc-btn-back" style={{ background: '#6366f1', color: 'white', padding: '8px 18px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setSelectedProperty(null); setInspectorGPS(null); setDistance(null); setPreviousChecks([]); setVerificationStatus(null); setLegalDocs([]); }}>
                ← Change Property
              </button>
            </div>
          </div>

          {/* Step 2: GPS Check + Photo */}
          <div className="sc-check-container">
            {/* Map & GPS */}
            <div className="sc-map-card">
              <div className="sc-card-header">
                <h3>📍 Step 2: GPS Verification</h3>
                {inspectorGPS && (
                  <span className={`sc-status-tag ${withinRadius ? 'approved' : 'rejected'}`}>
                    {withinRadius ? '✅ In Range' : '⚠️ Out of Range'}
                  </span>
                )}
              </div>
              <div className="sc-card-body">
                <button
                  className="sc-get-location-btn"
                  onClick={getLocation}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? (
                    <><span className="sc-spinner" style={{ width: 18, height: 18, borderWidth: 2, marginBottom: 0, display: 'inline-block' }}></span> Getting GPS Location...</>
                  ) : inspectorGPS ? (
                    <>🔄 Refresh My Location</>
                  ) : (
                    <>📡 Get My GPS Location</>
                  )}
                </button>

                {gpsError && (
                  <div style={{ background: '#fef2f2', padding: '12px', borderRadius: '10px', color: '#dc2626', fontSize: '13px', marginBottom: '12px' }}>
                    ⚠️ {gpsError}
                  </div>
                )}

                <div className="sc-map-wrapper">
                  <MapContainer center={mapCenter} zoom={16} style={{ width: '100%', height: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapAutoCenter center={mapCenter} zoom={17} />

                    {/* Property marker */}
                    <Marker position={[parseFloat(selectedProperty.latitude), parseFloat(selectedProperty.longitude)]} icon={propertyIcon}>
                      <Popup><strong>🏠 {selectedProperty.title}</strong><br />Property Location</Popup>
                    </Marker>

                    {/* Radius circle */}
                    <Circle
                      center={[parseFloat(selectedProperty.latitude), parseFloat(selectedProperty.longitude)]}
                      radius={100}
                      pathOptions={{
                        color: inspectorGPS ? (withinRadius ? '#10b981' : '#ef4444') : '#6366f1',
                        fillOpacity: 0.1,
                        weight: 2,
                        dashArray: '5,5'
                      }}
                    />

                    {/* Inspector marker */}
                    {inspectorGPS && (
                      <Marker position={[inspectorGPS.lat, inspectorGPS.lng]} icon={inspectorIcon}>
                        <Popup><strong>📍 Your Location</strong><br />{inspectorGPS.lat.toFixed(6)}, {inspectorGPS.lng.toFixed(6)}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>

                {inspectorGPS && (
                  <>
                    <div className="sc-gps-info">
                      <div className="sc-gps-info-item">
                        <label>Your Position</label>
                        <span>{inspectorGPS.lat.toFixed(6)}, {inspectorGPS.lng.toFixed(6)}</span>
                      </div>
                      <div className="sc-gps-info-item">
                        <label>Property Position</label>
                        <span>{parseFloat(selectedProperty.latitude).toFixed(6)}, {parseFloat(selectedProperty.longitude).toFixed(6)}</span>
                      </div>
                    </div>
                    <div className={`sc-distance-badge ${withinRadius ? 'within' : 'outside'}`}>
                      {withinRadius ? '✅' : '⚠️'} {distance}m away
                      <small>{withinRadius ? 'Within 100m radius — GPS check passed!' : 'Outside 100m radius — Site check will be flagged for admin review'}</small>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Photo Capture */}
            <div className="sc-photo-card">
              <div className="sc-card-header">
                <h3>📸 Step 3: Photo Proof</h3>
                {photoTimestamp && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    📅 {photoTimestamp.toLocaleString()}
                  </span>
                )}
              </div>
              <div className="sc-card-body">
                {!photoPreview ? (
                  <label className="sc-capture-btn" htmlFor="photo-input">
                    <span className="icon">📸</span>
                    <h4>Capture Site Photo</h4>
                    <p>Take a photo of the property from your current location</p>
                    <input
                      id="photo-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handlePhotoCapture}
                    />
                  </label>
                ) : (
                  <div className="sc-photo-preview">
                    <img src={photoPreview} alt="Site check" />
                    <div className="sc-photo-timestamp">
                      <span>📅 {photoTimestamp?.toLocaleString()}</span>
                      <span>📍 {inspectorGPS ? `${inspectorGPS.lat.toFixed(4)}, ${inspectorGPS.lng.toFixed(4)}` : 'No GPS'}</span>
                    </div>
                    <button className="sc-remove-photo" onClick={() => { setPhoto(null); setPhotoPreview(null); setPhotoTimestamp(null); }}>✕</button>
                  </div>
                )}

                {/* Submit Button */}
                <div className="sc-submit-section" style={{ marginTop: '20px' }}>
                  <button
                    className={`sc-submit-btn ${inspectorGPS && photo ? 'ready' : ''}`}
                    onClick={handleSubmit}
                    disabled={!inspectorGPS || !photo || submitting}
                  >
                    {submitting ? (
                      <><span className="sc-spinner" style={{ width: 20, height: 20, borderWidth: 3, marginBottom: 0, display: 'inline-block' }}></span> Submitting...</>
                    ) : (
                      <>🚀 Submit Site Check</>
                    )}
                  </button>
                  {(!inspectorGPS || !photo) && (
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                      {!inspectorGPS && '📡 Get your GPS location first. '}
                      {!photo && '📸 Capture a photo. '}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Documents */}
          <div className="sc-docs-card sc-full-width">
            <div className="sc-card-header">
              <h3>📄 Step 4: Legal Documents</h3>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Upload title deed, ownership document, and ID card</span>
            </div>
            <div className="sc-card-body">
              <div className="sc-docs-grid">
                {docTypes.map(({ key, label, icon }) => {
                  const doc = getDocForType(key);
                  return (
                    <div key={key} className={`sc-doc-slot ${doc ? doc.status : ''}`}>
                      <span className="icon">{icon}</span>
                      <h4>{label}</h4>
                      {doc ? (
                        <>
                          <p>{doc.original_filename}</p>
                          <span className={`sc-doc-status-badge ${doc.status}`}>
                            {doc.status === 'verified' ? '✅ Verified' : doc.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                          </span>
                          {doc.admin_comment && (
                            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>💬 {doc.admin_comment}</p>
                          )}
                          {doc.status === 'rejected' && (
                            <button className="sc-doc-upload-btn" onClick={() => docInputRefs.current[key]?.click()}>
                              🔄 Re-upload
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <p>Not uploaded yet</p>
                          <button
                            className="sc-doc-upload-btn"
                            onClick={() => docInputRefs.current[key]?.click()}
                            disabled={uploadingDoc === key}
                          >
                            {uploadingDoc === key ? '⏳ Uploading...' : '📤 Upload'}
                          </button>
                        </>
                      )}
                      <input
                        ref={el => docInputRefs.current[key] = el}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files[0]) handleDocUpload(key, e.target.files[0]); }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Verification Progress */}
          {verificationStatus && (
            <div className="sc-progress-container">
              <h3>📊 Verification Progress</h3>
              <div className="sc-progress-steps">
                <div className={`sc-progress-step ${verificationStatus.site_check_status === 'approved' ? 'completed' : verificationStatus.site_check_status !== 'not_started' ? 'active' : ''}`}>
                  <div className="step-icon">{verificationStatus.site_check_status === 'approved' ? '✅' : verificationStatus.site_check_status === 'not_started' ? '⬜' : '🔄'}</div>
                  <h4>Site Check</h4>
                  <p>{verificationStatus.site_check_status.replace('_', ' ')}</p>
                </div>
                <div className={`sc-progress-connector ${verificationStatus.site_check_status === 'approved' ? 'done' : ''}`}></div>
                <div className={`sc-progress-step ${verificationStatus.all_documents_verified ? 'completed' : Object.keys(verificationStatus.documents || {}).length > 0 ? 'active' : ''}`}>
                  <div className="step-icon">{verificationStatus.all_documents_verified ? '✅' : Object.keys(verificationStatus.documents || {}).length > 0 ? '🔄' : '⬜'}</div>
                  <h4>Legal Documents</h4>
                  <p>{verificationStatus.all_documents_verified ? 'All verified' : `${Object.values(verificationStatus.documents || {}).filter(s => s === 'verified').length}/3 verified`}</p>
                </div>
                <div className={`sc-progress-connector ${verificationStatus.fully_verified ? 'done' : ''}`}></div>
                <div className={`sc-progress-step ${verificationStatus.fully_verified ? 'completed' : ''}`}>
                  <div className="step-icon">{verificationStatus.fully_verified ? '🎉' : '⬜'}</div>
                  <h4>Fully Verified</h4>
                  <p>{verificationStatus.fully_verified ? 'Property verified!' : 'Pending'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Previous Checks */}
          {previousChecks.length > 0 && (
            <div className="sc-status-card" style={{ marginTop: '24px' }}>
              <div className="sc-card-header">
                <h3>📋 Previous Site Checks ({previousChecks.length})</h3>
              </div>
              <div className="sc-card-body">
                <div className="sc-checks-list">
                  {previousChecks.map(check => (
                    <div key={check.id} className="sc-check-item">
                      <div className="sc-check-item-photo">
                        {check.photo_url ? (
                          <img src={check.photo_url.startsWith('http') ? check.photo_url : `${window.API_BASE}${check.photo_url}`} alt="Site" />
                        ) : (
                          <span style={{ fontSize: '24px' }}>📷</span>
                        )}
                      </div>
                      <div className="sc-check-item-info">
                        <h4>{check.inspector_name || 'Inspector'} — {Math.round(check.distance_meters)}m {check.within_radius ? '✅' : '⚠️'}</h4>
                        <p>📅 {new Date(check.created_at).toLocaleString()}</p>
                        {check.admin_comment && <p>💬 {check.admin_comment}</p>}
                      </div>
                      <span className={`sc-status-tag ${check.status}`}>
                        {check.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SiteCheckManager;
