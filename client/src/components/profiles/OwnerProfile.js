import React, { useState, useEffect } from 'react';
import './UnifiedProfile.css';
import axios from 'axios';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const OwnerProfile = ({ user, onComplete }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showViewModal, setShowViewModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editRequest, setEditRequest] = useState(null);
  const [formData, setFormData] = useState({
    full_name: user.name || '',
    phone_number: user.phone || '',
    address: '',
    profile_photo: '',
    id_document: '',
    business_license: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [requestedFields, setRequestedFields] = useState([]);
  const [activeDetailTab, setActiveDetailTab] = useState('Personal Info');

  const countryCodes = [
    { code: '+251', name: 'Ethiopia' },
    { code: '+1', name: 'US/Canada' },
    { code: '+44', name: 'UK' },
    { code: '+971', name: 'UAE' },
    { code: '+254', name: 'Kenya' },
    { code: '+91', name: 'India' },
    { code: '+86', name: 'China' },
    { code: '+49', name: 'Germany' },
    { code: '+33', name: 'France' },
    { code: '+61', name: 'Australia' }
  ];
  const [selectedCountryCode, setSelectedCountryCode] = useState('+251');

  const getFileUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('data:')) return path;
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return `http://${window.location.hostname}:5000/${cleanPath}`;
  };

  useEffect(() => {
    fetchProfile();
    fetchEditRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.name, user.phone]);

  const fetchEditRequest = async () => {
    try {
      const response = await axios.get(`${API_BASE}/edit-requests/user/${user.id}`);
      if (response.data && response.data.length > 0) {
        const latestRequest = response.data[0];
        setEditRequest(latestRequest);
        if (latestRequest.status === 'approved') {
          setEditMode(true);
        }
      }
    } catch (error) {
      console.error('Error fetching edit request:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      console.log('[OwnerProfile] Fetching profile for user:', user.id);
      const response = await axios.get(`${API_BASE}/profiles/owner/${user.id}`);
      console.log('[OwnerProfile] Profile found:', response.data);
      setProfile(response.data.profile_status ? response.data : null);

      let rawPhone = response.data.phone_number || response.data.phone || user.phone || '';
      let parsedCountryCode = '+251';
      for (let c of countryCodes) {
        if (rawPhone.startsWith(c.code)) {
          parsedCountryCode = c.code;
          rawPhone = rawPhone.substring(c.code.length);
          break;
        }
      }
      setSelectedCountryCode(parsedCountryCode);

      setFormData({
        full_name: response.data.full_name || response.data.name || user.name || '',
        phone_number: rawPhone,
        address: response.data.address || '',
        profile_photo: response.data.profile_photo || '',
        id_document: response.data.id_document || '',
        business_license: response.data.business_license || ''
      });
      if (response.data.profile_photo) setPhotoPreview(response.data.profile_photo);
      if (response.data.id_document) setDocPreview(response.data.id_document);
      if (response.data.business_license) setLicensePreview(response.data.business_license);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching profile:', error);
      } else {
        console.log('[OwnerProfile] No existing profile found, using registration data');
        let initialPhone = user.phone || '';
        let initialCountryCode = '+251';
        for (let c of countryCodes) {
          if (initialPhone.startsWith(c.code)) {
            initialCountryCode = c.code;
            initialPhone = initialPhone.substring(c.code.length);
            break;
          }
        }
        setSelectedCountryCode(initialCountryCode);
        // No profile exists yet, keep the initial formData with user data
        setFormData(prev => ({
          ...prev,
          full_name: user.name || prev.full_name,
          phone_number: initialPhone || prev.phone_number
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // If in edit mode, only allow changes if the field is approved
    if (!!profile && editMode && editRequest) {
      if (!editRequest.approved_fields?.includes(name)) return;
    } else if (!!profile && !editMode) {
      return;
    }

    if (name === 'full_name') {
      const alphabeticValue = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData({ ...formData, [name]: alphabeticValue });
      return;
    }

    if (name === 'phone_number') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData({ ...formData, [name]: numericValue });
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleFileUpload = (e, field, setPreview) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = field === 'profile_photo' ? 5 : 10;
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File size must be less than ${maxSize}MB`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result });
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.phone_number) {
      alert('Please fill in all required fields');
      return;
    }

    if (!formData.profile_photo || !formData.id_document || !formData.business_license) {
      alert('Please upload all required documents');
      return;
    }

    setSubmitting(true);

    try {
      const fullPhoneNumber = `${selectedCountryCode}${formData.phone_number}`;

      if (profile) {
        await axios.put(`${API_BASE}/profiles/owner/${profile.id}`, { ...formData, phone_number: fullPhoneNumber });
        alert('✅ Profile updated successfully!');
        
        // If in edit mode, submit the edit request
        if (editMode && editRequest) {
          await axios.post(`${API_BASE}/edit-requests/${editRequest.id}/submit`, {
            user_id: user.id,
            profile_type: 'owner',
            updated_data: { ...formData, phone_number: fullPhoneNumber }
          });
          alert('✅ Changes submitted for admin review!');
          setEditMode(false);
          setShowEditModal(false);
          fetchEditRequest();
        }
      } else {
        await axios.post(`${API_BASE}/profiles/owner`, {
          ...formData,
          phone_number: fullPhoneNumber,
          user_id: user.id
        });
        alert('✅ Profile created successfully! Waiting for admin approval.');
      }
      
      if (onComplete) onComplete();
      fetchProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEdit = async () => {
    if (!editReason.trim()) {
      alert('Please provide a reason for editing your profile');
      return;
    }

    if (requestedFields.length === 0) {
      alert('Please select at least one field to edit.');
      return;
    }

    if (!window.confirm('Are you sure you want to request permission to edit your profile? This will notify the admin team.')) {
      return;
    }

    try {
      await axios.post(`${API_BASE}/edit-requests/request`, {
        user_id: user.id,
        profile_type: 'owner',
        profile_id: profile.id,
        reason: editReason,
        requested_fields: requestedFields
      });
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.frequency.value = 600;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => osc.stop(), 200);
      } catch(e) {}
      alert('✅ Edit request sent successfully! Admin will review your request.');
      setEditReason('');
      setRequestedFields([]);
      fetchEditRequest();
    } catch (error) {
      console.error('Error requesting edit:', error);
      alert('❌ Failed to send edit request. Please try again.');
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  const renderProfileForm = () => (
    <form onSubmit={handleSubmit} className="profile-form">
      <div className="form-section" style={{ marginBottom: '24px' }}>
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Personal Information</h3>
        <div style={{ display: 'grid', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Full Name *</label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required disabled={!!profile && (!editMode || (editMode && !editRequest?.approved_fields?.includes('full_name')))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Phone Number *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                value={selectedCountryCode} 
                onChange={(e) => setSelectedCountryCode(e.target.value)}
                style={{ width: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                disabled={!!profile && (!editMode || (editMode && !editRequest?.approved_fields?.includes('phone_number')))}
              >
                {countryCodes.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <input type="tel" name="phone_number" value={formData.phone_number} onChange={handleChange} placeholder="Digits only" required disabled={!!profile && (!editMode || (editMode && !editRequest?.approved_fields?.includes('phone_number')))} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Address</label>
            <textarea name="address" value={formData.address} onChange={handleChange} rows="3" disabled={!!profile && (!editMode || (editMode && !editRequest?.approved_fields?.includes('address')))} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
          </div>
        </div>
      </div>

      <div className="form-section" style={{ marginBottom: '24px' }}>
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Documents *</h3>
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Profile Photo *</label>
            <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer' }} onClick={() => document.getElementById('photo-input').click()}>
              {photoPreview ? <img src={photoPreview} style={{ height: '80px', objectFit: 'contain' }} alt="preview" /> : <div style={{ color: '#888' }}>📷 Upload photo</div>}
            </div>
            <input id="photo-input" type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'profile_photo', setPhotoPreview)} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>ID Document *</label>
            <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer' }} onClick={() => document.getElementById('doc-input').click()}>
              {docPreview ? <img src={docPreview} style={{ height: '80px', objectFit: 'contain' }} alt="preview" /> : <div style={{ color: '#888' }}>📄 Upload ID</div>}
            </div>
            <input id="doc-input" type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'id_document', setDocPreview)} style={{ display: 'none' }} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Business License *</label>
            <div style={{ border: '2px dashed #ccc', padding: '20px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer' }} onClick={() => document.getElementById('license-input').click()}>
              {licensePreview ? <img src={licensePreview} style={{ height: '80px', objectFit: 'contain' }} alt="preview" /> : <div style={{ color: '#888' }}>📜 Upload license</div>}
            </div>
            <input id="license-input" type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'business_license', setLicensePreview)} style={{ display: 'none' }} />
          </div>
        </div>
      </div>
      
      <button type="submit" disabled={submitting} style={{ background: '#2563eb', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '6px', fontWeight: '600', width: '100%', cursor: 'pointer' }}>
        {submitting ? '⏳ Submitting...' : '✅ Submit Details'}
      </button>
    </form>
  );

  // Fallback to original form if profile is not completed
  if (!profile && !loading) {
    return (
      <div className="unified-profile-container" style={{ padding: '24px' }}>
        <div className="form-registration-view">
          <div className="profile-info-banner" style={{ background: '#eff6ff', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>📋 Complete Your Owner Profile</h3>
            <p style={{ margin: 0, color: '#3b82f6', fontSize: '14px' }}>Please complete your profile to start listing properties.</p>
          </div>
          {renderProfileForm()}
        </div>
      </div>
    );
  }

  return (
    <div className="unified-profile-container">
      {/* LEFT PANE: DEFAULT VIEW */}
      <div className="profile-card-default">
        <img src={profile.profile_photo || 'https://via.placeholder.com/140'} alt="Profile" className="profile-avatar-large" />
        <h2 className="profile-name-main">{profile.full_name || user.name}</h2>
        <span className="profile-role-badge">Owner Profile</span>
        
        <button className="btn-view-profile-main" onClick={() => setShowViewModal(true)}>
          👁️ View Profile
        </button>

        {editMode && (
          <button className="btn-view-profile-main" style={{ background: '#10b981', marginTop: '12px' }} onClick={() => setShowEditModal(true)}>
            ✏️ Edit Profile
          </button>
        )}

        {profile.profile_status !== 'approved' && (
          <div className="security-note" style={{ background: profile.profile_status === 'pending' ? '#fffbeb' : '#fef2f2', borderColor: profile.profile_status === 'pending' ? '#fcd34d' : '#fecaca' }}>
            <i>{profile.profile_status === 'pending' ? '⏳' : '❌'}</i>
            <div>
              <strong style={{ display: 'block', color: '#111827' }}>Status: {profile.profile_status.toUpperCase()}</strong>
              {profile.profile_status === 'rejected' ? profile.rejection_reason : 'Awaiting administrator approval.'}
            </div>
          </div>
        )}

        <div className="security-note">
          <i>🛡️</i>
          <span>For security reasons, your full profile information is hidden. Click on <strong>View Profile</strong> to see all details.</span>
        </div>
      </div>

      {/* RIGHT PANE: DETAILS PANEL */}
      {showViewModal && (
        <div className="profile-details-panel">
          <div className="panel-header">
            <h3>Owner Profile Details</h3>
            <button className="btn-close-panel" onClick={() => setShowViewModal(false)}>✕</button>
          </div>
          
          <div className="panel-body">
            <div className="panel-tabs">
              <button className={`panel-tab-btn ${activeDetailTab === 'Personal Info' ? 'active' : ''}`} onClick={() => setActiveDetailTab('Personal Info')}>
                👤 Personal Info
              </button>
              <button className={`panel-tab-btn ${activeDetailTab === 'Documents' ? 'active' : ''}`} onClick={() => setActiveDetailTab('Documents')}>
                📄 Documents
              </button>
              <button className={`panel-tab-btn ${activeDetailTab === 'Verification' ? 'active' : ''}`} onClick={() => setActiveDetailTab('Verification')}>
                📜 Verification
              </button>
              {profile.profile_status === 'approved' && !editRequest && (
                <button className={`panel-tab-btn ${activeDetailTab === 'Edit Request' ? 'active' : ''}`} onClick={() => setActiveDetailTab('Edit Request')}>
                  ✏️ Edit Request
                </button>
              )}
            </div>

            <div className="panel-content">
              {activeDetailTab === 'Personal Info' && (
                <div>
                  <h4 className="section-title">Personal Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Full Name</span>
                      <span className="info-value">{profile.full_name}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{user.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Phone</span>
                      <span className="info-value">{profile.phone_number && !profile.phone_number.startsWith('+') ? `${selectedCountryCode}${profile.phone_number}` : profile.phone_number}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Address</span>
                      <span className="info-value">{profile.address || '-'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Role</span>
                      <span className="info-value">Owner</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Member Since</span>
                      <span className="info-value">{new Date(profile.created_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeDetailTab === 'Documents' && (
                <div>
                  <h4 className="section-title">Personal Documents</h4>
                  <div className="document-list">
                    {profile.id_document && (
                       <div className="document-item">
                         <div className="doc-info">
                           <span className="doc-icon">📄</span>
                           <div>
                             <p className="doc-name">ID_Proof</p>
                             <p className="doc-meta">Uploaded Document</p>
                           </div>
                         </div>
                         <button className="btn-view-doc" onClick={() => setSelectedDoc(getFileUrl(profile.id_document))}>
                           👁️ View
                         </button>
                       </div>
                    )}
                    {profile.profile_photo && (
                       <div className="document-item">
                         <div className="doc-info">
                           <span className="doc-icon">🖼️</span>
                           <div>
                             <p className="doc-name">Profile_Photo</p>
                             <p className="doc-meta">Uploaded Photo</p>
                           </div>
                         </div>
                         <button className="btn-view-doc" onClick={() => setSelectedDoc(getFileUrl(profile.profile_photo))}>
                           👁️ View
                         </button>
                       </div>
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'Verification' && (
                <div>
                  <h4 className="section-title">Verification & Licensing</h4>
                  <div className="document-list">
                    {profile.business_license ? (
                       <div className="document-item">
                         <div className="doc-info">
                           <span className="doc-icon">📜</span>
                           <div>
                             <p className="doc-name">Business License / Property Ownership Cert.</p>
                             <p className="doc-meta">Official Verification</p>
                           </div>
                         </div>
                         <button className="btn-view-doc" onClick={() => setSelectedDoc(getFileUrl(profile.business_license))}>
                           👁️ View
                         </button>
                       </div>
                    ) : (
                       <p style={{ color: '#6b7280', fontSize: '14px' }}>No verification documents uploaded.</p>
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'Edit Request' && profile.profile_status === 'approved' && !editRequest && (
                <div>
                  <h4 className="section-title">Edit Request</h4>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <textarea 
                          className="edit-reason-input"
                          placeholder="Enter reason for edit request..."
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                        />
                        <div style={{ margin: '16px 0' }}>
                          <h5 style={{ margin: '0 0 8px 0' }}>Select Fields to Edit:</h5>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                              { id: 'full_name', label: 'Full Name' },
                              { id: 'phone_number', label: 'Phone Number' },
                              { id: 'address', label: 'Address' },
                              { id: 'profile_photo', label: 'Profile Photo' },
                              { id: 'id_document', label: 'ID Document' },
                              { id: 'business_license', label: 'Business License' }
                            ].map(field => (
                              <label key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={requestedFields.includes(field.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setRequestedFields([...requestedFields, field.id]);
                                    else setRequestedFields(requestedFields.filter(f => f !== field.id));
                                  }}
                                />
                                {field.label}
                              </label>
                            ))}
                          </div>
                        </div>
                        <button className="btn-submit-edit" onClick={() => {
                          handleRequestEdit();
                          setActiveDetailTab('Personal Info');
                        }}>
                          Submit Request 🚀
                        </button>
                      </div>
                      <div style={{ flex: 1, background: '#e0e7ff', padding: '16px', borderRadius: '8px', fontSize: '13px', color: '#1e3a8a' }}>
                        <strong style={{ display: 'block', marginBottom: '8px' }}>ℹ️ How it works?</strong>
                        <ol style={{ margin: 0, paddingLeft: '16px' }}>
                          <li style={{ marginBottom: '4px' }}>Submit your edit request reason</li>
                          <li style={{ marginBottom: '4px' }}>Admin will review it</li>
                          <li>You will be notified and given temporary edit access upon approval</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className="unified-modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="unified-modal-content doc-viewer" onClick={e => e.stopPropagation()}>
            <div className="unified-modal-header">
              <h3>Document Preview</h3>
              <button className="modal-close-btn" onClick={() => setSelectedDoc(null)}>✕</button>
            </div>
            <div className="unified-modal-body doc-body">
              {selectedDoc.startsWith('data:image') ? (
                <img src={selectedDoc} className="doc-image" alt="Document Preview" />
              ) : (
                <iframe className="doc-frame" src={selectedDoc} title="Document Preview" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {showEditModal && (
        <div className="unified-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="unified-modal-content" style={{ maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="unified-modal-header">
              <h3>Update Owner Profile</h3>
              <button className="modal-close-btn" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="unified-modal-body">
               {renderProfileForm()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerProfile;
