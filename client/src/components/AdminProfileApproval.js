import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminProfileApproval = ({ user, onLogout }) => {
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [approvedProfiles, setApprovedProfiles] = useState([]);
  const [rejectedProfiles, setRejectedProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      const response = await axios.get(`${API_BASE}/profile-approval/all`);
      setPendingProfiles(response.data.pending || []);
      setApprovedProfiles(response.data.approved || []);
      setRejectedProfiles(response.data.rejected || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setMessage('❌ Error loading profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProfile = async (userId) => {
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.post(`${API_BASE}/profile-approval/${userId}/approve`);
      setMessage('✅ Profile approved successfully!');
      setTimeout(() => setMessage(''), 3000);
      fetchProfiles();
    } catch (error) {
      setMessage('❌ Error approving profile');
    }
  };

  const handleRejectProfile = async (userId) => {
    try {
      const API_BASE = `http://${window.location.hostname}:5000/api`;
      await axios.post(`${API_BASE}/profile-approval/${userId}/reject`);
      setMessage('✅ Profile rejected');
      setTimeout(() => setMessage(''), 3000);
      fetchProfiles();
    } catch (error) {
      setMessage('❌ Error rejecting profile');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>
            👤 Profile Approval Management
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Review and approve user profiles
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '0',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
            {['pending', 'approved', 'rejected'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '15px',
                  background: activeTab === tab ? '#667eea' : 'white',
                  color: activeTab === tab ? 'white' : '#666',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  textTransform: 'capitalize'
                }}
              >
                {tab === 'pending' && '⏳ Pending'}
                {tab === 'approved' && '✅ Approved'}
                {tab === 'rejected' && '❌ Rejected'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ padding: '20px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                Loading profiles...
              </div>
            ) : (
              <>
                {message && (
                  <div style={{
                    padding: '12px',
                    background: message.includes('✅') ? '#d4edda' : '#f8d7da',
                    color: message.includes('✅') ? '#155724' : '#721c24',
                    borderRadius: '6px',
                    marginBottom: '20px'
                  }}>
                    {message}
                  </div>
                )}

                {activeTab === 'pending' && pendingProfiles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No pending profiles
                  </div>
                )}
                {activeTab === 'pending' && pendingProfiles.map(p => (
                  <div key={p.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{p.name}</strong> ({p.role})<br/>
                        <span style={{ fontSize: '14px', color: '#666' }}>{p.email} • {p.phone || 'No phone'}</span>
                      </div>
                      <div>
                        <button onClick={() => handleApproveProfile(p.id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}>Approve</button>
                        <button onClick={() => handleRejectProfile(p.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                      </div>
                    </div>
                  </div>
                ))}

                {activeTab === 'approved' && approvedProfiles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No approved profiles
                  </div>
                )}
                {activeTab === 'approved' && approvedProfiles.map(p => (
                  <div key={p.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#f0fdf4' }}>
                    <strong>{p.name}</strong> ({p.role})<br/>
                    <span style={{ fontSize: '14px', color: '#666' }}>{p.email} • {p.phone || 'No phone'}</span>
                  </div>
                ))}

                {activeTab === 'rejected' && rejectedProfiles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    No rejected profiles
                  </div>
                )}
                {activeTab === 'rejected' && rejectedProfiles.map(p => (
                  <div key={p.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fef2f2' }}>
                    <strong>{p.name}</strong> ({p.role})<br/>
                    <span style={{ fontSize: '14px', color: '#666' }}>{p.email} • {p.phone || 'No phone'}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfileApproval;
