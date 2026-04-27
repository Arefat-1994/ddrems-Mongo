import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ProfileApprovalGuard = ({ user, children, setCurrentPage }) => {
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfileApproval = async () => {
      try {
        if (!user?.id) {
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/profile-approval/check-approval/${user.id}`
        );

        setApprovalStatus(response.data);
        setLoading(false);

        // If profile is not approved, redirect to profile page
        if (!response.data.isApproved) {
          console.log('Profile not approved, redirecting to profile page');
          if (setCurrentPage) {
            setCurrentPage('profile');
          }
        }
      } catch (error) {
        console.error('Error checking profile approval:', error);
        setLoading(false);
      }
    };

    checkProfileApproval();
  }, [user?.id, setCurrentPage]);

  // Show loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>Verifying profile status...</p>
        </div>
      </div>
    );
  }

  // If profile is not approved, show message
  if (approvalStatus && !approvalStatus.isApproved) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '24px' }}>
            Profile Approval Required
          </h2>
          <p style={{ margin: '0 0 20px 0', color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
            {approvalStatus.needsCompletion
              ? 'Please complete your profile to access the dashboard. All fields are required.'
              : 'Your profile is pending admin approval. You will be notified once it\'s approved.'}
          </p>
          <div style={{
            background: '#f0f4ff',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px',
            color: '#667eea'
          }}>
            <strong>Status:</strong> {approvalStatus.needsCompletion ? 'Incomplete' : 'Pending Approval'}
          </div>
          <button
            onClick={() => setCurrentPage && setCurrentPage('profile')}
            style={{
              padding: '12px 30px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#5568d3'}
            onMouseLeave={(e) => e.target.style.background = '#667eea'}
          >
            {approvalStatus.needsCompletion ? '📝 Complete Profile' : '⏳ Waiting for Approval'}
          </button>
        </div>
      </div>
    );
  }

  // If approved, render children
  return children;
};

export default ProfileApprovalGuard;
