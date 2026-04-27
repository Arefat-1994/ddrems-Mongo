import React, { useState } from 'react';
import './DashboardHeader.css';
import { UserProfilePill } from './PageHeader';

const DashboardHeader = ({ user, onLogout, dashboardTitle, onSettingsClick }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">{dashboardTitle}</h1>
          <p className="header-subtitle">Welcome back, {user?.name || 'User'}</p>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <UserProfilePill user={user} onSettingsClick={onSettingsClick} />
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              padding: '8px 16px', background: '#ef4444', color: 'white',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <div className="confirm-header"><h3>🚪 Logout Confirmation</h3></div>
            <div className="confirm-body">
              <p>Are you sure you want to logout?</p>
              <p className="user-info">Logged in as: <strong>{user?.name}</strong></p>
            </div>
            <div className="confirm-actions">
              <button className="confirm-yes" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>Yes, Logout</button>
              <button className="confirm-no" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardHeader;
