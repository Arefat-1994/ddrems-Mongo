import React, { useState, useEffect } from 'react';
import './OwnerDashboard.css';
import Sidebar from './Sidebar';
import Properties from './Properties';
import Messages from './Messages';
import Announcements from './Announcements';
import Agreements from './Agreements';
import OwnerProfile from './profiles/OwnerProfile';
import MessageNotificationWidget from './MessageNotificationWidget';
import axios from 'axios';

const OwnerDashboard = ({ user, onLogout }) => {
  const [currentPage, setCurrentPage] = useState('properties');
  const [profileStatus, setProfileStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfileStatus();
  }, [user.id]);

  const checkProfileStatus = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/profiles/owner/${user.id}`);
      setProfileStatus(response.data.profile_status);
      
      // Update user profile_approved and profile_completed in users table
      if (response.data.profile_status === 'approved') {
        await axios.put(`http://localhost:5000/api/users/${user.id}`, {
          profile_approved: true,
          profile_completed: true
        });
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setProfileStatus('not_created');
      }
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { id: 'properties', label: 'My Properties', icon: '🏠', enabled: profileStatus === 'approved' },
    { id: 'profile', label: 'My Profile', icon: '👤', enabled: true },
    { id: 'announcements', label: 'Announcements', icon: '📢', enabled: profileStatus === 'approved' },
    { id: 'agreements', label: 'Agreements', icon: '📄', enabled: profileStatus === 'approved' },
    { id: 'messages', label: 'Messages', icon: '📧', enabled: profileStatus === 'approved' }
  ];

  const renderContent = () => {
    // Show profile completion gate
    if (profileStatus !== 'approved' && currentPage !== 'profile') {
      return (
        <div className="profile-gate">
          <div className="gate-content">
            <span className="gate-icon">🔒</span>
            <h2>Profile Approval Required</h2>
            <p>Please complete and get your profile approved to access this feature.</p>
            <button className="btn-primary" onClick={() => setCurrentPage('profile')}>
              Go to Profile
            </button>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'properties':
        return <Properties user={user} ownerView={true} />;
      case 'profile':
        return <OwnerProfile user={user} onComplete={checkProfileStatus} />;
      case 'announcements':
        return <Announcements user={user} />;
      case 'agreements':
        return <Agreements user={user} />;
      case 'messages':
        return <Messages user={user} />;
      default:
        return <Properties user={user} ownerView={true} />;
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        user={user}
        items={sidebarItems}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={onLogout}
      />
      <div className="dashboard-main">
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
          <MessageNotificationWidget 
            userId={user?.id}
            onNavigateToMessages={() => setCurrentPage('messages')}
          />
        </div>
        {profileStatus === 'not_created' && currentPage !== 'profile' && (
          <div className="alert alert-warning">
            ⚠️ Please complete your profile to access all features. 
            <button onClick={() => setCurrentPage('profile')}>Complete Profile</button>
          </div>
        )}
        {profileStatus === 'pending' && currentPage !== 'profile' && (
          <div className="alert alert-info">
            ⏳ Your profile is pending approval. Limited access until approved.
          </div>
        )}
        {profileStatus === 'rejected' && currentPage !== 'profile' && (
          <div className="alert alert-danger">
            ❌ Your profile was rejected. Please update your profile.
            <button onClick={() => setCurrentPage('profile')}>Update Profile</button>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default OwnerDashboard;
