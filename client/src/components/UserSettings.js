import React, { useState, useEffect } from 'react';
import './UserSettings.css';
import axios from 'axios';

const UserSettings = ({ user, onLogout }) => {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('theme');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    fetchPreferences();
  }, [user?.id]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      
      // Check if user ID exists
      if (!user?.id) {
        console.error('User ID not available');
        setMessage('Error: User ID not found');
        setLoading(false);
        return;
      }
      
      console.log('Fetching settings for user:', user.id);
      const response = await axios.get(`/api/user-settings/${user.id}`);
      console.log('Settings loaded:', response.data);
      setPreferences(response.data);
      setMessage('');
    } catch (error) {
      console.error('Error fetching settings:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Set default preferences on error
      setPreferences({
        userId: user?.id,
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        textColor: '#333333',
        sidebarColor: '#f8f9fa',
        sidebarTextColor: '#333333',
        notificationsEnabled: true,
        soundEnabled: true,
        emailNotifications: true,
        twoFactorAuth: false,
        alertsEnabled: true,
        securityAlerts: true,
        loginAlerts: true,
        language: 'en',
        timezone: 'UTC'
      });
      
      setMessage('⚠️ Using default settings. Click Save to create your settings.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!user?.id) {
        setMessage('❌ Error: User ID not found');
        setSaving(false);
        return;
      }
      
      console.log('Saving settings for user:', user.id);
      const response = await axios.post(`/api/user-settings/${user.id}`, preferences);
      console.log('Save response:', response.data);
      
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // Save to localStorage for immediate application
      localStorage.setItem(`userSettings_${user.id}`, JSON.stringify(preferences));
      
      // Apply theme changes immediately
      applyTheme(preferences);
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error details:', error.response?.data || error.message);
      setMessage('❌ Error saving settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--bg-color', theme.backgroundColor);
    root.style.setProperty('--fg-color', theme.foregroundColor);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--sidebar-color', theme.sidebarColor);
    root.style.setProperty('--sidebar-text-color', theme.sidebarTextColor);
    
    // Apply to body
    document.body.style.backgroundColor = theme.backgroundColor;
    document.body.style.color = theme.textColor;
  };

  const handleResetTheme = () => {
    setConfirmAction(() => () => {
      const defaultTheme = {
        ...preferences,
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        textColor: '#333333',
        sidebarColor: '#f8f9fa',
        sidebarTextColor: '#333333'
      };
      setPreferences(defaultTheme);
      applyTheme(defaultTheme);
      setShowConfirm(false);
    });
    setShowConfirm(true);
  };

  const applyPresetTheme = (preset) => {
    const themes = {
      light: {
        theme: 'light',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        foregroundColor: '#000000',
        textColor: '#333333',
        sidebarColor: '#f8f9fa',
        sidebarTextColor: '#333333'
      },
      dark: {
        theme: 'dark',
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#1a1a1a',
        foregroundColor: '#ffffff',
        textColor: '#e0e0e0',
        sidebarColor: '#2d2d2d',
        sidebarTextColor: '#e0e0e0'
      },
      blue: {
        theme: 'blue',
        primaryColor: '#0066cc',
        accentColor: '#0052a3',
        backgroundColor: '#f0f4ff',
        foregroundColor: '#0066cc',
        textColor: '#003d99',
        sidebarColor: '#e6f0ff',
        sidebarTextColor: '#003d99'
      },
      green: {
        theme: 'green',
        primaryColor: '#00a86b',
        accentColor: '#008c56',
        backgroundColor: '#f0fff4',
        foregroundColor: '#00a86b',
        textColor: '#006b42',
        sidebarColor: '#e6fff0',
        sidebarTextColor: '#006b42'
      },
      purple: {
        theme: 'purple',
        primaryColor: '#9333ea',
        accentColor: '#7e22ce',
        backgroundColor: '#faf5ff',
        foregroundColor: '#9333ea',
        textColor: '#6b21a8',
        sidebarColor: '#f3e8ff',
        sidebarTextColor: '#6b21a8'
      }
    };

    const newTheme = { ...preferences, ...themes[preset] };
    setPreferences(newTheme);
    applyTheme(newTheme);
  };

  if (loading) {
    return (
      <div className="user-settings loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your preferences...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="user-settings error">
        <div className="error-message">
          <h2>⚠️ Error Loading Preferences</h2>
          <p>Unable to load your settings. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>🔄 Refresh Page</button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-settings">
      <div className="settings-header">
        <h1>⚙️ My Settings</h1>
        <p>Customize your experience</p>
      </div>

      {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}

      <div className="settings-container">
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
            onClick={() => setActiveTab('theme')}
          >
            🎨 Theme & Colors
          </button>
          <button
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 Notifications
          </button>
          <button
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            🔒 Security & Alerts
          </button>
        </div>

        <div className="settings-content">
          {/* Theme & Colors Tab */}
          {activeTab === 'theme' && (
            <div className="tab-content">
              <h2>🎨 Theme & Colors</h2>

              {/* Preset Themes */}
              <div className="setting-group">
                <label>Preset Themes</label>
                <div className="preset-themes">
                  <button
                    className="preset-btn light"
                    onClick={() => applyPresetTheme('light')}
                    title="Light Theme"
                  >
                    ☀️ Light
                  </button>
                  <button
                    className="preset-btn dark"
                    onClick={() => applyPresetTheme('dark')}
                    title="Dark Theme"
                  >
                    🌙 Dark
                  </button>
                  <button
                    className="preset-btn blue"
                    onClick={() => applyPresetTheme('blue')}
                    title="Blue Theme"
                  >
                    🔵 Blue
                  </button>
                  <button
                    className="preset-btn green"
                    onClick={() => applyPresetTheme('green')}
                    title="Green Theme"
                  >
                    🟢 Green
                  </button>
                  <button
                    className="preset-btn purple"
                    onClick={() => applyPresetTheme('purple')}
                    title="Purple Theme"
                  >
                    🟣 Purple
                  </button>
                </div>
              </div>

              {/* Custom Colors */}
              <div className="setting-group">
                <label>Custom Colors</label>
                <div className="color-grid">
                  <div className="color-input">
                    <label>Primary Color</label>
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={preferences.primaryColor}
                        onChange={(e) => {
                          handlePreferenceChange('primaryColor', e.target.value);
                          applyTheme({ ...preferences, primaryColor: e.target.value });
                        }}
                      />
                      <span className="color-value">{preferences.primaryColor}</span>
                    </div>
                  </div>

                  <div className="color-input">
                    <label>Accent Color</label>
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={preferences.accentColor}
                        onChange={(e) => {
                          handlePreferenceChange('accentColor', e.target.value);
                          applyTheme({ ...preferences, accentColor: e.target.value });
                        }}
                      />
                      <span className="color-value">{preferences.accentColor}</span>
                    </div>
                  </div>

                  <div className="color-input">
                    <label>Background Color</label>
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={preferences.backgroundColor}
                        onChange={(e) => {
                          handlePreferenceChange('backgroundColor', e.target.value);
                          applyTheme({ ...preferences, backgroundColor: e.target.value });
                        }}
                      />
                      <span className="color-value">{preferences.backgroundColor}</span>
                    </div>
                  </div>

                  <div className="color-input">
                    <label>Text Color</label>
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={preferences.textColor}
                        onChange={(e) => {
                          handlePreferenceChange('textColor', e.target.value);
                          applyTheme({ ...preferences, textColor: e.target.value });
                        }}
                      />
                      <span className="color-value">{preferences.textColor}</span>
                    </div>
                  </div>

                  <div className="color-input">
                    <label>Sidebar Color</label>
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={preferences.sidebarColor}
                        onChange={(e) => {
                          handlePreferenceChange('sidebarColor', e.target.value);
                          applyTheme({ ...preferences, sidebarColor: e.target.value });
                        }}
                      />
                      <span className="color-value">{preferences.sidebarColor}</span>
                    </div>
                  </div>

                  <div className="color-input">
                    <label>Sidebar Text Color</label>
                    <div className="color-picker-wrapper">
                      <input
                        type="color"
                        value={preferences.sidebarTextColor}
                        onChange={(e) => {
                          handlePreferenceChange('sidebarTextColor', e.target.value);
                          applyTheme({ ...preferences, sidebarTextColor: e.target.value });
                        }}
                      />
                      <span className="color-value">{preferences.sidebarTextColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button className="reset-btn" onClick={handleResetTheme}>
                🔄 Reset to Default
              </button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="tab-content">
              <h2>🔔 Notification Preferences</h2>

              <div className="setting-group">
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Enable Notifications</label>
                    <p>Receive notifications about important events</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.notificationsEnabled}
                      onChange={(e) => handlePreferenceChange('notificationsEnabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Sound Notifications</label>
                    <p>Play sound for notifications</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.soundEnabled}
                      onChange={(e) => handlePreferenceChange('soundEnabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Email Notifications</label>
                    <p>Receive email notifications</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security & Alerts Tab */}
          {activeTab === 'security' && (
            <div className="tab-content">
              <h2>🔒 Security & Alerts</h2>

              <div className="setting-group">
                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Two-Factor Authentication</label>
                    <p>Add extra security to your account</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.twoFactorAuth}
                      onChange={(e) => handlePreferenceChange('twoFactorAuth', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Enable Alerts</label>
                    <p>Receive security alerts</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.alertsEnabled}
                      onChange={(e) => handlePreferenceChange('alertsEnabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Security Alerts</label>
                    <p>Get notified about security events</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.securityAlerts}
                      onChange={(e) => handlePreferenceChange('securityAlerts', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Login Alerts</label>
                    <p>Get notified about new login attempts</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.loginAlerts}
                      onChange={(e) => handlePreferenceChange('loginAlerts', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-actions">
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : '💾 Save Changes'}
        </button>
        <button className="cancel-btn" onClick={() => window.history.back()}>
          ← Back
        </button>
      </div>

      {showConfirm && (
        <div className="confirm-dialog">
          <div className="confirm-content">
            <h3>Reset Theme?</h3>
            <p>Are you sure you want to reset to default theme?</p>
            <div className="confirm-actions">
              <button
                className="confirm-yes"
                onClick={() => {
                  confirmAction();
                  handleSave();
                }}
              >
                Yes, Reset
              </button>
              <button
                className="confirm-no"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;
