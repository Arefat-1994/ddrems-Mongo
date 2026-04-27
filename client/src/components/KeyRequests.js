import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { UserProfilePill } from './PageHeader';

const KeyRequests = ({ user, onSettingsClick }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        let response;
        if (user.role === 'property_admin') {
          const [pending, history] = await Promise.all([
            axios.get(`http://${window.location.hostname}:5000/api/key-requests/admin/pending`),
            axios.get(`http://${window.location.hostname}:5000/api/key-requests/admin/history`)
          ]);
          setRequests([...pending.data, ...history.data]);
        } else if (user.role === 'broker') {
          response = await axios.get(`http://${window.location.hostname}:5000/api/key-requests/broker/${user.id}`);
          setRequests(response.data);
        } else if (user.role === 'user') {
          response = await axios.get(`http://${window.location.hostname}:5000/api/key-requests/customer/${user.id}`);
          setRequests(response.data);
        } else if (user.role === 'owner') {
          response = await axios.get(`http://${window.location.hostname}:5000/api/key-requests/customer/${user.id}`);
          setRequests(response.data);
        } else {
          setRequests([]);
        }
      } catch (err) {
        console.error('Error fetching key requests:', err);
        setError('Failed to load key requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const copyKey = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      alert('🔑 Copied key to clipboard: ' + key);
    });
  };

  return (
    <div className="key-requests-page" style={{ padding: '0' }}>
      {/* Page Header with Profile Pill */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 24px', background: 'white',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>
            🔐 Key Access Center
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
            Manage and review all key access requests and receive admin-issued access codes.
          </p>
        </div>
        <UserProfilePill user={user} onSettingsClick={onSettingsClick} />
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
            <p>Loading requests...</p>
          </div>
        )}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '8px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {!loading && requests.length === 0 && (
          <div style={{ background: '#f8fafc', border: '1px solid #c7d2fe', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔑</div>
            <p style={{ fontWeight: '600', color: '#1e293b', margin: '0 0 8px 0' }}>No key request records found yet.</p>
            <p style={{ color: '#64748b', margin: 0 }}>Use the property list or user management screens to create or approve new requests.</p>
          </div>
        )}

        {!loading && requests.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Property', 'Requester', 'Status', 'Key Code', 'Requested On', 'Action'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => (
                  <tr key={`${req.id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1e293b' }}>{req.property_title || 'N/A'}</td>
                    <td style={{ padding: '14px 16px', color: '#475569' }}>{req.customer_name || req.customer_email || 'N/A'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                        background: req.status === 'accepted' ? '#dcfce7' : req.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                        color: req.status === 'accepted' ? '#166534' : req.status === 'rejected' ? '#991b1b' : '#854d0e',
                        textTransform: 'uppercase'
                      }}>
                        {req.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#0369a1' }}>{req.key_code || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>{req.created_at ? new Date(req.created_at).toLocaleString() : '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {req.key_code && (
                        <button onClick={() => copyKey(req.key_code)} style={{
                          padding: '6px 14px', borderRadius: '6px', border: '1px solid #93c5fd',
                          background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', fontWeight: '600', fontSize: '12px'
                        }}>
                          📋 Copy
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default KeyRequests;
