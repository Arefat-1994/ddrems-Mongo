import React, { useState, useEffect } from 'react';
import './SendMessage.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const SendMessage = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [formData, setFormData] = useState({
    receiver_id: '',
    subject: '',
    message: '',
    message_type: 'general'
  });
  const [sendMode, setSendMode] = useState('single'); // single, group, or bulk
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('all');

  // Check if user can send messages
  const canSendMessages = ['admin', 'system_admin', 'property_admin', 'broker', 'owner', 'user'].includes(user?.role);
  const canSendBulk = ['admin', 'system_admin', 'property_admin'].includes(user?.role);

  useEffect(() => {
    const initializeComponent = async () => {
      setInitializing(true);
      if (canSendMessages) {
        await fetchUsers();
      }
      setInitializing(false);
    };
    
    initializeComponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:5000/api/users?userId=${user.id}`);
      setUsers(response.data.filter(u => u.id !== user.id));
      setError('');
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (sendMode === 'bulk') {
        if (!canSendBulk) {
          setError('You do not have permission to send bulk messages');
          setLoading(false);
          return;
        }

        // For bulk mode, either selectedUsers or filterRole must be specified
        if (selectedUsers.length === 0 && (!filterRole || filterRole === 'all' || filterRole === '')) {
          setError('Please select recipients or choose a role to send to');
          setLoading(false);
          return;
        }

        const response = await axios.post(`http://localhost:5000/api/messages/bulk?userId=${user.id}`, {
          receiver_ids: selectedUsers.length > 0 ? selectedUsers : undefined,
          filter_role: filterRole && filterRole !== 'all' ? filterRole : undefined,
          subject: formData.subject,
          message: formData.message,
          message_type: formData.message_type,
          sender_id: user.id
        });

        if (response.data.success) {
          setSuccess(`✅ Message sent to ${response.data.count} recipients successfully!`);
          resetForm();
        } else {
          setError(response.data.message || 'Failed to send messages');
        }
      } else if (sendMode === 'group') {
        if (selectedUsers.length === 0) {
          setError('Please select at least one recipient');
          setLoading(false);
          return;
        }

        const response = await axios.post(`http://localhost:5000/api/messages?userId=${user.id}`, {
          receiver_ids: selectedUsers,
          subject: formData.subject,
          message: formData.message,
          message_type: formData.message_type,
          is_group: true,
          sender_id: user.id
        });

        if (response.data.success) {
          setSuccess(`✅ Group message sent to ${response.data.count} recipients!`);
          resetForm();
        } else {
          setError(response.data.message || 'Failed to send message');
        }
      } else {
        // Single message
        if (!formData.receiver_id) {
          setError('Please select a recipient');
          setLoading(false);
          return;
        }

        const response = await axios.post(`http://localhost:5000/api/messages?userId=${user.id}`, {
          receiver_id: parseInt(formData.receiver_id),
          subject: formData.subject,
          message: formData.message,
          message_type: formData.message_type,
          sender_id: user.id
        });

        if (response.data.success) {
          setSuccess('✅ Message sent successfully!');
          resetForm();
        } else {
          setError(response.data.message || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send message';
      setError(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      receiver_id: '',
      subject: '',
      message: '',
      message_type: 'general'
    });
    setSelectedUsers([]);
  };

  const handleUserSelect = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    const filteredUserIds = filteredUsers.map(u => u.id);
    if (selectedUsers.length === filteredUserIds.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUserIds);
    }
  };

  const filteredUsers = users.filter(u =>
    filterRole === 'all' || u.role === filterRole
  );

  if (initializing) {
    return (
      <div className="send-message-page">
        <PageHeader
          title="Send Message"
          subtitle="Loading..."
          user={user}
          onLogout={onLogout}
        />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (!canSendMessages) {
    return (
      <div className="send-message-page">
        <PageHeader
          title="Send Message"
          subtitle="Access Restricted"
          user={user}
          onLogout={onLogout}
        />
        <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>
          <h3>❌ Access Denied</h3>
          <p>You do not have permission to send messages.</p>
          <p>Contact your administrator if you believe this is an error.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="send-message-page">
      <PageHeader
        title="Send Message"
        subtitle={`Send messages and notifications to users (${user.role})`}
        user={user}
        onLogout={onLogout}
      />

      <div className="send-message-container">
        <div className="message-form-card">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <div className="send-mode-toggle">
            <button
              className={`mode-btn ${sendMode === 'single' ? 'active' : ''}`}
              onClick={() => {
                setSendMode('single');
                setFilterRole('all');
                setSelectedUsers([]);
              }}
              title="Send to one person"
            >
              📧 Single User
            </button>
            <button
              className={`mode-btn ${sendMode === 'group' ? 'active' : ''}`}
              onClick={() => {
                setSendMode('group');
                setFilterRole('all');
                setSelectedUsers([]);
              }}
              title="Send to multiple selected users"
            >
              👥 Group Message
            </button>
            {canSendBulk && (
              <button
                className={`mode-btn ${sendMode === 'bulk' ? 'active' : ''}`}
                onClick={() => {
                  setSendMode('bulk');
                  setFilterRole('all');
                  setSelectedUsers([]);
                }}
                title="Send to all users of a role"
              >
                📢 Bulk (By Role)
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="message-form">
            {sendMode === 'single' ? (
              <div className="form-group">
                <label>Recipient *</label>
                <select
                  value={formData.receiver_id}
                  onChange={(e) => setFormData({ ...formData, receiver_id: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>
            ) : sendMode === 'group' ? (
              <div className="form-group">
                <label>Recipients ({selectedUsers.length} selected) *</label>
                <div className="bulk-select-controls">
                  <select
                    value={filterRole}
                    onChange={(e) => {
                      setFilterRole(e.target.value);
                      setSelectedUsers([]); // Clear selections when filter changes
                    }}
                    className="role-filter"
                    disabled={loading}
                  >
                    <option value="all">All Roles</option>
                    <option value="owner">Owners</option>
                    <option value="user">Customers</option>
                    <option value="broker">Brokers</option>
                    <option value="property_admin">Property Admins</option>
                    <option value="admin">Admins</option>
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSelectAll}
                    disabled={loading}
                  >
                    {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="users-checkbox-list">
                  {filteredUsers.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No users found</p>
                  ) : (
                    filteredUsers.map(u => (
                      <label key={u.id} className="user-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleUserSelect(u.id)}
                          disabled={loading}
                        />
                        <span className="user-info">
                          <strong>{u.name}</strong>
                          <small>{u.email} - {u.role}</small>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Send to Role *</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  required
                  disabled={loading}
                >
                  <option value="">Select a role</option>
                  <option value="owner">All Owners</option>
                  <option value="user">All Customers</option>
                  <option value="broker">All Brokers</option>
                  <option value="property_admin">All Property Admins</option>
                  <option value="admin">All Admins</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Message Type *</label>
              <select
                value={formData.message_type}
                onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                required
                disabled={loading}
              >
                <option value="general">General</option>
                <option value="property">Property Related</option>
                <option value="announcement">Announcement</option>
                <option value="alert">Alert</option>
                <option value="payment">Payment</option>
                <option value="verification">Verification</option>
              </select>
            </div>

            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter message subject"
                required
                disabled={loading}
                maxLength="255"
              />
            </div>

            <div className="form-group">
              <label>Message * ({formData.message.length}/5000)</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your message here..."
                rows="8"
                required
                disabled={loading}
                maxLength="5000"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={loading}>
                <span>📤</span> {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>

        <div className="message-preview-card">
          <h3>📋 Message Preview</h3>
          <div className="preview-content">
            <div className="preview-header">
              <strong>Subject:</strong> {formData.subject || 'No subject'}
            </div>
            <div className="preview-type">
              <strong>Type:</strong>
              <span className={`type-badge ${formData.message_type}`}>
                {formData.message_type}
              </span>
            </div>
            <div className="preview-body">
              <strong>Message:</strong>
              <p>{formData.message || 'No message content'}</p>
            </div>
            {sendMode === 'group' && (
              <div className="preview-recipients">
                <strong>Recipients:</strong> {selectedUsers.length} users
              </div>
            )}
            {sendMode === 'bulk' && (
              <div className="preview-recipients">
                <strong>Send to:</strong> All {filterRole === '' ? 'users' : filterRole}s
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendMessage;
