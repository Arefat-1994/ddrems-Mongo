import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './PropertyAdminDashboard.css'; // Reuse existing styles

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

const BookedLists = ({ user, showNotification }) => {
  const [brokerHolds, setBrokerHolds] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBrokerHolds = useCallback(async () => {
    setLoading(true);
    try {
      // If system_admin, they see ALL holds. If property_admin, they see holds for their properties.
      const queryParam = user.role === 'system_admin' || user.role === 'admin' 
        ? '' 
        : `?property_admin_id=${user.id}`;
      
      const response = await axios.get(`${API_BASE}/broker-bookings${queryParam}`);
      setBrokerHolds(response.data);
    } catch (error) {
      console.error('Error fetching broker holds:', error);
      if (showNotification) showNotification('Failed to load booked lists', 'error');
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role, showNotification]);

  useEffect(() => {
    fetchBrokerHolds();
  }, [fetchBrokerHolds]);

  const handleBrokerHoldAction = async (id, action) => {
    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to permanently delete this booking?')) return;
        await axios.delete(`${API_BASE}/broker-bookings/${id}`);
      } else {
        await axios.put(`${API_BASE}/broker-bookings/${id}/${action}`);
      }
      if (showNotification) showNotification(`Booking ${action}ed successfully`, 'success');
      else alert(`Booking ${action}ed successfully`);
      fetchBrokerHolds();
    } catch (error) {
      console.error(`Error ${action} booking:`, error);
      if (showNotification) showNotification(`Failed to ${action} booking`, 'error');
      else alert(`Failed to ${action} booking`);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading booked lists...</div>;

  return (
    <div className="dashboard-card" style={{ margin: '20px' }}>
      <div className="card-header">
        <h3>⏱️ Booked Lists ({brokerHolds.length})</h3>
        <button className="btn-text" onClick={fetchBrokerHolds}>🔄 Refresh</button>
      </div>
      <div style={{ padding: '20px' }}>
        {brokerHolds.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏱️</div>
            <p>No active property bookings or holds found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {brokerHolds.map(hold => (
              <div key={hold.id} style={{ 
                padding: '20px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '12px', 
                background: '#fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '4px', 
                  height: '100%', 
                  background: hold.status === 'reserved' ? '#f59e0b' : hold.status === 'confirmed' ? '#10b981' : '#ef4444' 
                }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'start' }}>
                  <h4 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{hold.property_title}</h4>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
                    background: hold.status === 'reserved' ? '#fef3c7' : hold.status === 'confirmed' ? '#d1fae5' : '#fee2e2',
                    color: hold.status === 'reserved' ? '#d97706' : hold.status === 'confirmed' ? '#059669' : '#dc2626',
                    textTransform: 'uppercase'
                  }}>
                    {hold.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px', fontSize: '14px', color: '#475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🤝</span>
                    <span><strong>Broker:</strong> {hold.broker_name} ({hold.broker_phone})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>👤</span>
                    <span><strong>Buyer:</strong> {hold.buyer_name} ({hold.phone})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🆔</span>
                    <span><strong>ID:</strong> {hold.id_type}: {hold.id_number}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📅</span>
                    <span><strong>Visit:</strong> {new Date(hold.preferred_visit_time).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                    <span style={{ fontSize: '16px' }}>⏱️</span>
                    <span><strong>Expires:</strong> {new Date(hold.hold_expiry_time).toLocaleString()}</span>
                  </div>
                </div>
                
                {hold.status === 'reserved' ? (
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleBrokerHoldAction(hold.id, 'confirm')} 
                      style={{ flex: 1, padding: '10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                    >✅ Confirm</button>
                    <button 
                      onClick={() => handleBrokerHoldAction(hold.id, 'extend')} 
                      style={{ flex: 1, padding: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                    >⏱️ Extend</button>
                    <button 
                      onClick={() => handleBrokerHoldAction(hold.id, 'cancel')} 
                      style={{ flex: 1, padding: '10px', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                    >❌ Remove</button>
                    <button 
                      onClick={() => handleBrokerHoldAction(hold.id, 'delete')} 
                      style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                    >🗑️ Delete</button>
                  </div>
                ) : (
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    {hold.status !== 'cancelled' && (
                      <button 
                        onClick={() => handleBrokerHoldAction(hold.id, 'cancel')} 
                        style={{ flex: 1, padding: '10px', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                      >❌ Remove</button>
                    )}
                    <button 
                      onClick={() => handleBrokerHoldAction(hold.id, 'delete')} 
                      style={{ flex: 1, padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                    >🗑️ Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookedLists;
