import React from 'react';
import './PageHeader.css';

// Shared user profile pill used on every page top-right corner
export const UserProfilePill = ({ user, onSettingsClick }) => {
  const getProfileImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    return `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`;
  };

  const imgUrl = getProfileImageUrl(user?.profile_image);

  const [showFallback, setShowFallback] = React.useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
      {/* Pill Card */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        background: 'white', padding: '10px 22px',
        borderRadius: '50px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Circular Photo */}
        <div style={{
          width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          {imgUrl && !showFallback ? (
            <img
              src={imgUrl}
              alt={user?.name || 'User'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={() => setShowFallback(true)}
            />
          ) : (
            <span style={{ fontSize: '22px', fontWeight: '700', color: 'white' }}>
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        {/* Name + Role */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', lineHeight: '1.2' }}>
            {user?.name || 'User'}
          </span>
          <span style={{
            fontSize: '12px', color: '#6b7280', background: '#f3f4f6',
            padding: '3px 12px', borderRadius: '12px',
            textTransform: 'uppercase', fontWeight: '600',
            letterSpacing: '0.5px', width: 'fit-content'
          }}>
            {user?.role === 'user' ? 'USER' : (user?.role?.replace('_', ' ') || 'GUEST').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Settings */}
      <div
        onClick={() => onSettingsClick && onSettingsClick()}
        title="Settings"
        style={{ fontSize: '28px', cursor: 'pointer', color: '#9ca3af', transition: 'color 0.3s' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
      >
        ⚙️
      </div>
    </div>
  );
};

const PageHeader = ({ title, subtitle, user, onLogout, onSettingsClick, actions }) => {
  return (
    <div className="page-header-container">
      <div className="page-header-content">
        <div className="page-header-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="page-header-actions">{actions}</div>
      </div>
      <div className="page-header-user">
        <UserProfilePill user={user} onSettingsClick={onSettingsClick} />
      </div>
    </div>
  );
};

export default PageHeader;
