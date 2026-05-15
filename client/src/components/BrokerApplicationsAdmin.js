import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SystemAdminDashboard.css';

const BrokerApplicationsAdmin = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${window.API_URL}/broker-applications`);
      setApplications(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to approve this application? An account will be created automatically.')) return;
    
    try {
      await axios.post(`${window.API_URL}/broker-applications/${id}/approve`);
      alert('Application approved successfully! Account has been created and email sent.');
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      console.error('Error approving:', err);
      alert(err.response?.data?.message || 'Failed to approve application.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this application?')) return;
    
    try {
      await axios.post(`${window.API_URL}/broker-applications/${id}/reject`);
      alert('Application rejected.');
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Failed to reject application.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY DELETE this application record?')) return;
    
    try {
      await axios.delete(`${window.API_URL}/broker-applications/${id}`);
      alert('Application record deleted.');
      fetchApplications();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Failed to delete record. (Ensure delete route is implemented)');
    }
  };

  const getDocUrl = (url) => {
    if (!url) return '#';
    if (url.startsWith('http')) return url;
    return `${window.API_BASE}${url}`;
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>⏳ Loading applications...</div>;
  if (error) return <div className="error-message" style={{margin: '20px'}}>{error}</div>;

  return (
    <div className="broker-applications-admin" style={{padding: '20px'}}>
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Applicant Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No applications found.</td></tr>
            ) : (
              applications.map(app => (
                <tr key={app.id}>
                  <td><span style={{fontSize: '0.8rem', color: '#94a3b8'}}>#{app.id.substring(app.id.length - 8)}</span></td>
                  <td>
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                      {app.profile_photo && <img src={getDocUrl(app.profile_photo)} alt="" style={{width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover'}} />}
                      <strong>{app.full_name || 'N/A'}</strong>
                    </div>
                  </td>
                  <td>{app.email || 'N/A'}</td>
                  <td>{app.phone_number || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${app.status}`} style={{
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      fontWeight: '700',
                      backgroundColor: app.status === 'pending' ? '#fef3c7' : (app.status === 'approved' ? '#dcfce7' : '#fee2e2'),
                      color: app.status === 'pending' ? '#92400e' : (app.status === 'approved' ? '#166534' : '#991b1b')
                    }}>
                      {app.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons" style={{display: 'flex', gap: '8px'}}>
                      <button 
                        className="btn-view" 
                        onClick={() => setSelectedApp(app)}
                        style={{background: '#3b82f6', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'}}
                      >
                        👁️ View
                      </button>
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(app.id)}
                        style={{background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '1rem'}}
                        title="Delete record"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedApp && (
        <div className="modal-overlay" style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyCenter: 'center', zIndex: 3000, padding: '20px'
        }} onClick={() => setSelectedApp(null)}>
          <div className="modal-content" style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '600px',
            padding: '2rem', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            <button style={{position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer'}} onClick={() => setSelectedApp(null)}>✕</button>
            
            <div style={{textAlign: 'center', marginBottom: '2rem'}}>
              {selectedApp.profile_photo ? (
                <img src={getDocUrl(selectedApp.profile_photo)} alt="Profile" style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #f1f5f9', marginBottom: '1rem'}} />
              ) : (
                <div style={{width: '100px', height: '100px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto 1rem'}}>👤</div>
              )}
              <h2 style={{margin: 0, color: '#0f172a'}}>{selectedApp.full_name}</h2>
              <p style={{color: '#64748b', margin: '5px 0'}}>Broker Applicant</p>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '2rem'}}>
              <div>
                <label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700'}}>Email Address</label>
                <p style={{margin: '4px 0', fontWeight: '600'}}>{selectedApp.email}</p>
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700'}}>Phone Number</label>
                <p style={{margin: '4px 0', fontWeight: '600'}}>{selectedApp.phone_number}</p>
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700'}}>Submission Date</label>
                <p style={{margin: '4px 0', fontWeight: '600'}}>{new Date(selectedApp.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label style={{display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700'}}>Current Status</label>
                <p style={{margin: '4px 0', fontWeight: '600'}}>{selectedApp.status.toUpperCase()}</p>
              </div>
            </div>

            <div style={{background: '#f8fafc', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem'}}>
              <h4 style={{margin: '0 0 1rem 0', color: '#0f172a'}}>📑 Verification Documents</h4>
              <div style={{display: 'flex', gap: '15px'}}>
                <a href={getDocUrl(selectedApp.id_document)} target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', 
                  textDecoration: 'none', color: '#1e293b', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '600'
                }}>
                  🪪 View ID Document
                </a>
                <a href={getDocUrl(selectedApp.license_document)} target="_blank" rel="noopener noreferrer" style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px', borderRadius: '8px', 
                  textDecoration: 'none', color: '#1e293b', border: '1px solid #e2e8f0', fontSize: '0.9rem', fontWeight: '600'
                }}>
                  📜 View License
                </a>
              </div>
            </div>

            {selectedApp.status === 'pending' && (
              <div style={{display: 'flex', gap: '15px'}}>
                <button 
                  onClick={() => handleApprove(selectedApp.id)}
                  style={{flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'}}
                >
                  ✅ Approve Application
                </button>
                <button 
                  onClick={() => handleReject(selectedApp.id)}
                  style={{flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer'}}
                >
                  ❌ Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrokerApplicationsAdmin;
