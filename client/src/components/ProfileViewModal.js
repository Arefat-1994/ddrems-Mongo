import React, { useState } from 'react';
import './ProfileViewModal.css';

const ProfileViewModal = ({ profile, user, onClose, onRequestEdit }) => {
  const [showFullProfile, setShowFullProfile] = useState(false);

  if (!profile) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <h2>👤 {profile.full_name || user?.name}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="profile-modal-body">
          {/* Profile Status */}
          {profile.profile_status && (
            <div className={`profile-status-badge ${profile.profile_status}`}>
              {profile.profile_status === 'approved' && '✅ Approved'}
              {profile.profile_status === 'pending' && '⏳ Pending'}
              {profile.profile_status === 'rejected' && '❌ Rejected'}
            </div>
          )}

          {/* Quick Info */}
          <div className="quick-info">
            <div className="info-item">
              <span className="info-label">📞 Phone:</span>
              <span className="info-value">{profile.phone_number || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">📍 Address:</span>
              <span className="info-value">{profile.address || 'N/A'}</span>
            </div>
            {profile.license_number && (
              <div className="info-item">
                <span className="info-label">🎖️ License:</span>
                <span className="info-value">{profile.license_number}</span>
              </div>
            )}
          </div>

          {/* Profile Photo */}
          {profile.profile_photo && (
            <div className="profile-photo-section">
              <h3>📷 Profile Photo</h3>
              <img src={profile.profile_photo} alt="Profile" className="profile-photo" />
            </div>
          )}

          {/* Documents */}
          {(profile.id_document || profile.broker_license) && (
            <div className="documents-section">
              <h3>📄 Documents</h3>
              <div className="documents-grid">
                {profile.id_document && (
                  <div className="document-item">
                    <h4>ID Document</h4>
                    <img src={profile.id_document} alt="ID" className="document-preview" />
                  </div>
                )}
                {profile.broker_license && (
                  <div className="document-item">
                    <h4>Broker License</h4>
                    <img src={profile.broker_license} alt="License" className="document-preview" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full Profile Details */}
          {showFullProfile && (
            <div className="full-profile-details">
              <h3>📋 Full Profile Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <strong>Full Name:</strong>
                  <p>{profile.full_name}</p>
                </div>
                <div className="detail-item">
                  <strong>Phone Number:</strong>
                  <p>{profile.phone_number}</p>
                </div>
                <div className="detail-item">
                  <strong>Address:</strong>
                  <p>{profile.address}</p>
                </div>
                {profile.license_number && (
                  <div className="detail-item">
                    <strong>License Number:</strong>
                    <p>{profile.license_number}</p>
                  </div>
                )}
                {profile.profile_status && (
                  <div className="detail-item">
                    <strong>Profile Status:</strong>
                    <p>{profile.profile_status.toUpperCase()}</p>
                  </div>
                )}
                {profile.created_at && (
                  <div className="detail-item">
                    <strong>Created:</strong>
                    <p>{new Date(profile.created_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="profile-modal-actions">
          <button
            className="btn-view-full"
            onClick={() => setShowFullProfile(!showFullProfile)}
          >
            {showFullProfile ? '👁️ Hide Full Profile' : '👁️ View Full Profile'}
          </button>
          <button
            className="btn-request-edit"
            onClick={() => onRequestEdit(profile)}
          >
            ✏️ Request Edit
          </button>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ProfileViewModal;
