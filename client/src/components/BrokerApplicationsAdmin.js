import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SystemAdminDashboard.css';

const BrokerApplicationsAdmin = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/broker-applications');
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
      await axios.post(`http://localhost:5000/api/broker-applications/${id}/approve`);
      alert('Application approved successfully! Account has been created and email sent.');
      fetchApplications();
    } catch (err) {
      console.error('Error approving:', err);
      alert(err.response?.data?.message || 'Failed to approve application.');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this application?')) return;
    
    try {
      await axios.post(`http://localhost:5000/api/broker-applications/${id}/reject`);
      alert('Application rejected.');
      fetchApplications();
    } catch (err) {
      console.error('Error rejecting:', err);
      alert('Failed to reject application.');
    }
  };

  if (loading) return <div>Loading applications...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="broker-applications-admin">
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Applicant Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Documents</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan="8" style={{textAlign: 'center'}}>No applications found.</td></tr>
            ) : (
              applications.map(app => (
                <tr key={app.id}>
                  <td>#{app.id}</td>
                  <td><strong>{app.full_name}</strong></td>
                  <td>{app.email}</td>
                  <td>{app.phone_number}</td>
                  <td>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <a href={`http://localhost:5000${app.id_document}`} target="_blank" rel="noopener noreferrer" title="View ID">
                        <i className="fas fa-id-card"></i> ID
                      </a>
                      <a href={`http://localhost:5000${app.license_document}`} target="_blank" rel="noopener noreferrer" title="View License">
                        <i className="fas fa-file-contract"></i> License
                      </a>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${app.status}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td>
                    {app.status === 'pending' && (
                      <div className="action-buttons" style={{display: 'flex', gap: '5px'}}>
                        <button 
                          className="btn-approve" 
                          onClick={() => handleApprove(app.id)}
                          style={{background: '#10b981', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn-reject" 
                          onClick={() => handleReject(app.id)}
                          style={{background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'}}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrokerApplicationsAdmin;
