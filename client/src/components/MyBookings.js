import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Favorites.css'; // Reusing similar styles

const CountdownTimer = ({ expiryTime }) => {
  const calculateTimeLeft = useCallback(() => {
    const difference = +new Date(expiryTime) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        min: Math.floor((difference / 1000 / 60) % 60),
        sec: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  }, [expiryTime]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  if (!timeLeft.min && !timeLeft.sec) return <span style={{ color: '#ef4444' }}>EXPIRED</span>;

  return (
    <span style={{ fontWeight: '800', color: '#f59e0b', fontSize: '15px' }}>
      {timeLeft.min}:{timeLeft.sec < 10 ? `0${timeLeft.sec}` : timeLeft.sec}
    </span>
  );
};

const MyBookings = ({ user, setCurrentPage }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingProperty, setViewingProperty] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loadingProperty, setLoadingProperty] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const API_BASE = `${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api`;
      const endpoint = user.role === 'broker' 
        ? `${API_BASE}/broker-bookings?broker_id=${user.id}`
        : `${API_BASE}/broker-bookings?customer_id=${user.id}`;
      
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

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel or remove this booking?")) return;
    try {
      await axios.put(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/broker-bookings/${bookingId}/cancel`);
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const handleDelete = async (bookingId) => {
    if (!window.confirm("Are you sure you want to permanently delete this booking record?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/broker-bookings/${bookingId}`);
      fetchBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    }
  };

  const handleViewProperty = async (propertyId) => {
    setViewingProperty(propertyId);
    setLoadingProperty(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/properties/${propertyId}`);
      setPropertyDetails(res.data);
    } catch (error) {
      console.error('Error fetching property details:', error);
      alert('Failed to load property details');
      setViewingProperty(null);
    } finally {
      setLoadingProperty(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'expired': return '#6b7280';
      default: return '#f59e0b'; // pending/reserved
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', flexDirection: 'column', gap: '15px' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div style={{ color: '#64748b', fontWeight: '500' }}>Fetching your bookings...</div>
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="favorites-container" style={{ padding: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', margin: '0 0 5px 0' }}>⏱️ My Booked Lists</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Properties you have reserved under 30-minute holds</p>
        </div>
        <div style={{ background: '#eff6ff', padding: '10px 20px', borderRadius: '12px', border: '1px solid #dbeafe' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#2563eb' }}>{bookings.length} active holds</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: 'white', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
          <div style={{ fontSize: '72px', marginBottom: '25px' }}>⏳</div>
          <h3 style={{ fontSize: '20px', color: '#1e293b', fontWeight: '700' }}>No Reserved Properties</h3>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '10px auto 0' }}>You haven't reserved any properties yet. Browse the market to find your dream property.</p>
        </div>
      ) : (
        <div className="favorites-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px' }}>
          {bookings.map(booking => (
            <div key={booking.id} className="favorite-card" style={{ 
              background: 'white', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)', 
              display: 'flex', flexDirection: 'column', transition: 'transform 0.2s'
            }}>
              <div style={{ padding: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{booking.property_title}</h3>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>📍 {booking.property_location}</p>
                  </div>
                  <span style={{ 
                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '800',
                    background: getStatusColor(booking.status) + '15', color: getStatusColor(booking.status),
                    border: `1.5px solid ${getStatusColor(booking.status)}30`, textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    {booking.status}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Listed Price</span>
                    <span style={{ fontWeight: '800', color: '#059669', fontSize: '16px' }}>{(booking.property_price / 1000000).toFixed(2)}M ETB</span>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Countdown</span>
                    <CountdownTimer expiryTime={booking.hold_expiry_time} />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: '700' }}>BUYER</span>
                        <span style={{ fontWeight: '600', color: '#334155' }}>{booking.buyer_name}</span>
                      </div>
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ color: '#94a3b8', display: 'block', fontSize: '11px', fontWeight: '700' }}>PHONE</span>
                        <span style={{ fontWeight: '600', color: '#334155' }}>{booking.phone}</span>
                      </div>
                   </div>
                   <div style={{ marginTop: '10px', fontSize: '13px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '10px' }}>
                      <strong>Reserved at:</strong> {new Date(booking.booking_time).toLocaleString()}
                   </div>
                </div>

                {booking.notes && (
                  <div style={{ marginBottom: '20px', padding: '12px', background: '#fffbeb', borderRadius: '10px', fontSize: '13px', border: '1px solid #fef3c7', color: '#92400e' }}>
                    <strong>Notes:</strong> {booking.notes}
                  </div>
                )}

                {/* Action buttons for reserved bookings */}
                {booking.status === 'reserved' && (
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => handleViewProperty(booking.property_id)}
                      style={{
                        flex: '1 1 100%', padding: '10px', background: '#3b82f6',
                        color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s', fontSize: '13px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                      👁️ View Full Info
                    </button>
                    <button 
                      onClick={() => {
                        setCurrentPage('agreement-workflow', { propertyId: booking.property_id });
                      }}
                      style={{
                        flex: '1 1 calc(50% - 4px)', padding: '10px', background: '#10b981',
                        color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s', fontSize: '13px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                    >
                      📄 Request Agreements
                    </button>
                    <button 
                      onClick={() => handleCancel(booking.id)}
                      style={{
                        flex: '1 1 calc(50% - 4px)', padding: '10px', background: '#ef4444',
                        color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s', fontSize: '13px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                )}

                {/* Action buttons for expired bookings */}
                {booking.status === 'expired' && (
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca', marginBottom: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: '600' }}>⏰ Hold expired — property is now available to others</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => {
                          setCurrentPage('agreement-workflow', { propertyId: booking.property_id });
                        }}
                        style={{
                          flex: '1 1 calc(50% - 4px)', padding: '10px', background: '#10b981',
                          color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                          transition: 'all 0.2s', fontSize: '13px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                      >
                        📄 Request Agreements
                      </button>
                      <button 
                        onClick={() => handleDelete(booking.id)}
                        style={{
                          flex: '1 1 calc(50% - 4px)', padding: '10px', background: '#ef4444',
                          color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                          transition: 'all 0.2s', fontSize: '13px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Cancelled status info */}
                {booking.status === 'cancelled' && (
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>❌ This booking was cancelled</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(booking.id)}
                      style={{
                        width: '100%', padding: '10px', background: '#ef4444',
                        color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s', fontSize: '13px'
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {viewingProperty && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setViewingProperty(null)}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            {loadingProperty ? (
               <div style={{ textAlign: 'center', padding: '40px' }}>Loading property details...</div>
            ) : propertyDetails ? (
               <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>{propertyDetails.title}</h2>
                    <button onClick={() => setViewingProperty(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
                  </div>
                  {propertyDetails.main_image && (
                     <img src={propertyDetails.main_image} alt={propertyDetails.title} style={{ width: '100%', height: '250px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px' }} />
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <div><strong>📍 Location:</strong> {propertyDetails.location}</div>
                    <div><strong>💰 Price:</strong> {(propertyDetails.price / 1000000).toFixed(2)}M ETB</div>
                    <div><strong>🛏️ Bedrooms:</strong> {propertyDetails.bedrooms || 'N/A'}</div>
                    <div><strong>🚿 Bathrooms:</strong> {propertyDetails.bathrooms || 'N/A'}</div>
                    <div><strong>📐 Area:</strong> {propertyDetails.area} m²</div>
                    <div><strong>🏠 Type:</strong> {propertyDetails.type}</div>
                  </div>
                  <div>
                    <strong>Description:</strong>
                    <p style={{ color: '#475569', lineHeight: '1.6' }}>{propertyDetails.description}</p>
                  </div>
               </div>
            ) : (
               <div style={{ textAlign: 'center', color: '#ef4444' }}>Could not load property details.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
