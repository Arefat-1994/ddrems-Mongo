import React from 'react';
import './PageHeader.css';

const PageHeader = ({ title, subtitle, user, onLogout, actions }) => {
  return (
    <div className="page-header-container">
      <div className="page-header-content">
        <div className="page-header-text">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <div className="page-header-actions">
          {actions}
        </div>
      </div>
      <div className="page-header-user">
        <div className="user-info-header">
          <div className="user-avatar-header">
            {user?.profile_image ? (
              <img 
                src={user.profile_image} 
                alt={user.name} 
                className="user-avatar-image" 
              />
            ) : (
              user?.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div className="user-details-header">
            <span className="user-name">{user?.name}</span>
            <span className="user-role-badge">{user?.role}</span>
          </div>
        </div>
        <button className="logout-btn-header" onClick={onLogout} title="Logout">
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
