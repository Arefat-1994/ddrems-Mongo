import React, { useState, useEffect } from 'react';
import './SystemSettings.css';
import axios from 'axios';
import PageHeader from './PageHeader';

const AVAILABLE_SERVICES = [
  { key: 'dashboard', label: '📊 Dashboard' },
  { key: 'properties', label: '🏠 Properties' },
  { key: 'brokers', label: '🤝 Brokers' },
  { key: 'transactions', label: '💳 Transactions' },
  { key: 'messages', label: '✉️ Messages' },
  { key: 'agreements', label: '📄 Agreements' },
  { key: 'commission', label: '💰 Commission' },
  { key: 'favorites', label: '❤️ Favorites' },
  { key: 'bookings', label: '📅 Bookings' },
  { key: 'complaints', label: '📢 Complaints' },
  { key: 'broker-engagement', label: '🔗 Broker Engagement' },
  { key: 'rent-payments', label: '🏦 Rent Payments' },
  { key: 'agreement-workflow', label: '📋 Agreement Workflow' },
  { key: 'map-view', label: '🗺️ Map View' },
  { key: 'site-check', label: '🔍 Site Check' },

  { key: 'all_services', label: '🌐 All Services' },
];

const ROLES = [
  { key: 'user', label: '👤 Customer' },
  { key: 'owner', label: '🏠 Owner' },
  { key: 'broker', label: '🤝 Broker' },
  { key: 'property_admin', label: '🛡️ Property Admin' },
  { key: 'all', label: '🌍 All Roles' },
];

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const SystemSettings = ({ user, onLogout, onSettingsClick }) => {
  const [settings, setSettings] = useState({
    theme: 'light',
    primaryColor: '#667eea',
    accentColor: '#764ba2',
    soundEnabled: true,
    notificationsEnabled: true,
    systemStatus: 'active',
    maintenanceMode: false,
    maintenanceMessage: '',
    maxUsers: 1000,
    sessionTimeout: 30,
    enableRegistration: true,
    enableBrokerRegistration: true,
    enableOwnerRegistration: true,
    twoFactorAuth: false,
    ipWhitelist: false,
    ipWhitelistAddresses: '',
    backupEnabled: true,
    backupFrequency: 'daily',
    logLevel: 'info',
    apiRateLimit: 1000,
    apiRateLimitWindow: 3600
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('display');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  // Service Control state
  const [serviceControls, setServiceControls] = useState([]);
  const [scRole, setScRole] = useState('user');
  const [scService, setScService] = useState('dashboard');
  const [scMessage, setScMessage] = useState('This service is currently unavailable. Please try again later.');
  const [scStatusType, setScStatusType] = useState('unavailable');
  const [scEstRestore, setScEstRestore] = useState('');
  // System Schedule state
  const [schedule, setSchedule] = useState(null);
  // Login Attempts state
  const [loginAttempts, setLoginAttempts] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchServiceControls();
    fetchSchedule();
    fetchLoginAttempts();
  }, []);

  const fetchLoginAttempts = async () => {
    try {
      const res = await axios.get(`${window.API_URL}/auth/login-attempts`);
      setLoginAttempts(res.data);
    } catch (e) { console.error('Error fetching login attempts:', e); }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.post(`${window.API_URL}/auth/unban/${userId}`, { adminId: user?.id });
      setSuccessMessage('✅ User account has been reactivated successfully!');
      fetchLoginAttempts();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      setErrorMessage('❌ Failed to unban user');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const fetchServiceControls = async () => {
    try {
      const res = await axios.get(`${window.API_URL}/service-control`);
      setServiceControls(res.data);
    } catch (e) { console.error('Error fetching service controls:', e); }
  };

  const fetchSchedule = async () => {
    try {
      const res = await axios.get(`${window.API_URL}/service-control/schedule`);
      setSchedule(res.data);
    } catch (e) { console.error('Error fetching schedule:', e); }
  };

  const handleAddServiceControl = async () => {
    try {
      await axios.post(`${window.API_URL}/service-control`, {
        target_role: scRole, service_name: scService, is_disabled: true,
        display_message: scMessage, status_type: scStatusType,
        estimated_restore: scEstRestore || null, disabled_by: user?.id
      });
      setSuccessMessage('✅ Service control rule added!');
      fetchServiceControls();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) { setErrorMessage('❌ Failed to add service control'); setTimeout(() => setErrorMessage(''), 3000); }
  };

  const handleToggleServiceControl = async (ctrl) => {
    try {
      await axios.post(`${window.API_URL}/service-control`, {
        ...ctrl, is_disabled: !ctrl.is_disabled, disabled_by: user?.id
      });
      fetchServiceControls();
    } catch (e) { setErrorMessage('❌ Failed to update'); setTimeout(() => setErrorMessage(''), 3000); }
  };

  const handleDeleteServiceControl = async (id) => {
    try {
      await axios.delete(`${window.API_URL}/service-control/${id}`);
      setSuccessMessage('✅ Service control removed');
      fetchServiceControls();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) { setErrorMessage('❌ Failed to delete'); setTimeout(() => setErrorMessage(''), 3000); }
  };

  const handleSaveSchedule = async () => {
    try {
      await axios.post(`${window.API_URL}/service-control/schedule`, { ...schedule, modified_by: user?.id });
      setSuccessMessage('✅ Schedule saved!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) { setErrorMessage('❌ Failed to save schedule'); setTimeout(() => setErrorMessage(''), 3000); }
  };

  const handleForceToggle = async (close) => {
    try {
      await axios.post(`${window.API_URL}/service-control/schedule/force-toggle`, {
        force_closed: close, force_closed_message: schedule?.force_closed_message || 'System closed by administrator.', modified_by: user?.id
      });
      setSuccessMessage(close ? '🔒 System force-closed' : '🔓 System opened');
      fetchSchedule();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) { setErrorMessage('❌ Failed to toggle'); setTimeout(() => setErrorMessage(''), 3000); }
  };

  const handleScheduleChange = (key, value) => setSchedule(prev => ({ ...prev, [key]: value }));

  const toggleActiveDay = (day) => {
    if (!schedule) return;
    const days = [...(schedule.active_days || [])];
    const idx = days.indexOf(day);
    if (idx > -1) days.splice(idx, 1); else days.push(day);
    days.sort();
    setSchedule(prev => ({ ...prev, active_days: days }));
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${window.API_URL}/system-settings`);
      setSettings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setLoading(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.post(`${window.API_URL}/system-settings`, settings);
      setSuccessMessage('✅ Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setErrorMessage('❌ Failed to save settings');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSystemAction = (action) => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const confirmSystemAction = async () => {
    setSaving(true);
    try {
      await axios.post(`${window.API_URL}/system-settings/action/${confirmAction}`);
      setSuccessMessage(`✅ System ${confirmAction} successfully!`);
      if (confirmAction === 'shutdown') {
        setTimeout(() => onLogout(), 2000);
      } else {
        fetchSettings();
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error performing action:', error);
      setErrorMessage(`❌ Failed to ${confirmAction} system`);
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  if (loading) {
    return <div className="system-settings-loading">Loading system settings...</div>;
  }

  return (
    <div className="system-settings">
      <PageHeader
        title="System Settings"
        subtitle="Manage system configuration, theme, and security"
        user={user}
        onLogout={onLogout}
        onSettingsClick={onSettingsClick}
      />

      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {errorMessage && <div className="alert alert-error">{errorMessage}</div>}

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <div className="settings-nav">
            <button
              className={`nav-item ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              🎨 Display & Theme
            </button>
            <button
              className={`nav-item ${activeTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveTab('audio')}
            >
              🔊 Audio & Notifications
            </button>
            <button
              className={`nav-item ${activeTab === 'system' ? 'active' : ''}`}
              onClick={() => setActiveTab('system')}
            >
              ⚙️ System Control
            </button>
            <button
              className={`nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              🔒 Security
            </button>
            <button
              className={`nav-item ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              ⚡ Performance
            </button>
            <button
              className={`nav-item ${activeTab === 'backup' ? 'active' : ''}`}
              onClick={() => setActiveTab('backup')}
            >
              💾 Backup & Logs
            </button>
            <button
              className={`nav-item ${activeTab === 'service-control' ? 'active' : ''}`}
              onClick={() => setActiveTab('service-control')}
            >
              🛑 Service Control
            </button>
            <button
              className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              🕐 System Schedule
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="settings-content">
          {/* Display & Theme Tab */}
          {activeTab === 'display' && (
            <div className="settings-section">
              <h2>🎨 Display & Theme Settings</h2>
              
              <div className="setting-group">
                <label>Theme Mode</label>
                <div className="theme-selector">
                  <button
                    className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'light')}
                  >
                    ☀️ Light
                  </button>
                  <button
                    className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'dark')}
                  >
                    🌙 Dark
                  </button>
                  <button
                    className={`theme-btn ${settings.theme === 'auto' ? 'active' : ''}`}
                    onClick={() => handleSettingChange('theme', 'auto')}
                  >
                    🔄 Auto
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label>Primary Color</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                    className="color-picker"
                  />
                  <span className="color-value">{settings.primaryColor}</span>
                </div>
                <div className="color-preview" style={{ backgroundColor: settings.primaryColor }}></div>
              </div>

              <div className="setting-group">
                <label>Accent Color</label>
                <div className="color-picker-group">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => handleSettingChange('accentColor', e.target.value)}
                    className="color-picker"
                  />
                  <span className="color-value">{settings.accentColor}</span>
                </div>
                <div className="color-preview" style={{ backgroundColor: settings.accentColor }}></div>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                  />
                  Enable Notifications
                </label>
              </div>
            </div>
          )}

          {/* Audio & Notifications Tab */}
          {activeTab === 'audio' && (
            <div className="settings-section">
              <h2>🔊 Audio & Notifications Settings</h2>
              
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
                  />
                  Enable System Sounds
                </label>
                <p className="setting-hint">Play notification sounds for system events</p>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => handleSettingChange('notificationsEnabled', e.target.checked)}
                  />
                  Enable Notifications
                </label>
                <p className="setting-hint">Show desktop notifications for important events</p>
              </div>

              <div className="sound-test">
                <button className="btn-test-sound" onClick={() => {
                  const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
                  audio.play();
                }}>
                  🔊 Test Sound
                </button>
              </div>
            </div>
          )}

          {/* System Control Tab */}
          {activeTab === 'system' && (
            <div className="settings-section">
              <h2>⚙️ System Control</h2>
              
              <div className="system-status">
                <div className="status-card">
                  <h3>System Status</h3>
                  <div className="status-indicator" style={{
                    backgroundColor: settings.systemStatus === 'active' ? '#10b981' : '#ef4444'
                  }}>
                    {settings.systemStatus === 'active' ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                </div>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  />
                  Maintenance Mode
                </label>
                <p className="setting-hint">Enable to prevent user access during maintenance</p>
              </div>

              {settings.maintenanceMode && (
                <div className="setting-group">
                  <label>Maintenance Message</label>
                  <textarea
                    value={settings.maintenanceMessage}
                    onChange={(e) => handleSettingChange('maintenanceMessage', e.target.value)}
                    placeholder="Enter message to display to users..."
                    rows="4"
                  />
                </div>
              )}

              <div className="setting-group">
                <label>Max Concurrent Users</label>
                <input
                  type="number"
                  value={settings.maxUsers}
                  onChange={(e) => handleSettingChange('maxUsers', parseInt(e.target.value))}
                  min="1"
                  max="10000"
                />
              </div>

              <div className="setting-group">
                <label>Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  min="5"
                  max="1440"
                />
              </div>

              <div className="system-actions">
                <h3>System Actions</h3>
                <div className="action-buttons">
                  <button
                    className="btn-action btn-restart"
                    onClick={() => handleSystemAction('restart')}
                  >
                    🔄 Restart System
                  </button>
                  <button
                    className="btn-action btn-pause"
                    onClick={() => handleSystemAction('pause')}
                  >
                    ⏸️ Pause System
                  </button>
                  <button
                    className="btn-action btn-shutdown"
                    onClick={() => handleSystemAction('shutdown')}
                  >
                    🛑 Shutdown System
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <h2>🔒 Security Settings</h2>
              
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableRegistration}
                    onChange={(e) => handleSettingChange('enableRegistration', e.target.checked)}
                  />
                  Allow User Registration
                </label>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableBrokerRegistration}
                    onChange={(e) => handleSettingChange('enableBrokerRegistration', e.target.checked)}
                  />
                  Allow Broker Registration
                </label>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enableOwnerRegistration}
                    onChange={(e) => handleSettingChange('enableOwnerRegistration', e.target.checked)}
                  />
                  Allow Owner Registration
                </label>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth}
                    onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                  />
                  Require Two-Factor Authentication
                </label>
                <p className="setting-hint">Enhance security by requiring 2FA for all users</p>
              </div>

              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.ipWhitelist}
                    onChange={(e) => handleSettingChange('ipWhitelist', e.target.checked)}
                  />
                  Enable IP Whitelist
                </label>
              </div>

              {settings.ipWhitelist && (
                <div className="setting-group">
                  <label>Whitelisted IP Addresses</label>
                  <textarea
                    value={settings.ipWhitelistAddresses}
                    onChange={(e) => handleSettingChange('ipWhitelistAddresses', e.target.value)}
                    placeholder="Enter IP addresses (one per line)&#10;Example: 192.168.1.1"
                    rows="4"
                  />
                </div>
              )}

              {/* Suspicious and Banned Accounts */}
              <div style={{ marginTop: '40px', borderTop: '2px solid #e2e8f0', paddingTop: '30px' }}>
                <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚨 Suspicious & Banned Accounts ({loginAttempts.length})
                </h3>
                <p className="setting-hint" style={{ marginBottom: '20px' }}>
                  Accounts with 6+ failed logins are flagged as Suspicious. 9+ failures result in an automatic Ban. Review and unban accounts below.
                </p>

                {loginAttempts.length === 0 ? (
                  <p style={{ color: '#64748b', textAlign: 'center', padding: '20px', background: '#f8fafc', borderRadius: '8px' }}>No suspicious or banned accounts found.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                          <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>User</th>
                          <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                          <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Failed Attempts</th>
                          <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Last IP</th>
                          <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                          <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginAttempts.map(attempt => (
                          <tr key={attempt._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 12px' }}>
                              <strong>{attempt.user_name}</strong><br />
                              <span style={{ color: '#64748b', fontSize: '11px' }}>{attempt.user_role}</span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>{attempt.email}</td>
                            <td style={{ padding: '10px 12px', color: '#dc2626', fontWeight: 'bold' }}>{attempt.failed_count}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b' }}>{attempt.last_ip}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                background: attempt.phase === 'banned' ? '#fef2f2' : attempt.phase === 'suspicious' ? '#fffbeb' : '#f8fafc',
                                color: attempt.phase === 'banned' ? '#dc2626' : attempt.phase === 'suspicious' ? '#d97706' : '#64748b',
                                border: `1px solid ${attempt.phase === 'banned' ? '#fecaca' : attempt.phase === 'suspicious' ? '#fde68a' : '#e2e8f0'}`,
                              }}>
                                {attempt.phase === 'banned' ? '🛑 Banned' : attempt.phase === 'suspicious' ? '🚨 Suspicious' : '🔒 Locked'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <button onClick={() => {
                                if (window.confirm(`Are you sure you want to unban/reactivate ${attempt.email}?`)) {
                                  handleUnbanUser(attempt.user_id);
                                }
                              }}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                                🔓 Reactivate
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <div className="settings-section">
              <h2>⚡ Performance Settings</h2>
              
              <div className="setting-group">
                <label>API Rate Limit (requests per window)</label>
                <input
                  type="number"
                  value={settings.apiRateLimit}
                  onChange={(e) => handleSettingChange('apiRateLimit', parseInt(e.target.value))}
                  min="100"
                  max="10000"
                />
              </div>

              <div className="setting-group">
                <label>Rate Limit Window (seconds)</label>
                <input
                  type="number"
                  value={settings.apiRateLimitWindow}
                  onChange={(e) => handleSettingChange('apiRateLimitWindow', parseInt(e.target.value))}
                  min="60"
                  max="3600"
                />
              </div>

              <div className="setting-group">
                <label>Log Level</label>
                <select
                  value={settings.logLevel}
                  onChange={(e) => handleSettingChange('logLevel', e.target.value)}
                >
                  <option value="debug">🐛 Debug</option>
                  <option value="info">ℹ️ Info</option>
                  <option value="warn">⚠️ Warning</option>
                  <option value="error">❌ Error</option>
                </select>
              </div>

              <div className="performance-info">
                <h3>Performance Metrics</h3>
                <div className="metric-card">
                  <span>API Response Time</span>
                  <strong>45ms</strong>
                </div>
                <div className="metric-card">
                  <span>Database Query Time</span>
                  <strong>12ms</strong>
                </div>
                <div className="metric-card">
                  <span>Cache Hit Rate</span>
                  <strong>87%</strong>
                </div>
              </div>
            </div>
          )}

          {/* Backup & Logs Tab */}
          {activeTab === 'backup' && (
            <div className="settings-section">
              <h2>💾 Backup & Logs</h2>
              
              <div className="setting-group">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.backupEnabled}
                    onChange={(e) => handleSettingChange('backupEnabled', e.target.checked)}
                  />
                  Enable Automatic Backups
                </label>
              </div>

              {settings.backupEnabled && (
                <div className="setting-group">
                  <label>Backup Frequency</label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
                  >
                    <option value="hourly">⏰ Hourly</option>
                    <option value="daily">📅 Daily</option>
                    <option value="weekly">📆 Weekly</option>
                    <option value="monthly">📊 Monthly</option>
                  </select>
                </div>
              )}

              <div className="backup-actions">
                <h3>Backup Management</h3>
                <div className="action-buttons">
                  <button className="btn-action btn-backup">
                    💾 Create Backup Now
                  </button>
                  <button className="btn-action btn-restore">
                    📥 Restore from Backup
                  </button>
                  <button className="btn-action btn-export">
                    📤 Export Logs
                  </button>
                </div>
              </div>

              <div className="backup-history">
                <h3>Recent Backups</h3>
                <div className="backup-item">
                  <span>Backup_2026_04_07_10_30.zip</span>
                  <span className="backup-date">2 hours ago</span>
                </div>
                <div className="backup-item">
                  <span>Backup_2026_04_06_10_30.zip</span>
                  <span className="backup-date">1 day ago</span>
                </div>
                <div className="backup-item">
                  <span>Backup_2026_04_05_10_30.zip</span>
                  <span className="backup-date">2 days ago</span>
                </div>
              </div>
            </div>
          )}

          {/* Service Control Tab */}
          {activeTab === 'service-control' && (
            <div className="settings-section">
              <h2>🛑 Service Control</h2>
              <p className="setting-hint">Disable services or dashboards for specific user roles. Affected users will see a custom unavailability message.</p>

              {/* Add New Rule */}
              <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.15)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '15px', color: '#4f46e5' }}>➕ Add Service Control Rule</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="setting-group" style={{ marginBottom: 0 }}>
                    <label>Target Role</label>
                    <select value={scRole} onChange={e => setScRole(e.target.value)}>
                      {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="setting-group" style={{ marginBottom: 0 }}>
                    <label>Service</label>
                    <select value={scService} onChange={e => setScService(e.target.value)}>
                      {AVAILABLE_SERVICES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="setting-group" style={{ marginBottom: 0 }}>
                    <label>Status Type</label>
                    <select value={scStatusType} onChange={e => setScStatusType(e.target.value)}>
                      <option value="repair">🔧 Under Repair</option>
                      <option value="unavailable">🚫 Unavailable</option>
                      <option value="maintenance">⚙️ Maintenance</option>
                      <option value="custom">📢 Custom</option>
                    </select>
                  </div>
                  <div className="setting-group" style={{ marginBottom: 0 }}>
                    <label>Estimated Restore (optional)</label>
                    <input type="datetime-local" value={scEstRestore} onChange={e => setScEstRestore(e.target.value)} />
                  </div>
                </div>
                <div className="setting-group" style={{ marginBottom: '12px' }}>
                  <label>Display Message</label>
                  <textarea value={scMessage} onChange={e => setScMessage(e.target.value)} rows="2" placeholder="Message shown to affected users..." />
                </div>
                <button className="btn-action btn-restart" onClick={handleAddServiceControl} style={{ width: '100%' }}>
                  🛑 Disable Service for Selected Role
                </button>
              </div>

              {/* Active Rules Table */}
              <h3 style={{ marginBottom: '12px' }}>📋 Active Service Controls ({serviceControls.length})</h3>
              {serviceControls.length === 0 ? (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No service controls configured. All services are available for all roles.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Role</th>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Service</th>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Status</th>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Enabled</th>
                        <th style={{ padding: '10px 12px', borderBottom: '2px solid #e2e8f0' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceControls.map(ctrl => (
                        <tr key={ctrl._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 12px' }}>{ROLES.find(r => r.key === ctrl.target_role)?.label || ctrl.target_role}</td>
                          <td style={{ padding: '10px 12px' }}>{AVAILABLE_SERVICES.find(s => s.key === ctrl.service_name)?.label || ctrl.service_name}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                              background: ctrl.is_disabled ? '#fef2f2' : '#f0fdf4',
                              color: ctrl.is_disabled ? '#dc2626' : '#16a34a',
                              border: `1px solid ${ctrl.is_disabled ? '#fecaca' : '#bbf7d0'}`,
                            }}>
                              {ctrl.is_disabled ? '🔴 Blocked' : '🟢 Active'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <label className="toggle-switch-mini" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                              <input type="checkbox" checked={ctrl.is_disabled} onChange={() => handleToggleServiceControl(ctrl)} style={{ display: 'none' }} />
                              <span style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: ctrl.is_disabled ? '#ef4444' : '#10b981', borderRadius: '24px', transition: '0.3s',
                              }}>
                                <span style={{
                                  position: 'absolute', height: '18px', width: '18px', left: ctrl.is_disabled ? '22px' : '3px',
                                  bottom: '3px', backgroundColor: '#fff', borderRadius: '50%', transition: '0.3s',
                                }} />
                              </span>
                            </label>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <button onClick={() => handleDeleteServiceControl(ctrl._id)}
                              style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>
                              🗑️ Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* System Schedule Tab */}
          {activeTab === 'schedule' && schedule && (
            <div className="settings-section">
              <h2>🕐 System Open/Close Schedule</h2>
              <p className="setting-hint">Define when the system is available. Non-exempt users will be locked out outside operating hours.</p>

              {/* Force Close/Open */}
              <div style={{ background: schedule.force_closed ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: `1px solid ${schedule.force_closed ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>
                      {schedule.force_closed ? '🔒 System is Force-Closed' : '🔓 System is Open'}
                    </h3>
                    <p className="setting-hint" style={{ margin: '4px 0 0' }}>Immediately close or open the system for all non-exempt users.</p>
                  </div>
                  <button
                    className={`btn-action ${schedule.force_closed ? 'btn-restart' : 'btn-shutdown'}`}
                    onClick={() => handleForceToggle(!schedule.force_closed)}
                  >
                    {schedule.force_closed ? '🔓 Open System Now' : '🔒 Close System Now'}
                  </button>
                </div>
                <div className="setting-group" style={{ marginBottom: 0 }}>
                  <label>Closed Message</label>
                  <textarea value={schedule.force_closed_message || ''} onChange={e => handleScheduleChange('force_closed_message', e.target.value)} rows="2" placeholder="Message shown when system is closed..." />
                </div>
              </div>

              {/* Scheduled Hours */}
              <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.15)' }}>
                <div className="setting-group" style={{ marginBottom: '16px' }}>
                  <label>
                    <input type="checkbox" checked={schedule.is_enabled} onChange={e => handleScheduleChange('is_enabled', e.target.checked)} />
                    {' '}Enable Scheduled Operating Hours
                  </label>
                  <p className="setting-hint">When enabled, the system automatically opens and closes based on the schedule below.</p>
                </div>

                {schedule.is_enabled && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div className="setting-group" style={{ marginBottom: 0 }}>
                        <label>⏰ Open Time</label>
                        <input type="time" value={schedule.open_time || '08:00'} onChange={e => handleScheduleChange('open_time', e.target.value)} />
                      </div>
                      <div className="setting-group" style={{ marginBottom: 0 }}>
                        <label>⏰ Close Time</label>
                        <input type="time" value={schedule.close_time || '22:00'} onChange={e => handleScheduleChange('close_time', e.target.value)} />
                      </div>
                    </div>

                    <div className="setting-group" style={{ marginBottom: '16px' }}>
                      <label>📅 Active Days</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {DAY_NAMES.map((name, idx) => (
                          <button key={idx} onClick={() => toggleActiveDay(idx)} style={{
                            padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                            background: (schedule.active_days || []).includes(idx) ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#f1f5f9',
                            color: (schedule.active_days || []).includes(idx) ? '#fff' : '#64748b',
                            border: (schedule.active_days || []).includes(idx) ? 'none' : '1px solid #cbd5e1',
                          }}>
                            {name.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <button className="btn-action btn-restart" onClick={handleSaveSchedule} style={{ width: '100%' }}>
                  💾 Save Schedule
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="settings-footer">
            <button
              className="btn-save"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? '⏳ Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Confirm Action</h3>
            <p>Are you sure you want to {confirmAction} the system? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowConfirmDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={confirmSystemAction}
              >
                Confirm {confirmAction}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
