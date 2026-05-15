import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MessageNotificationWidget = ({ userId, onNavigateToMessages }) => {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    fetchUnreadMessages();
    
    // Set up interval to check for new messages every 60 seconds
    const messageInterval = setInterval(() => {
      // Back off after 3 consecutive failures to avoid flooding
      if (errorCount < 3) {
        fetchUnreadMessages();
      }
    }, 60000);
    
    return () => clearInterval(messageInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Helper to play a short notification ping
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      // Audio not supported, silently ignore
    }
  };

  const fetchUnreadMessages = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const API = `http://${window.location.hostname}:5000/api`;
      const response = await axios.get(`${API}/messages/unread/${userId}`);
      const newCount = response.data.count || 0;
      
      // Play sound if we got a new message
      if (newCount > unreadMessages && unreadMessages !== 0) {
        playNotificationSound();
      }
      setUnreadMessages(newCount);
      
      // Also fetch recent notifications
      const notifResponse = await axios.get(`${API}/messages/notifications/${userId}`);
      setNotifications(notifResponse.data.notifications || []);
      setErrorCount(0); // Reset error counter on success
    } catch (error) {
      // Only log first failure to avoid console flooding
      setErrorCount(prev => {
        if (prev < 1) console.warn('MessageWidget: fetch failed:', error.message);
        return prev + 1;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToMessages = () => {
    setShowNotifications(false);
    if (onNavigateToMessages) {
      onNavigateToMessages();
    } else {
      window.location.href = '/messages';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        className={`btn-secondary ${unreadMessages > 0 ? 'btn-notification' : ''}`}
        onClick={() => setShowNotifications(!showNotifications)}
        style={{ 
          position: 'relative',
          background: unreadMessages > 0 ? '#ef4444' : '#f8fafc',
          color: unreadMessages > 0 ? 'white' : '#334155',
          animation: unreadMessages > 0 ? 'pulse 2s infinite' : undefined,
          padding: '10px 20px',
          borderRadius: '8px',
          border: unreadMessages > 0 ? 'none' : '1px solid #cbd5e1',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'all 0.3s ease',
          boxShadow: unreadMessages > 0 ? '0 4px 12px rgba(239,68,68,0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
          whiteSpace: 'nowrap'
        }}
      >
        🔔 Notifications
        {unreadMessages > 0 && (
          <span 
            className="notification-badge"
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: '#fbbf24',
              color: '#1f2937',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {unreadMessages > 99 ? '99+' : unreadMessages}
          </span>
        )}
      </button>
      
      {/* Notification Dropdown */}
      {showNotifications && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: '0',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          width: '380px',
          maxHeight: '450px',
          overflowY: 'auto',
          zIndex: 1000,
          marginTop: '8px'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '16px', 
            borderBottom: '1px solid #f3f4f6',
            background: '#f9fafb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  📧 Messages
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#9ca3af', 
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Messages List */}
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ 
                padding: '30px 15px', 
                textAlign: 'center', 
                color: '#9ca3af' 
              }}>
                <div style={{ fontSize: '20px', marginBottom: '10px' }}>⏳</div>
                <div>Loading messages...</div>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification, idx) => (
                <div 
                  key={notification.id || `msg-notif-${idx}`}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f9fafb',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    background: notification.is_read ? 'white' : '#f0f9ff'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = notification.is_read ? 'white' : '#f0f9ff'}
                  onClick={handleNavigateToMessages}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    {/* Unread Indicator */}
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: notification.is_read ? '#d1d5db' : '#ef4444',
                      marginTop: '6px',
                      flexShrink: 0
                    }}></div>
                    
                    {/* Message Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: notification.is_read ? '500' : '700',
                        color: '#1f2937',
                        fontSize: '14px',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{ 
                        color: '#6b7280',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        marginBottom: '4px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {notification.message}
                      </div>
                      <div style={{ 
                        color: '#9ca3af',
                        fontSize: '12px'
                      }}>
                      {(() => {
                        const d = new Date(notification.created_at || notification.createdAt);
                        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
                      })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ 
                padding: '40px 15px', 
                textAlign: 'center', 
                color: '#9ca3af' 
              }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📭</div>
                <div style={{ fontWeight: '500' }}>No notifications</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>You're all caught up!</div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div style={{ 
            padding: '12px 16px', 
            borderTop: '1px solid #f3f4f6',
            background: '#f9fafb'
          }}>
            <button 
              onClick={handleNavigateToMessages}
              style={{
                width: '100%',
                padding: '10px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#2563eb'}
              onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
            >
              View All Messages →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageNotificationWidget;