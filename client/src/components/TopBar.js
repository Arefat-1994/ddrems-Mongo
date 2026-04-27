import React from 'react';
import { UserProfilePill } from './PageHeader';

/**
 * TopBar — fixed top-right profile pill shown on every dashboard page.
 * Drop this inside any dashboard-main div.
 */
const TopBar = ({ user, onSettingsClick }) => {
  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '24px',
      zIndex: 999,
      display: 'flex',
      alignItems: 'center',
    }}>
      <UserProfilePill user={user} onSettingsClick={onSettingsClick} />
    </div>
  );
};

export default TopBar;
