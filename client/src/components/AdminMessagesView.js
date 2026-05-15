import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminMessagesView.css';

const AdminMessagesView = ({ user, onClose }) => {
  const [view, setView] = useState('conversations'); // conversations, history, thread
  const [conversations, setConversations] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadReplies, setThreadReplies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // all, sent, received
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (view === 'conversations') {
      fetchConversations();
    } else if (view === 'history') {
      fetchHistory();
    }
  }, [view]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://${window.location.hostname}:5000/api/messages/admin/conversations/${user.id}`
      );
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://${window.location.hostname}:5000/api/messages/admin/history/${user.id}`
      );
      setHistory(response.data.all_messages || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (otherUserId) => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://${window.location.hostname}:5000/api/messages/admin/conversation/${user.id}/${otherUserId}`
      );
      setThreadMessages(response.data.messages || []);
      setThreadReplies(response.data.replies || []);
      setView('thread');
    } catch (error) {
      console.error('Error fetching thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (messageId) => {
    if (!replyText.trim() || !replySubject.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    try {
      await axios.post(
        `http://${window.location.hostname}:5000/api/messages/${messageId}/reply`,
        {
          subject: replySubject,
          message: replyText,
          sender_id: user.id
        }
      );
      alert('Reply sent successfully!');
      setReplyText('');
      setReplySubject('');
      setShowReplyForm(false);
      // Refresh thread
      if (selectedConversation) {
        fetchThread(selectedConversation.other_user_id);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
  };

  return (
    <div className="admin-messages-view">
      <div className="amv-header">
        <h2>📧 Message Management</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="amv-tabs">
        <button
          className={`tab ${view === 'conversations' ? 'active' : ''}`}
          onClick={() => setView('conversations')}
        >
          💬 Conversations ({conversations.length})
        </button>
        <button
          className={`tab ${view === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          📋 Message History ({history.length})
        </button>
        {view === 'thread' && (
          <button
            className="tab active"
            onClick={() => setView('conversations')}
          >
            ← Back to Conversations
          </button>
        )}
      </div>

      <div className="amv-content">
        {loading && <div className="loading">⏳ Loading...</div>}

        {/* Conversations View */}
        {view === 'conversations' && !loading && (
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-state">
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.other_user_id}
                  className="conversation-card"
                  onClick={() => {
                    setSelectedConversation(conv);
                    fetchThread(conv.other_user_id);
                  }}
                >
                  <div className="conv-header">
                    <h4>{conv.other_user_name}</h4>
                    <span className="conv-role">{conv.other_user_role}</span>
                  </div>
                  <p className="conv-email">{conv.other_user_email}</p>
                  <div className="conv-stats">
                    <span>📧 {conv.message_count} messages</span>
                    {conv.unread_count > 0 && (
                      <span className="unread-badge">
                        🔔 {conv.unread_count} unread
                      </span>
                    )}
                  </div>
                  <p className="conv-time">
                    Last message: {formatDate(conv.last_message_time)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* History View */}
        {view === 'history' && !loading && (
          <div className="history-list">
            <div className="history-stats">
              <div className="stat">
                <span className="stat-label">Total Messages</span>
                <span className="stat-value">{history.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Sent</span>
                <span className="stat-value">
                  {history.filter(m => m.sender_id === user.id).length}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Received</span>
                <span className="stat-value">
                  {history.filter(m => m.receiver_id === user.id).length}
                </span>
              </div>
            </div>

            {/* Filter and Search */}
            <div className="history-controls">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="🔍 Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${historyFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setHistoryFilter('all')}
                >
                  📧 All ({history.length})
                </button>
                <button
                  className={`filter-btn ${historyFilter === 'sent' ? 'active' : ''}`}
                  onClick={() => setHistoryFilter('sent')}
                >
                  📤 Sent ({history.filter(m => m.sender_id === user.id).length})
                </button>
                <button
                  className={`filter-btn ${historyFilter === 'received' ? 'active' : ''}`}
                  onClick={() => setHistoryFilter('received')}
                >
                  📥 Received ({history.filter(m => m.receiver_id === user.id).length})
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="empty-state">
                <p>No message history</p>
              </div>
            ) : (
              <div className="history-items">
                {history
                  .filter(msg => {
                    // Apply filter
                    if (historyFilter === 'sent' && msg.sender_id !== user.id) return false;
                    if (historyFilter === 'received' && msg.receiver_id !== user.id) return false;
                    
                    // Apply search
                    if (searchTerm) {
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        msg.subject.toLowerCase().includes(searchLower) ||
                        msg.message.toLowerCase().includes(searchLower) ||
                        (msg.sender_id === user.id ? msg.receiver_name : msg.sender_name)
                          .toLowerCase()
                          .includes(searchLower)
                      );
                    }
                    return true;
                  })
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((msg) => (
                    <div key={msg.id} className="history-item">
                      <div className="history-direction">
                        {msg.sender_id === user.id ? (
                          <span className="sent">📤 Sent</span>
                        ) : (
                          <span className="received">📥 Received</span>
                        )}
                      </div>
                      <div className="history-content">
                        <h4>{msg.subject}</h4>
                        <p>{msg.message}</p>
                        <div className="history-meta">
                          <span className="recipient">
                            {msg.sender_id === user.id ? '📮 To: ' : '📬 From: '}
                            <strong>
                              {msg.sender_id === user.id
                                ? msg.receiver_name
                                : msg.sender_name}
                            </strong>
                          </span>
                          <span className="role">
                            {msg.sender_id === user.id
                              ? msg.receiver_role
                              : msg.sender_role}
                          </span>
                          <span className="time">{formatDate(msg.created_at)}</span>
                        </div>
                        {msg.reply_count > 0 && (
                          <span className="reply-count">
                            💬 {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Thread View */}
        {view === 'thread' && !loading && selectedConversation && (
          <div className="thread-view">
            <div className="thread-header">
              <h3>Conversation with {selectedConversation.other_user_name}</h3>
              <p className="thread-role">{selectedConversation.other_user_role}</p>
            </div>

            <div className="thread-messages">
              {threadMessages.length === 0 ? (
                <div className="empty-state">
                  <p>No messages in this conversation</p>
                </div>
              ) : (
                threadMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`thread-message ${
                      msg.sender_id === user.id ? 'sent' : 'received'
                    }`}
                  >
                    <div className="msg-header">
                      <strong>{msg.sender_name}</strong>
                      <span className="msg-time">{formatDate(msg.created_at)}</span>
                    </div>
                    <div className="msg-subject">{msg.subject}</div>
                    <div className="msg-body">{msg.message}</div>

                    {/* Show replies for this message */}
                    {msg.reply_count > 0 && (
                      <div className="msg-replies">
                        {threadReplies
                          .filter((r) => r.message_id === msg.id)
                          .map((reply) => (
                            <div key={reply.id} className="reply-item">
                              <div className="reply-header">
                                <strong>{reply.sender_name}</strong>
                                <span className="reply-time">
                                  {formatDate(reply.created_at)}
                                </span>
                              </div>
                              <div className="reply-body">{reply.message}</div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Reply button */}
                    {msg.sender_id !== user.id && (
                      <button
                        className="reply-btn"
                        onClick={() => {
                          setShowReplyForm(true);
                          setReplySubject(`Re: ${msg.subject}`);
                        }}
                      >
                        ↩️ Reply
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Reply Form */}
            {showReplyForm && (
              <div className="reply-form">
                <h4>Send Reply</h4>
                <input
                  type="text"
                  placeholder="Subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="reply-subject"
                />
                <textarea
                  placeholder="Your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows="4"
                  className="reply-textarea"
                />
                <div className="reply-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyText('');
                      setReplySubject('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-send"
                    onClick={() => {
                      const messageToReply = threadMessages.find(
                        (m) => m.sender_id !== user.id
                      );
                      if (messageToReply) {
                        handleSendReply(messageToReply.id);
                      }
                    }}
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMessagesView;
