import React, { useState, useEffect, useCallback } from 'react';
import './CustomerProfile.css';
import axios from 'axios';

const CustomerProfile = ({ user, onComplete }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: user.name || '',
    phone_number: '',
    address: '',
    profile_photo: '',
    id_document: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/profiles/customer/${user.id}`);
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name,
        phone_number: response.data.phone_number || '',
        address: response.data.address || '',
        profile_photo: response.data.profile_photo || '',
        id_document: response.data.id_document || ''
      });
      if (response.data.profile_photo) setPhotoPreview(response.data.profile_photo);
      if (response.data.id_document) setDocPreview(response.data.id_document);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRequestEdit = async () => {
    if (!window.confirm('Are you sure you want to request permission to edit your profile? This will notify the admin team.')) {
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/profiles/customer/request-edit', {
        user_id: user.id,
        profile_id: profile.id
      });
      alert('✅ Edit request sent successfully! Admin will review your request.');
    } catch (error) {
      console.error('Error requesting edit:', error);
      alert('❌ Failed to send edit request. Please try again.');
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Photo size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profile_photo: reader.result });
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Document size must be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, id_document: reader.result });
        setDocPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (profile?.profile_status === 'approved') {
      // Only allow photo update for approved profiles
      if (!formData.profile_photo) {
        alert('Please select a profile photo to update');
        return;
      }
    } else {
      // Full validation for non-approved profiles
      if (!formData.full_name || !formData.phone_number) {
        alert('Please fill in all required fields');
        return;
      }

      if (!formData.profile_photo || !formData.id_document) {
        alert('Please upload both profile photo and ID document');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (profile) {
        // Update existing profile
        await axios.put(`http://localhost:5000/api/profiles/customer/${profile.id}`, formData);
        if (profile.profile_status === 'approved') {
          alert('✅ Profile photo updated successfully!');
        } else {
          alert('✅ Profile updated successfully!');
        }
      } else {
        // Create new profile
        await axios.post('http://localhost:5000/api/profiles/customer', {
          ...formData,
          user_id: user.id
        });
        alert('✅ Profile created successfully! Waiting for admin approval.');
      }
      
      if (onComplete) onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('❌ Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile...</div>;
  }

  return (
    <div className="customer-profile">
      <div className="profile-header">
        <div className="header-content">
          <h2>{profile ? '👤 My Profile' : '📋 Complete Your Profile'}</h2>
          <p>{profile ? 'Manage your profile information' : 'Please provide your information to access all features'}</p>
        </div>
        {profile && (
          <div className="header-actions">
            <button 
              className="btn-view-profile"
              onClick={() => setShowViewModal(true)}
            >
              👁️ View Full Profile
            </button>
            {profile.profile_status === 'approved' && (
              <button 
                className="btn-request-edit"
                onClick={handleRequestEdit}
              >
                ✏️ Request Edit
              </button>
            )}
          </div>
        )}
      </div>

      {profile && (
        <div className={`profile-status-banner ${profile.profile_status}`}>
          {profile.profile_status === 'pending' && (
            <>
              <span className="status-icon">⏳</span>
              <div>
                <strong>Profile Pending Approval</strong>
                <p>Your profile is being reviewed by our admin team</p>
              </div>
            </>
          )}
          {profile.profile_status === 'approved' && (
            <>
              <span className="status-icon">✅</span>
              <div>
                <strong>Profile Approved</strong>
                <p>You have full access to all features</p>
              </div>
            </>
          )}
          {profile.profile_status === 'rejected' && (
            <>
              <span className="status-icon">❌</span>
              <div>
                <strong>Profile Rejected</strong>
                <p>Reason: {profile.rejection_reason || 'Please contact support'}</p>
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-section">
          <h3>Personal Information</h3>
          
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              disabled={profile?.profile_status === 'approved'}
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              required
              placeholder="e.g., +251912345678"
              disabled={profile?.profile_status === 'approved'}
            />
          </div>

          <div className="form-group">
            <label>Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
              placeholder="Enter your address"
              disabled={profile?.profile_status === 'approved'}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Profile Photo *</h3>
          <div className="upload-area">
            {photoPreview ? (
              <div className="preview-container">
                <img src={photoPreview} alt="Profile" className="photo-preview" />
                <button
                  type="button"
                  className="btn-change"
                  onClick={() => document.getElementById('photo-input').click()}
                >
                  Change Photo
                </button>
              </div>
            ) : (
              <div className="upload-placeholder" onClick={() => document.getElementById('photo-input').click()}>
                <span className="upload-icon">📷</span>
                <p>Click to upload profile photo</p>
                <small>JPG, PNG (Max 5MB)</small>
              </div>
            )}
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>ID Document {profile?.profile_status !== 'approved' && '*'}</h3>
          {profile?.profile_status === 'approved' ? (
            <p className="section-hint">Document editing is restricted. Contact admin to request changes.</p>
          ) : (
            <p className="section-hint">Upload a clear photo of your ID card, passport, or driver's license</p>
          )}
          <div className="upload-area">
            {docPreview ? (
              <div className="preview-container">
                <img src={docPreview} alt="ID Document" className="doc-preview" />
                {profile?.profile_status !== 'approved' && (
                  <button
                    type="button"
                    className="btn-change"
                    onClick={() => document.getElementById('doc-input').click()}
                  >
                    Change Document
                  </button>
                )}
              </div>
            ) : (
              <div 
                className={`upload-placeholder ${profile?.profile_status === 'approved' ? 'disabled' : ''}`} 
                onClick={profile?.profile_status === 'approved' ? undefined : () => document.getElementById('doc-input').click()}
              >
                <span className="upload-icon">📄</span>
                <p>{profile?.profile_status === 'approved' ? 'Document upload disabled' : 'Click to upload ID document'}</p>
                <small>JPG, PNG, PDF (Max 10MB)</small>
              </div>
            )}
            {profile?.profile_status !== 'approved' && (
              <input
                id="doc-input"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleDocUpload}
                style={{ display: 'none' }}
              />
            )}
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting || (profile?.profile_status === 'approved' && !formData.profile_photo)}
          >
            {submitting ? '⏳ Submitting...' : 
             profile?.profile_status === 'approved' ? '📷 Update Photo' : 
             profile ? '💾 Update Profile' : '✅ Submit for Approval'}
          </button>
        </div>

        {!profile && (
          <div className="info-box">
            <h4>📋 What happens next?</h4>
            <ol>
              <li>Your profile will be reviewed by our admin team</li>
              <li>You'll receive a notification once approved</li>
              <li>After approval, you'll have full access to all features</li>
            </ol>
          </div>
        )}
      </form>

      {/* View Profile Modal */}
      {showViewModal && profile && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Full Profile Information</h3>
              <button 
                className="modal-close"
                onClick={() => setShowViewModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-view-section">
                <h4>Personal Information</h4>
                <div className="view-field">
                  <label>Full Name:</label>
                  <span>{profile.full_name}</span>
                </div>
                <div className="view-field">
                  <label>Email:</label>
                  <span>{user.email}</span>
                </div>
                <div className="view-field">
                  <label>Phone Number:</label>
                  <span>{profile.phone_number}</span>
                </div>
                <div className="view-field">
                  <label>Address:</label>
                  <span>{profile.address || 'Not provided'}</span>
                </div>
                <div className="view-field">
                  <label>Profile Status:</label>
                  <span className={`status-badge ${profile.profile_status}`}>
                    {profile.profile_status.charAt(0).toUpperCase() + profile.profile_status.slice(1)}
                  </span>
                </div>
                {profile.approved_at && (
                  <div className="view-field">
                    <label>Approved At:</label>
                    <span>{new Date(profile.approved_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="profile-view-section">
                <h4>Documents</h4>
                <div className="document-preview">
                  <div className="view-field">
                    <label>Profile Photo:</label>
                    {profile.profile_photo ? (
                      <img src={profile.profile_photo} alt="Profile" className="modal-photo-preview" />
                    ) : (
                      <span>No photo uploaded</span>
                    )}
                  </div>
                  <div className="view-field">
                    <label>ID Document:</label>
                    {profile.id_document ? (
                      <img src={profile.id_document} alt="ID Document" className="modal-doc-preview" />
                    ) : (
                      <span>No document uploaded</span>
                    )}
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

export default CustomerProfile;
