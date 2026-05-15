import React, { useState, useEffect } from 'react';
import './Messages.css';
import PageHeader from './PageHeader';
import axios from 'axios';
import { useSocketEvent } from './NotificationContext';

const Messages = ({ user, onLogout, onSettingsClick }) => {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [editForm, setEditForm] = useState({ subject: '', message: '' });
  const [replyForm, setReplyForm] = useState({ subject: '', message: '', receiver_id: null, parent_id: null });
  const [messageHistory, setMessageHistory] = useState([]);
  const [messageThread, setMessageThread] = useState(null);
  const [showThreadModal, setShowThreadModal] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for real-time new messages
  useSocketEvent('new_message', () => {
    fetchMessages();
    fetchUnreadCount();
  });

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/user/${user.id}?userId=${user.id}`);
      if (response.data.success !== false) {
        // Handle new API response format
        const messagesData = response.data.messages || response.data;
        setMessages(Array.isArray(messagesData) ? messagesData : []);
      } else {
        console.error('API Error:', response.data.message);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Mock data for demo when API is not available
      setMessages([
        {
          id: 1,
          sender_name: 'System Administrator',
          sender_role: 'admin',
          subject: 'Welcome to DDREMS',
          message: 'Welcome to Dire Dawa Real Estate Management System. We are glad to have you on board!',
          message_type: 'general',
          is_read: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          sender_name: 'System Administrator',
          sender_role: 'admin',
          subject: 'Property Verification Update',
          message: 'Your property listing has been verified and is now live on the platform.',
          message_type: 'property',
          is_read: 0,
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: 3,
          sender_name: 'System Administrator',
          sender_role: 'admin',
          subject: 'New Feature Announcement',
          message: 'We have added new features to enhance your experience. Check out the latest updates!',
          message_type: 'announcement',
          is_read: 1,
          created_at: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
      setUnreadCount(2);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/unread/${user.id}?userId=${user.id}`);
      const count = response.data.count || 0;
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
      setUnreadCount(0);
    }
  };

  const fetchMessageThread = async (messageId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/${messageId}/thread?userId=${user.id}`);
      if (response.data.success !== false) {
        setMessageThread(response.data);
      }
    } catch (error) {
      console.error('Error fetching message thread:', error);
    }
  };

  const handleMessageClick = async (message) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      try {
        await axios.put(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/read/${message.id}?userId=${user.id}`);
        setMessages(messages.map(m => 
          m.id === message.id ? { ...m, is_read: 1 } : m
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/read-all/${user.id}?userId=${user.id}`);
      setMessages(messages.map(m => ({ ...m, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/${messageId}?userId=${user.id}`);
        setMessages(messages.filter(m => m.id !== messageId));
        setSelectedMessage(null);
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleEditMessage = (message) => {
    setEditForm({
      subject: message.subject,
      message: message.message
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/${selectedMessage.id}?userId=${user.id}`, editForm);
      setMessages(messages.map(m => 
        m.id === selectedMessage.id 
          ? { ...m, subject: editForm.subject, message: editForm.message }
          : m
      ));
      setSelectedMessage({ ...selectedMessage, subject: editForm.subject, message: editForm.message });
      setShowEditModal(false);
      alert('✅ Message updated successfully!');
    } catch (error) {
      console.error('Error updating message:', error);
      alert('❌ Failed to update message');
    }
  };

  const handleReplyClick = (message) => {
    setReplyForm({
      subject: `Re: ${message.subject}`,
      message: '',
      receiver_id: message.sender_id,
      parent_id: message.id
    });
    setShowReplyModal(true);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/messages/${selectedMessage.id}/reply`, {
        subject: replyForm.subject,
        message: replyForm.message
      }, {
        params: { userId: user.id }
      });
      setShowReplyModal(false);
      alert('✅ Reply sent successfully!');
      fetchMessages();
      // Fetch the updated thread
      if (selectedMessage) {
        fetchMessageThread(selectedMessage.id);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('❌ Failed to send reply');
    }
  };

  const handleShowHistory = async (message) => {
    setMessageHistory([
      {
        id: 1,
        subject: message.subject,
        message: message.message,
        edited_at: message.created_at,
        version: 'Current'
      }
    ]);
    setShowHistoryModal(true);
  };

  const getMessageIcon = (type) => {
    const icons = {
      general: '📧',
      property: '🏠',
      announcement: '📢',
      alert: '⚠️',
      payment: '💰',
      verification: '✅'
    };
    return icons[type] || '📧';
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread') return !msg.is_read;
    if (filter === 'read') return msg.is_read;
    return true;
  });

  // Safe date formatter to prevent 'Invalid Date'
  const safeFormatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const safeFormatDateFull = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString();
  };

  return (
    <div className="messages-page">
      <PageHeader
        title="Messages"
        subtitle="View messages and notifications from administrators"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
        actions={
          <div className="message-actions">
            <span className="unread-badge">{unreadCount} Unread</span>
            <button className="btn-secondary" onClick={handleMarkAllRead}>
              Mark All Read
            </button>
            {/* Show Send Message button for admins and property admins */}
            {(user.role === 'system_admin' || user.role === 'property_admin') && (
              <button 
                className="btn-primary" 
                onClick={() => window.location.href = '/send-message'}
                style={{ marginLeft: '10px' }}
              >
                📤 Send Message
              </button>
            )}
          </div>
        }
      />

      <div className="messages-container">
        <div className="messages-sidebar">
          <div className="message-filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Messages ({messages.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read ({messages.length - unreadCount})
            </button>
          </div>

          <div className="messages-list">
            {filteredMessages.map(message => (
              <div 
                key={message.id}
                className={`message-item ${!message.is_read ? 'unread' : ''} ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                onClick={() => handleMessageClick(message)}
              >
                <div className="message-item-header">
                  <span className="message-icon">{getMessageIcon(message.message_type)}</span>
                  <div className="message-item-info">
                    <h4>{message.subject}</h4>
                    <p className="message-sender">From: {message.sender_name}</p>
                  </div>
                  {!message.is_read && <span className="unread-dot"></span>}
                </div>
                <p className="message-preview">{message.message ? (message.message.length > 60 ? message.message.substring(0, 60) + '...' : message.message) : 'No content'}</p>
                <span className="message-date">
                  {safeFormatDate(message.created_at || message.createdAt)}
                </span>
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <div className="no-messages">
                <p>📭 No messages found</p>
              </div>
            )}
          </div>
        </div>

        <div className="message-content">
          {selectedMessage ? (
            <div className="message-detail">
              <div className="message-detail-header">
                <div>
                  <h2>{selectedMessage.subject}</h2>
                  <div className="message-meta">
                    <span className="message-from">
                      <strong>From:</strong> {selectedMessage.sender_name} ({selectedMessage.sender_role})
                    </span>
                    <span className="message-type-badge" style={{
                      background: selectedMessage.message_type === 'alert' ? '#fee2e2' : 
                                 selectedMessage.message_type === 'property' ? '#dbeafe' :
                                 selectedMessage.message_type === 'announcement' ? '#fef3c7' : '#f3f4f6',
                      color: selectedMessage.message_type === 'alert' ? '#ef4444' : 
                             selectedMessage.message_type === 'property' ? '#3b82f6' :
                             selectedMessage.message_type === 'announcement' ? '#f59e0b' : '#6b7280'
                    }}>
                      {selectedMessage.message_type}
                    </span>
                  </div>
                </div>
                <div className="message-actions">
                  {/* Show edit/history buttons for admins and property admins on their own messages */}
                  {(user.role === 'system_admin' || user.role === 'property_admin') && selectedMessage.sender_id === user.id && (
                    <>
                      <button 
                        className="btn-icon edit" 
                        onClick={() => handleEditMessage(selectedMessage)}
                        title="Edit Message"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon send" 
                        onClick={() => window.location.href = '/send-message'}
                        title="Send New Message"
                      >
                        📤
                      </button>
                    </>
                  )}
                  
                  {/* Show history button for all users on all messages */}
                  <button 
                    className="btn-icon history" 
                    onClick={() => handleShowHistory(selectedMessage)}
                    title="Message History"
                  >
                    📋
                  </button>

                  {/* Add Reply button for messages not sent by current user */}
                  {selectedMessage.sender_id !== user.id && (
                    <button 
                      className="btn-icon reply" 
                      onClick={() => handleReplyClick(selectedMessage)}
                      title="Reply"
                      style={{ background: '#dcfce7', color: '#166534' }}
                    >
                      ↩️
                    </button>
                  )}

                  {/* Show thread button if message has replies */}
                  {selectedMessage.reply_count > 0 && (
                    <button 
                      className="btn-icon thread" 
                      onClick={() => {
                        fetchMessageThread(selectedMessage.id);
                        setShowThreadModal(true);
                      }}
                      title={`View ${selectedMessage.reply_count} replies`}
                      style={{ background: '#e0e7ff', color: '#4f46e5' }}
                    >
                      💬 ({selectedMessage.reply_count})
                    </button>
                  )}
                  
                  {/* Show delete button for all users on messages from admins, and for admins on their own messages */}
                  {(
                    // Regular users can delete messages from admins
                    (selectedMessage.sender_role === 'system_admin' || selectedMessage.sender_role === 'property_admin') ||
                    // Admins can delete their own messages
                    ((user.role === 'system_admin' || user.role === 'property_admin') && selectedMessage.sender_id === user.id) ||
                    // System admin can delete any message
                    (user.role === 'system_admin')
                  ) && (
                    <button 
                      className="btn-icon danger" 
                      onClick={() => handleDeleteMessage(selectedMessage.id)}
                      title="Delete Message"
                    >
                      🗑️
                    </button>
                  )}
                  
                  {/* Show send button for admins and property admins */}
                  {(user.role === 'system_admin' || user.role === 'property_admin') && (
                    <button 
                      className="btn-icon send" 
                      onClick={() => window.location.href = '/send-message'}
                      title="Send New Message"
                    >
                      📤
                    </button>
                  )}
                </div>
              </div>
              
              <div className="message-body">
                <p>{selectedMessage.message}</p>
                
                {/* Display recipient information */}
                <div className="message-recipients" style={{ 
                  marginTop: '20px', 
                  padding: '15px', 
                  background: '#f8fafc', 
                  borderRadius: '8px',
                  borderLeft: '4px solid #3b82f6'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '14px' }}>
                    📧 Message Recipients
                  </h4>
                  {selectedMessage.is_group ? (
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '13px' }}>
                        👥 Group Message - Sent to multiple recipients
                      </span>
                      {selectedMessage.recipient_count && (
                        <span style={{ marginLeft: '10px', color: '#059669', fontWeight: '600' }}>
                          ({selectedMessage.recipient_count} recipients)
                        </span>
                      )}
                    </div>
                  ) : selectedMessage.receiver_name ? (
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '13px' }}>👤 Direct Message to: </span>
                      <span style={{ color: '#1e293b', fontWeight: '600' }}>
                        {selectedMessage.receiver_name}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ color: '#6b7280', fontSize: '13px' }}>
                        📢 Broadcast Message - Visible to all users
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="message-footer">
                <span className="message-timestamp">
                  Received: {safeFormatDateFull(selectedMessage.created_at || selectedMessage.createdAt)}
                </span>
              </div>
            </div>
          ) : (
            <div className="no-message-selected">
              <div className="empty-state">
                <span className="empty-icon">📬</span>
                <h3>Select a message to read</h3>
                <p>Choose a message from the list to view its contents</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Message Modal */}
      {showEditModal && selectedMessage && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px',
            width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit Message</h2>
              <button onClick={() => setShowEditModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Subject</label>
                <input
                  type="text"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Message</label>
                <textarea
                  value={editForm.message}
                  onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                  required
                  rows="6"
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowEditModal(false)}
                  style={{ padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
                >Cancel</button>
                <button type="submit"
                  style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >Update Message</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '800px',
            width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📋 Message History</h2>
              <button onClick={() => setShowHistoryModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messageHistory.map((version, index) => (
                <div key={version.id} style={{
                  border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px',
                  background: index === 0 ? '#f8fafc' : 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{version.version}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {safeFormatDateFull(version.edited_at)}
                    </span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Subject:</strong> {version.subject}
                  </div>
                  <div>
                    <strong>Message:</strong>
                    <p style={{ marginTop: '5px', color: '#374151' }}>{version.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Reply Modal */}
      {showReplyModal && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '600px',
            width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>📤 Reply to Message</h2>
              <button onClick={() => setShowReplyModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <form onSubmit={handleReplySubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Subject</label>
                <input
                  type="text"
                  value={replyForm.subject}
                  onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })}
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Your Reply</label>
                <textarea
                  value={replyForm.message}
                  onChange={(e) => setReplyForm({ ...replyForm, message: e.target.value })}
                  required
                  rows="6"
                  placeholder="Type your reply here..."
                  style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowReplyModal(false)}
                  style={{ padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}
                >Cancel</button>
                <button type="submit"
                  style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                >Send Reply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Message Thread Modal */}
      {showThreadModal && messageThread && (
        <div className="modal-overlay" onClick={() => setShowThreadModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '800px',
            width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>💬 Message Thread</h2>
              <button onClick={() => setShowThreadModal(false)} style={{
                background: '#f3f4f6', border: 'none', width: '36px', height: '36px',
                borderRadius: '50%', cursor: 'pointer', fontSize: '18px'
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Main Message */}
              <div style={{
                border: '2px solid #3b82f6', borderRadius: '12px', padding: '20px',
                background: '#eff6ff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ color: '#1e293b' }}>{messageThread.main_message.sender_name}</strong>
                    <span style={{ marginLeft: '10px', fontSize: '12px', color: '#64748b' }}>
                      ({messageThread.main_message.sender_role})
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {safeFormatDateFull(messageThread.main_message.created_at || messageThread.main_message.createdAt)}
                  </span>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Subject:</strong> {messageThread.main_message.subject}
                </div>
                <div style={{ color: '#374151' }}>
                  {messageThread.main_message.message}
                </div>
              </div>

              {/* Replies */}
              {messageThread.replies && messageThread.replies.length > 0 ? (
                <>
                  <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', margin: '10px 0' }}>
                    ↓ {messageThread.replies.length} replies ↓
                  </div>
                  {messageThread.replies.map((reply, index) => (
                    <div key={reply.id} style={{
                      border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px',
                      background: 'white',
                      marginLeft: '20px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div>
                          <strong style={{ color: '#1e293b' }}>{reply.sender_name}</strong>
                          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#64748b' }}>
                            ({reply.sender_role})
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                          {safeFormatDateFull(reply.created_at || reply.createdAt)}
                        </span>
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <strong>Re:</strong> {reply.subject}
                      </div>
                      <div style={{ color: '#374151' }}>
                        {reply.message}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No replies yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
