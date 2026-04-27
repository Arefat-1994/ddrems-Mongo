import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Favorites.css'; // Reusing similar styles

const MyBookings = ({ user, setCurrentPage }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = user.role === 'broker' 
        ? `http://localhost:5000/api/broker-bookings?broker_id=${user.id}`
        : `http://localhost:5000/api/broker-bookings?customer_id=${user.id}`;
      
      const res = await axios.get(endpoint);
      setBookings(res.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.role]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'expired': return '#6b7280';
      default: return '#f59e0b'; // pending/reserved
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading your bookings...</div>;

  return (
    <div className="favorites-container" style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>⏱️ My Booked Lists (30 Min Holds)</h2>
        <span style={{ fontSize: '14px', color: '#64748b' }}>{bookings.length} active holds</span>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
          <h3>No Booked Lists found</h3>
          <p style={{ color: '#64748b' }}>You haven't reserved any properties yet. Go to Browse Properties to book a 30-minute hold.</p>
        </div>
      ) : (
        <div className="favorites-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {bookings.map(booking => (
            <div key={booking.id} className="favorite-card" style={{ 
              background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#1e293b' }}>{booking.property_title}</h3>
                  <span style={{ 
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: getStatusColor(booking.status) + '20', color: getStatusColor(booking.status),
                    border: `1px solid ${getStatusColor(booking.status)}40`, textTransform: 'uppercase'
                  }}>
                    {booking.status}
                  </span>
                </div>
                
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px' }}>📍 {booking.property_location}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Price</span>
                    <span style={{ fontWeight: '700', color: '#059669' }}>{Number(booking.property_price).toLocaleString()} ETB</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase' }}>Type</span>
                    <span style={{ fontWeight: '600' }}>{booking.property_type}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                  <p style={{ fontSize: '13px', margin: '0 0 5px 0' }}><strong>Buyer:</strong> {booking.buyer_name}</p>
                  <p style={{ fontSize: '13px', margin: '0 0 5px 0' }}><strong>Phone:</strong> {booking.phone}</p>
                  <p style={{ fontSize: '13px', margin: '0 0 5px 0' }}><strong>Reserved:</strong> {new Date(booking.booking_time).toLocaleString()}</p>
                  <p style={{ fontSize: '13px', margin: '0 0 5px 0', color: '#dc2626' }}>
                    <strong>Expires:</strong> {new Date(booking.hold_expiry_time).toLocaleString()}
                  </p>
                </div>

                {booking.notes && (
                  <div style={{ marginTop: '10px', padding: '10px', background: '#fffbeb', borderRadius: '6px', fontSize: '12px', border: '1px solid #fef3c7' }}>
                    <strong>Notes:</strong> {booking.notes}
                  </div>
                )}

                {user.role === 'user' && booking.status === 'reserved' && (
                  <div style={{ marginTop: '20px' }}>
                    <button 
                      onClick={() => {
                        setCurrentPage('broker-engagement', { propertyId: booking.property_id });
                        alert(`Transitioning to formal agreement for ${booking.property_title}. Please follow the 12-step workflow to complete your purchase.`);
                      }}
                      style={{
                        width: '100%', padding: '12px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
                      }}
                    >
                      🤝 Start Agreement Workflow
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
