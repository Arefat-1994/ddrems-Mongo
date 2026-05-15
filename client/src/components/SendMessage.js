import React, { useState, useEffect, useRef } from 'react';
import './SendMessage.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const API_BASE = `${window.API_URL}`;

const SendMessage = ({ user, onLogout, onSettingsClick }) => {
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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRole, setSearchRole] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

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

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/users?userId=${user.id}`);
      setUsers(response.data.filter(u => u.id !== user.id));
      setError('');
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Live search users by name, email, phone, or ID
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const roleParam = searchRole !== 'all' ? `&role=${searchRole}` : '';
        const response = await axios.get(`${API_BASE}/users/search?q=${encodeURIComponent(query.trim())}${roleParam}`);
        const filtered = (response.data || []).filter(u => u.id !== user.id);
        setSearchResults(filtered);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
        // Fallback: filter from already loaded users
        const q = query.toLowerCase();
        const filtered = users.filter(u => {
          const matchesRole = searchRole === 'all' || u.role === searchRole;
          const matchesQuery = 
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.phone?.includes(q) ||
            u.id?.toString() === q;
          return matchesRole && matchesQuery;
        });
        setSearchResults(filtered);
        setShowSearchDropdown(true);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectRecipient = (selectedUser) => {
    if (sendMode === 'single') {
      setSelectedRecipient(selectedUser);
      setFormData({ ...formData, receiver_id: selectedUser.id });
      setSearchQuery(`${selectedUser.name} (${selectedUser.email})`);
      setShowSearchDropdown(false);
    } else {
      // group mode - toggle selection
      handleUserSelect(selectedUser.id);
    }
  };

  const clearSelectedRecipient = () => {
    setSelectedRecipient(null);
    setFormData({ ...formData, receiver_id: '' });
    setSearchQuery('');
    setSearchResults([]);
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

        const response = await axios.post(`${API_BASE}/messages/bulk?userId=${user.id}`, {
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

        const response = await axios.post(`${API_BASE}/messages?userId=${user.id}`, {
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
          setError('Please search and select a recipient');
          setLoading(false);
          return;
        }

        const response = await axios.post(`${API_BASE}/messages?userId=${user.id}`, {
          receiver_id: formData.receiver_id,
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
    setSelectedRecipient(null);
    setSearchQuery('');
    setSearchResults([]);
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

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'broker': return 'role-broker';
      case 'owner': return 'role-owner';
      case 'user': return 'role-customer';
      case 'system_admin': return 'role-admin';
      case 'property_admin': return 'role-padmin';
      default: return 'role-default';
    }
  };

  const formatRoleLabel = (role) => {
    switch (role) {
      case 'user': return 'Customer';
      case 'system_admin': return 'System Admin';
      case 'property_admin': return 'Property Admin';
      default: return role?.charAt(0).toUpperCase() + role?.slice(1);
    }
  };

  if (initializing) {
    return (
      <div className="send-message-page">
        <PageHeader
          title="Send Message"
          subtitle="Loading..."
          user={user}
          onLogout={onLogout}
          onSettingsClick={onSettingsClick}
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
          onSettingsClick={onSettingsClick}
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
        onSettingsClick={onSettingsClick}
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
                setSearchQuery('');
                setSelectedRecipient(null);
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
                setSearchQuery('');
                setSelectedRecipient(null);
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
                  setSearchQuery('');
                  setSelectedRecipient(null);
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
                
                {/* Search Bar with Role Dropdown */}
                <div className="recipient-search-container" ref={searchRef}>
                  <div className="search-row">
                    <div className="search-input-wrapper">
                      <span className="search-icon">🔍</span>
                      <input
                        type="text"
                        placeholder="Search by Name, ID, Email, or Phone..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowSearchDropdown(true);
                        }}
                        className="recipient-search-input"
                        disabled={loading}
                      />
                      {selectedRecipient && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={clearSelectedRecipient}
                          title="Clear selection"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <select
                      value={searchRole}
                      onChange={(e) => {
                        setSearchRole(e.target.value);
                        if (searchQuery.trim().length >= 2) {
                          handleSearch(searchQuery);
                        }
                      }}
                      className="role-filter-dropdown"
                      disabled={loading}
                    >
                      <option value="all">All Users</option>
                      <option value="broker">Brokers</option>
                      <option value="owner">Owners</option>
                      <option value="user">Customers</option>
                      <option value="property_admin">Property Admins</option>
                      <option value="system_admin">System Admins</option>
                    </select>
                  </div>

                  {/* Selected Recipient Badge */}
                  {selectedRecipient && (
                    <div className="selected-recipient-badge">
                      <div className="recipient-avatar">{selectedRecipient.name?.charAt(0)}</div>
                      <div className="recipient-details">
                        <strong>{selectedRecipient.name}</strong>
                        <span>{selectedRecipient.email}</span>
                        {selectedRecipient.phone && <span>📱 {selectedRecipient.phone}</span>}
                      </div>
                      <span className={`role-badge ${getRoleBadgeClass(selectedRecipient.role)}`}>
                        {formatRoleLabel(selectedRecipient.role)}
                      </span>
                      <button type="button" className="remove-recipient" onClick={clearSelectedRecipient}>✕</button>
                    </div>
                  )}

                  {/* Search Results Dropdown */}
                  {showSearchDropdown && !selectedRecipient && (
                    <div className="search-results-dropdown">
                      {searchLoading ? (
                        <div className="search-loading">
                          <span className="spinner"></span> Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="search-no-results">
                          <span>😕</span> No users found matching "{searchQuery}"
                        </div>
                      ) : (
                        searchResults.map(u => (
                          <div
                            key={u.id}
                            className="search-result-item"
                            onClick={() => handleSelectRecipient(u)}
                          >
                            <div className="result-avatar">{u.name?.charAt(0)}</div>
                            <div className="result-info">
                              <div className="result-name">{u.name}</div>
                              <div className="result-meta">
                                <span>📧 {u.email}</span>
                                {u.phone && <span>📱 {u.phone}</span>}
                                <span>ID: {u.id}</span>
                              </div>
                            </div>
                            <span className={`role-badge ${getRoleBadgeClass(u.role)}`}>
                              {formatRoleLabel(u.role)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : sendMode === 'group' ? (
              <div className="form-group">
                <label>Recipients ({selectedUsers.length} selected) *</label>
                
                {/* Search Bar for Group Mode */}
                <div className="recipient-search-container" ref={searchRef}>
                  <div className="search-row">
                    <button
                      type="button"
                      className="btn-secondary select-all-btn"
                      onClick={handleSelectAll}
                      disabled={loading}
                      style={{ flex: 1 }}
                    >
                      {selectedUsers.length === filteredUsers.length && filteredUsers.length > 0 ? '✕ Deselect All' : '✓ Select All'}
                    </button>
                    <select
                      value={filterRole}
                      onChange={(e) => {
                        setFilterRole(e.target.value);
                        setSelectedUsers([]);
                      }}
                      className="role-filter-dropdown"
                      disabled={loading}
                    >
                      <option value="all">All Roles</option>
                      <option value="owner">Owners</option>
                      <option value="user">Customers</option>
                      <option value="broker">Brokers</option>
                      <option value="property_admin">Property Admins</option>
                      <option value="system_admin">System Admins</option>
                    </select>
                  </div>
                </div>

                <div className="users-checkbox-list">
                  {filteredUsers.length === 0 ? (
                    <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No users found</p>
                  ) : (
                    filteredUsers.map(u => (
                      <label key={u.id} className={`user-checkbox ${selectedUsers.includes(u.id) ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => handleUserSelect(u.id)}
                          disabled={loading}
                        />
                        <span className="user-info">
                          <strong>{u.name}</strong>
                          <small>{u.email} • {formatRoleLabel(u.role)}</small>
                        </span>
                        <span className={`role-badge mini ${getRoleBadgeClass(u.role)}`}>
                          {formatRoleLabel(u.role)}
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
            {sendMode === 'single' && selectedRecipient && (
              <div className="preview-recipients">
                <strong>To:</strong> {selectedRecipient.name} ({selectedRecipient.email})
              </div>
            )}
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
