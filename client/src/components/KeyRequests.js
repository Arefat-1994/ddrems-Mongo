import React, { useEffect, useState } from 'react';
import axios from 'axios';

const KeyRequests = ({ user }) => {
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
          // owners currently may not have a dedicated route; show customer style by default
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
    <div className="key-requests-page" style={{ padding: '20px' }}>
      <h2>🔐 Key Access Center</h2>
      <p>Manage and review all key access requests and receive admin-issued access codes.</p>

      {loading && <p>Loading requests...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && requests.length === 0 && (
        <div style={{ background: '#f8fafc', border: '1px solid #c7d2fe', padding: '18px', borderRadius: '8px' }}>
          <p>No key request records found yet.</p>
          <p>Use the property list or user management screens to create or approve new requests.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', fontWeight: 'bold' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Property</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Requester</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Key Code</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Requested On</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req, idx) => (
                <tr key={`${req.id}-${idx}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px' }}>{idx + 1}</td>
                  <td style={{ padding: '10px' }}>{req.property_title || 'N/A'}</td>
                  <td style={{ padding: '10px' }}>{req.customer_name || req.customer_email || 'N/A'}</td>
                  <td style={{ padding: '10px' }}>{req.status || 'pending'}</td>
                  <td style={{ padding: '10px' }}>{req.key_code || '—'}</td>
                  <td style={{ padding: '10px' }}>{req.created_at ? new Date(req.created_at).toLocaleString() : '—'}</td>
                  <td style={{ padding: '10px' }}>
                    {req.key_code && <button onClick={() => copyKey(req.key_code)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#e0f2fe' }}>Copy</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KeyRequests;
