import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from './PageHeader';

const PasswordResetRequests = ({ user, onLogout, onSettingsClick }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/auth/password-requests`);
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching password reset requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleResetPassword = async (requestId) => {
    if (!window.confirm('Are you sure you want to reset the password for this user? A new secure password will be generated and emailed to them.')) {
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api/auth/admin/reset-password`, {
        requestId,
        adminId: user.id
      });
      alert('Password reset successfully and email sent to the user.');
      fetchRequests();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="password-reset-requests">
      <PageHeader
        title="Password Reset Requests"
        subtitle="Manage and process user password reset requests"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
      />

      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <p>Loading requests...</p>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <h2>No pending password reset requests</h2>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px', color: '#475569' }}>User Name</th>
                <th style={{ padding: '12px', color: '#475569' }}>Email</th>
                <th style={{ padding: '12px', color: '#475569' }}>Requested At</th>
                <th style={{ padding: '12px', color: '#475569' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{req.name}</td>
                  <td style={{ padding: '12px' }}>{req.email}</td>
                  <td style={{ padding: '12px' }}>{new Date(req.requested_at).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      background: req.status === 'verified' ? '#dcfce7' : '#fef9c3',
                      color: req.status === 'verified' ? '#166534' : '#854d0e'
                    }}>
                      {req.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleResetPassword(req.id)}
                      disabled={req.status !== 'verified'}
                      style={{ 
                        padding: '8px 16px', background: req.status === 'verified' ? '#3b82f6' : '#94a3b8', 
                        color: 'white', border: 'none', borderRadius: '6px', cursor: req.status === 'verified' ? 'pointer' : 'not-allowed'
                      }}
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequests;
