import React, { useState, useEffect } from 'react';
import './SystemSettings.css';
import axios from 'axios';
import PageHeader from './PageHeader';

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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/system-settings');
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
      await axios.post('http://localhost:5000/api/system-settings', settings);
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
      await axios.post(`http://localhost:5000/api/system-settings/action/${confirmAction}`);
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
