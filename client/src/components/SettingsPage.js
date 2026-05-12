import React, { useState, useEffect } from 'react';
import './SettingsPage.css';
import axios from 'axios';

const SettingsPage = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('theme');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Theme State
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [accentColor, setAccentColor] = useState('#764ba2');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#333333');

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  // Security State
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('otp');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [user?.id]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fetch preferences
      try {
        const prefsRes = await axios.get(`http://${window.location.hostname}:5000/api/user-settings/${user.id}`);
        if (prefsRes.data) {
          setTheme(prefsRes.data.theme || 'light');
          setPrimaryColor(prefsRes.data.primaryColor || '#667eea');
          setAccentColor(prefsRes.data.accentColor || '#764ba2');
          setBackgroundColor(prefsRes.data.backgroundColor || '#ffffff');
          setTextColor(prefsRes.data.textColor || '#333333');
          setNotificationsEnabled(prefsRes.data.notificationsEnabled !== false);
          setSoundEnabled(prefsRes.data.soundEnabled !== false);
          setEmailNotifications(prefsRes.data.emailNotifications !== false);
          setAlertsEnabled(prefsRes.data.alertsEnabled !== false);
          setSecurityAlerts(prefsRes.data.securityAlerts !== false);
          setLoginAlerts(prefsRes.data.loginAlerts !== false);
        }
      } catch (err) {
        console.log('Using default preferences');
      }

      // Fetch 2FA settings
      try {
        const twoFARes = await axios.get(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/two-factor`);
        if (twoFARes.data) {
          setTwoFactorEnabled(twoFARes.data.twoFactorEnabled || false);
          setTwoFactorMethod(twoFARes.data.twoFactorMethod || 'otp');
        }
      } catch (err) {
        console.log('Using default 2FA settings');
      }

      setMessage('');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (!user?.id) {
        setMessage('❌ Error: User ID not found');
        setSaving(false);
        return;
      }

      // Save preferences
      await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}`, {
        theme,
        primaryColor,
        accentColor,
        backgroundColor,
        textColor,
        notificationsEnabled,
        soundEnabled,
        emailNotifications,
        alertsEnabled,
        securityAlerts,
        loginAlerts
      });

      // Save 2FA settings
      await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/two-factor`, {
        twoFactorEnabled,
        twoFactorMethod
      });

      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    return otp;
  };

  const handleSetup2FA = async () => {
    try {
      setVerifying2FA(true);

      if (twoFactorMethod === 'otp') {
        if (otpCode.length !== 6 || isNaN(otpCode)) {
          setMessage('❌ Please enter a valid 6-digit OTP');
          setVerifying2FA(false);
          return;
        }

        const response = await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/verify-otp`, {
          otpCode,
          generatedOTP
        });

        if (response.data.valid) {
          setTwoFactorEnabled(true);
          setTwoFactorMethod('otp');
          setMessage('✅ OTP Two-Factor Authentication enabled!');
          setShow2FASetup(false);
          setOtpCode('');
          setGeneratedOTP('');
        } else {
          setMessage('❌ Invalid OTP. Please try again.');
        }
      } else if (twoFactorMethod === 'password') {
        if (securityPassword !== confirmPassword) {
          setMessage('❌ Passwords do not match');
          setVerifying2FA(false);
          return;
        }

        if (securityPassword.length < 8) {
          setMessage('❌ Password must be at least 8 characters');
          setVerifying2FA(false);
          return;
        }

        await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/setup-password-2fa`, {
          securityPassword
        });

        setTwoFactorEnabled(true);
        setTwoFactorMethod('password');
        setMessage('✅ Password Two-Factor Authentication enabled!');
        setShow2FASetup(false);
        setSecurityPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      setMessage('❌ Error setting up 2FA');
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setSaving(true);
      await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/disable-2fa`, {});
      setTwoFactorEnabled(false);
      setMessage('✅ Two-Factor Authentication disabled');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setMessage('❌ Error disabling 2FA');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--accent-color', accentColor);
    root.style.setProperty('--bg-color', backgroundColor);
    root.style.setProperty('--text-color', textColor);
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.color = textColor;
  };

  const applyPresetTheme = (preset) => {
    const themes = {
      light: {
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#ffffff',
        textColor: '#333333'
      },
      dark: {
        primaryColor: '#667eea',
        accentColor: '#764ba2',
        backgroundColor: '#1a1a1a',
        textColor: '#e0e0e0'
      },
      blue: {
        primaryColor: '#0066cc',
        accentColor: '#0052a3',
        backgroundColor: '#f0f4ff',
        textColor: '#003d99'
      },
      green: {
        primaryColor: '#00a86b',
        accentColor: '#008c56',
        backgroundColor: '#f0fff4',
        textColor: '#006b42'
      },
      purple: {
        primaryColor: '#9333ea',
        accentColor: '#7e22ce',
        backgroundColor: '#faf5ff',
        textColor: '#6b21a8'
      }
    };

    const newTheme = themes[preset];
    setPrimaryColor(newTheme.primaryColor);
    setAccentColor(newTheme.accentColor);
    setBackgroundColor(newTheme.backgroundColor);
    setTextColor(newTheme.textColor);
    applyTheme();
  };

  if (loading) {
    return (
      <div className="settings-page loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {/* Header with Profile */}
      <div className="settings-header">
        <div className="header-left">
          <h1>⚙️ Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
        <div className="header-right">
          <div className="profile-section">
            <div className="profile-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-info">
              <p className="profile-name">{user?.name || 'User'}</p>
              <p className="profile-email">{user?.email || 'No email'}</p>
              <p className="profile-role">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ') : 'User'}
              </p>
            </div>
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            🚪 Logout
          </button>
        </div>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'theme' ? 'active' : ''}`}
          onClick={() => setActiveTab('theme')}
        >
          🎨 Theme
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
          🔒 Security
        </button>
        <button
          className={`tab-btn ${activeTab === 'two-factor' ? 'active' : ''}`}
          onClick={() => setActiveTab('two-factor')}
        >
          🔐 Two-Factor Auth
        </button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="tab-content">
            <h2>🎨 Theme & Colors</h2>

            <div className="setting-group">
              <label>Preset Themes</label>
              <div className="preset-buttons">
                <button className="preset-btn light" onClick={() => applyPresetTheme('light')}>
                  ☀️ Light
                </button>
                <button className="preset-btn dark" onClick={() => applyPresetTheme('dark')}>
                  🌙 Dark
                </button>
                <button className="preset-btn blue" onClick={() => applyPresetTheme('blue')}>
                  🔵 Blue
                </button>
                <button className="preset-btn green" onClick={() => applyPresetTheme('green')}>
                  🟢 Green
                </button>
                <button className="preset-btn purple" onClick={() => applyPresetTheme('purple')}>
                  🟣 Purple
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>Custom Colors</label>
              <div className="color-grid">
                <div className="color-input">
                  <label>Primary Color</label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        applyTheme();
                      }}
                    />
                    <span>{primaryColor}</span>
                  </div>
                </div>

                <div className="color-input">
                  <label>Accent Color</label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        applyTheme();
                      }}
                    />
                    <span>{accentColor}</span>
                  </div>
                </div>

                <div className="color-input">
                  <label>Background Color</label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        applyTheme();
                      }}
                    />
                    <span>{backgroundColor}</span>
                  </div>
                </div>

                <div className="color-input">
                  <label>Text Color</label>
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => {
                        setTextColor(e.target.value);
                        applyTheme();
                      }}
                    />
                    <span>{textColor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="tab-content">
            <h2>🔔 Notifications</h2>

            <div className="toggle-group">
              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Enable Notifications</label>
                  <p>Receive notifications about important events</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Sound Notifications</label>
                  <p>Play sound for notifications</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Email Notifications</label>
                  <p>Receive email notifications</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="tab-content">
            <h2>🔒 Security & Alerts</h2>

            <div className="toggle-group">
              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Enable Alerts</label>
                  <p>Receive security alerts</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={alertsEnabled}
                    onChange={(e) => setAlertsEnabled(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Security Alerts</label>
                  <p>Get notified about security events</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={securityAlerts}
                    onChange={(e) => setSecurityAlerts(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Login Alerts</label>
                  <p>Get notified about new login attempts</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={loginAlerts}
                    onChange={(e) => setLoginAlerts(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 2FA Tab */}
        {activeTab === 'two-factor' && (
          <div className="tab-content">
            <h2>🔐 Two-Factor Authentication</h2>

            {!twoFactorEnabled ? (
              <div className="two-fa-setup">
                <div className="setup-info">
                  <p>🔒 Add an extra layer of security to your account</p>
                  <p>Choose your preferred 2FA method:</p>
                </div>

                <div className="method-cards">
                  <div className="method-card">
                    <h3>📱 OTP (One-Time Password)</h3>
                    <p>6-digit codes from authenticator app</p>
                    <ul>
                      <li>Works with Google Authenticator</li>
                      <li>Most secure option</li>
                      <li>Codes expire after 30 seconds</li>
                    </ul>
                    <button
                      className="method-btn"
                      onClick={() => {
                        setTwoFactorMethod('otp');
                        setGeneratedOTP(generateOTP());
                        setShow2FASetup(true);
                      }}
                    >
                      Setup OTP
                    </button>
                  </div>

                  <div className="method-card">
                    <h3>🔑 Security Password</h3>
                    <p>Custom password for verification</p>
                    <ul>
                      <li>Minimum 8 characters</li>
                      <li>Easy to remember</li>
                      <li>Account locks after 5 failed attempts</li>
                    </ul>
                    <button
                      className="method-btn"
                      onClick={() => {
                        setTwoFactorMethod('password');
                        setShow2FASetup(true);
                      }}
                    >
                      Setup Password
                    </button>
                  </div>
                </div>

                {show2FASetup && (
                  <div className="setup-form">
                    {twoFactorMethod === 'otp' && (
                      <div className="form-group">
                        <h4>📱 OTP Setup</h4>
                        <p className="info-text">
                          Generated OTP: <strong style={{ fontSize: '18px', letterSpacing: '2px' }}>{generatedOTP}</strong>
                        </p>
                        <p className="info-text">
                          Enter this code in your authenticator app, then enter it below to verify:
                        </p>
                        <input
                          type="text"
                          placeholder="Enter 6-digit OTP"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                          maxLength="6"
                          className="otp-input"
                        />
                      </div>
                    )}

                    {twoFactorMethod === 'password' && (
                      <div className="form-group">
                        <h4>🔑 Security Password Setup</h4>
                        <input
                          type="password"
                          placeholder="Enter security password (min 8 characters)"
                          value={securityPassword}
                          onChange={(e) => setSecurityPassword(e.target.value)}
                          className="password-input"
                        />
                        <input
                          type="password"
                          placeholder="Confirm security password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="password-input"
                        />
                        <p className="password-requirements">
                          ✓ Minimum 8 characters<br/>
                          ✓ Mix of letters and numbers recommended<br/>
                          ✓ Account locks after 5 failed attempts
                        </p>
                      </div>
                    )}

                    <div className="setup-actions">
                      <button
                        className="verify-btn"
                        onClick={handleSetup2FA}
                        disabled={verifying2FA}
                      >
                        {verifying2FA ? '⏳ Verifying...' : '✅ Verify & Enable'}
                      </button>
                      <button
                        className="cancel-btn"
                        onClick={() => {
                          setShow2FASetup(false);
                          setOtpCode('');
                          setSecurityPassword('');
                          setConfirmPassword('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="two-fa-enabled">
                <div className="status-card success">
                  <h3>✅ Two-Factor Authentication Enabled</h3>
                  <p>Method: <strong>{twoFactorMethod === 'otp' ? '📱 OTP (One-Time Password)' : '🔑 Security Password'}</strong></p>
                  <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>
                    Your account is protected with two-factor authentication. You'll need to verify your identity when logging in.
                  </p>
                </div>

                <button
                  className="disable-btn"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to disable 2FA?')) {
                      handleDisable2FA();
                    }
                  }}
                >
                  🔓 Disable Two-Factor Authentication
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="settings-footer">
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : '💾 Save Changes'}
        </button>
      </div>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>🚪 Logout?</h3>
            <p>Are you sure you want to logout from your account?</p>
            <div className="confirm-actions">
              <button
                className="confirm-yes"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
              >
                Yes, Logout
              </button>
              <button
                className="confirm-no"
                onClick={() => setShowLogoutConfirm(false)}
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

export default SettingsPage;
