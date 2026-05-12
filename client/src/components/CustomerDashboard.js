import React, { useState, useEffect } from 'react';
import './CustomerDashboard.css';
import Sidebar from './Sidebar';
import Properties from './Properties';
import Messages from './Messages';
import Announcements from './Announcements';
import Agreements from './Agreements';
import CustomerProfile from './profiles/CustomerProfile';
import TopBar from './TopBar';
import MpesaPayment from './MpesaPayment';
import axios from 'axios';

const CustomerDashboard = ({ user, onLogout, setCurrentPage: setGlobalPage, setViewMapPropertyId }) => {
  const [currentPage, setCurrentPage] = useState('browse');
  const [profileStatus, setProfileStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProfileStatus();
  }, [user.id]);

  const checkProfileStatus = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:5000/api/profiles/customer/${user.id}`);
      setProfileStatus(response.data.profile_status);
      
      // Update user profile_approved and profile_completed in users table
      if (response.data.profile_status === 'approved') {
        await axios.put(`http://${window.location.hostname}:5000/api/users/${user.id}`, {
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
    { id: 'browse', label: 'Browse Properties', icon: '🏠', enabled: true },
    { id: 'profile', label: 'My Profile', icon: '👤', enabled: true },
    { id: 'announcements', label: 'Announcements', icon: '📢', enabled: profileStatus === 'approved' },
    { id: 'agreements', label: 'Agreements', icon: '📄', enabled: profileStatus === 'approved' },
    { id: 'messages', label: 'Messages', icon: '📧', enabled: profileStatus === 'approved' }
  ];

  const renderContent = () => {
    // Show profile completion gate
    if (profileStatus !== 'approved' && currentPage !== 'profile' && currentPage !== 'browse') {
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
      case 'browse':
        return <Properties user={user} setCurrentPage={setGlobalPage} setViewMapPropertyId={setViewMapPropertyId} />;
      case 'profile':
        return <CustomerProfile user={user} onComplete={checkProfileStatus} />;
      case 'announcements':
        return <Announcements user={user} />;
      case 'agreements':
        return <Agreements user={user} />;
      case 'messages':
        return <Messages user={user} />;
      case 'mpesa':
        return (
          <div style={{ padding: '24px' }}>
            <h2 style={{ marginBottom: '20px', color: '#1e293b' }}>📱 M-Pesa Payments</h2>
            <div style={{ background: 'linear-gradient(135deg, #00a651, #007a3d)', borderRadius: '12px', padding: '20px', color: 'white', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Safaricom Ethiopia M-Pesa</h3>
              <p style={{ margin: '6px 0 0 0', opacity: 0.9 }}>Use M-Pesa to pay for your property agreements securely.</p>
            </div>
            <p style={{ color: '#64748b' }}>To make an M-Pesa payment, go to your <strong>Agreements</strong> section, find your signed agreement, and click <strong>"Pay Now"</strong> — then select <strong>M-Pesa</strong> as your payment method.</p>
          </div>
        );
      default:
        return <Properties user={user} setCurrentPage={setGlobalPage} setViewMapPropertyId={setViewMapPropertyId} />;
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
        <TopBar user={user} onSettingsClick={() => setCurrentPage('profile')} />
        {profileStatus === 'not_created' && currentPage !== 'profile' && (
          <div className="alert alert-warning">
            ⚠️ Please complete your profile to access all features. 
            <button onClick={() => setCurrentPage('profile')}>Complete Profile</button>
          </div>
        )}
        {profileStatus === 'pending' && currentPage !== 'profile' && (
          <div className="alert alert-info">
            ⏳ Your profile is pending approval. You can browse properties while waiting.
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

export default CustomerDashboard;
