import React, { useState, useEffect } from 'react';
import './OwnerProfile.css';
import axios from 'axios';

const OwnerProfile = ({ user, onComplete }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: user.name || '',
    phone_number: '',
    address: '',
    profile_photo: '',
    id_document: '',
    business_license: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [docPreview, setDocPreview] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/profiles/owner/${user.id}`);
      setProfile(response.data);
      setFormData({
        full_name: response.data.full_name,
        phone_number: response.data.phone_number || '',
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
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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
      if (profile) {
        await axios.put(`http://localhost:5000/api/profiles/owner/${profile.id}`, formData);
        alert('✅ Profile updated successfully!');
      } else {
        await axios.post('http://localhost:5000/api/profiles/owner', {
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
    <div className="owner-profile">
      <div className="profile-header">
        <h2>🏢 Property Owner Profile</h2>
        <p>Complete your profile to start listing properties</p>
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
                <p>You can now add and manage properties</p>
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
              onChange={(e) => handleFileUpload(e, 'profile_photo', setPhotoPreview)}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>ID Document *</h3>
          <p className="section-hint">Upload a clear photo of your ID card, passport, or driver's license</p>
          <div className="upload-area">
            {docPreview ? (
              <div className="preview-container">
                <img src={docPreview} alt="ID Document" className="doc-preview" />
                <button
                  type="button"
                  className="btn-change"
                  onClick={() => document.getElementById('doc-input').click()}
                >
                  Change Document
                </button>
              </div>
            ) : (
              <div className="upload-placeholder" onClick={() => document.getElementById('doc-input').click()}>
                <span className="upload-icon">📄</span>
                <p>Click to upload ID document</p>
                <small>JPG, PNG, PDF (Max 10MB)</small>
              </div>
            )}
            <input
              id="doc-input"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileUpload(e, 'id_document', setDocPreview)}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Business License *</h3>
          <p className="section-hint">Upload your business license or property ownership certificate</p>
          <div className="upload-area">
            {licensePreview ? (
              <div className="preview-container">
                <img src={licensePreview} alt="Business License" className="doc-preview" />
                <button
                  type="button"
                  className="btn-change"
                  onClick={() => document.getElementById('license-input').click()}
                >
                  Change License
                </button>
              </div>
            ) : (
              <div className="upload-placeholder" onClick={() => document.getElementById('license-input').click()}>
                <span className="upload-icon">📜</span>
                <p>Click to upload business license</p>
                <small>JPG, PNG, PDF (Max 10MB)</small>
              </div>
            )}
            <input
              id="license-input"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileUpload(e, 'business_license', setLicensePreview)}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-submit"
            disabled={submitting}
          >
            {submitting ? '⏳ Submitting...' : profile ? '💾 Update Profile' : '✅ Submit for Approval'}
          </button>
        </div>

        {!profile && (
          <div className="info-box">
            <h4>📋 What happens next?</h4>
            <ol>
              <li>Your profile and documents will be reviewed by our admin team</li>
              <li>You'll receive a notification once approved</li>
              <li>After approval, you can add and manage properties</li>
            </ol>
          </div>
        )}
      </form>
    </div>
  );
};

export default OwnerProfile;
