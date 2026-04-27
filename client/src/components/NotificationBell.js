import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from './NotificationContext';
import './NotificationBell.css';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (type) => {
    const icons = {
      property: '🏠',
      agreement: '📄',
      message: '💬',
      key: '🔑',
      system: '⚙️',
      security: '🛡️',
      alert: '⚠️'
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className={`bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="dropdown-body">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-item ${!notif.is_read ? 'unread' : ''}`}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.link) window.location.href = notif.link;
                  }}
                >
                  <div className="notif-icon">{getIcon(notif.type)}</div>
                  <div className="notif-content">
                    <p className="notif-title">{notif.title}</p>
                    <p className="notif-message">{notif.message}</p>
                    <p className="notif-time">{formatTime(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && <div className="unread-dot"></div>}
                </div>
              ))
            ) : (
              <div className="no-notifications">
                <p>No notifications yet</p>
              </div>
            )}
          </div>
          <div className="dropdown-footer">
            <button className="view-all-btn" onClick={() => window.location.href = '/notifications'}>
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
