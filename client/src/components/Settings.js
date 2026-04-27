import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ user, onLogout }) => {
  console.log('Settings component rendered with user:', user);
  const [activeTab, setActiveTab] = useState('profile');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [message, setMessage] = useState('');

  // Theme State
  const [theme, setTheme] = useState('light');
  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [textColor, setTextColor] = useState('#333333');

  // Notifications State
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);

  // Security State - FIXED LOGIC
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    return otp;
  };

  const handleSetup2FA = () => {
    if (twoFactorMethod === 'otp') {
      if (otpCode.length !== 6) {
        setMessage('❌ Please enter a valid 6-digit OTP');
        return;
      }
      if (otpCode === generatedOTP) {
        setTwoFactorEnabled(true);
        setMessage('✅ OTP Two-Factor Authentication enabled!');
        setOtpCode('');
        setGeneratedOTP('');
        setTwoFactorMethod('');
        setShow2FASetup(false);
      } else {
        setMessage('❌ Invalid OTP code');
      }
    } else if (twoFactorMethod === 'password') {
      if (securityPassword.length < 8) {
        setMessage('❌ Password must be at least 8 characters');
        return;
      }
      if (securityPassword !== confirmPassword) {
        setMessage('❌ Passwords do not match');
        return;
      }
      setTwoFactorEnabled(true);
      setMessage('✅ Password Two-Factor Authentication enabled!');
      setSecurityPassword('');
      setConfirmPassword('');
      setTwoFactorMethod('');
      setShow2FASetup(false);
    }
  };

  const handleSave = () => {
    setMessage('✅ Settings saved successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const applyTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', primaryColor);
    root.style.setProperty('--bg-color', backgroundColor);
    root.style.setProperty('--text-color', textColor);
    document.body.style.backgroundColor = backgroundColor;
    document.body.style.color = textColor;
  };

  const applyPresetTheme = (preset) => {
    const themes = {
      light: { primaryColor: '#667eea', backgroundColor: '#ffffff', textColor: '#333333' },
      dark: { primaryColor: '#667eea', backgroundColor: '#1a1a1a', textColor: '#e0e0e0' },
      blue: { primaryColor: '#0066cc', backgroundColor: '#f0f4ff', textColor: '#003d99' },
      green: { primaryColor: '#00a86b', backgroundColor: '#f0fff4', textColor: '#006b42' },
      purple: { primaryColor: '#9333ea', backgroundColor: '#faf5ff', textColor: '#6b21a8' }
    };
    const newTheme = themes[preset];
    setPrimaryColor(newTheme.primaryColor);
    setBackgroundColor(newTheme.backgroundColor);
    setTextColor(newTheme.textColor);
    applyTheme();
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="header-content">
          <h1>⚙️ Settings</h1>
          <p>Manage your account preferences and security</p>
        </div>
        <div className="header-profile">
          <div className="profile-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-details">
            <p className="profile-name">{user?.name || 'User'}</p>
            <p className="profile-email">{user?.email || 'No email'}</p>
            <p className="profile-role">{user?.role ? user.role.toUpperCase() : 'USER'}</p>
          </div>
          <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
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
          🔐 Security
        </button>
      </div>

      {/* Content */}
      <div className="settings-content">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="tab-panel">
            <h2>👤 Profile Information</h2>
            <div className="profile-info-grid">
              <div className="info-item">
                <label>Full Name</label>
                <p>{user?.name || 'Not provided'}</p>
              </div>
              <div className="info-item">
                <label>Email Address</label>
                <p>{user?.email || 'Not provided'}</p>
              </div>
              <div className="info-item">
                <label>User Role</label>
                <p>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ') : 'Not provided'}</p>
              </div>
              <div className="info-item">
                <label>User ID</label>
                <p>{user?.id || 'Not provided'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Theme Tab */}
        {activeTab === 'theme' && (
          <div className="tab-panel">
            <h2>🎨 Theme & Colors</h2>
            
            <div className="setting-section">
              <h3>Preset Themes</h3>
              <div className="preset-buttons">
                <button className="preset-btn light" onClick={() => applyPresetTheme('light')}>☀️ Light</button>
                <button className="preset-btn dark" onClick={() => applyPresetTheme('dark')}>🌙 Dark</button>
                <button className="preset-btn blue" onClick={() => applyPresetTheme('blue')}>🔵 Blue</button>
                <button className="preset-btn green" onClick={() => applyPresetTheme('green')}>🟢 Green</button>
                <button className="preset-btn purple" onClick={() => applyPresetTheme('purple')}>🟣 Purple</button>
              </div>
            </div>

            <div className="setting-section">
              <h3>Custom Colors</h3>
              <div className="color-grid">
                <div className="color-item">
                  <label>Primary Color</label>
                  <div className="color-input-wrapper">
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
                <div className="color-item">
                  <label>Background Color</label>
                  <div className="color-input-wrapper">
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
                <div className="color-item">
                  <label>Text Color</label>
                  <div className="color-input-wrapper">
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
          <div className="tab-panel">
            <h2>🔔 Notification Preferences</h2>
            <div className="toggle-list">
              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Enable Notifications</label>
                  <p>Receive notifications about important events</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
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

              <div className="toggle-item">
                <div className="toggle-info">
                  <label>Sound Notifications</label>
                  <p>Play sound for notifications</p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={soundNotifications}
                    onChange={(e) => setSoundNotifications(e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="tab-panel" style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
            <h2>🔐 Security & Alerts</h2>
            
            <div style={{ marginTop: '20px' }}>
              {/* Two-Factor Authentication Toggle */}
              <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600' }}>Two-Factor Authentication</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Add extra security to your account</p>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={show2FASetup}
                    onChange={() => {
                      if (!show2FASetup) {
                        setShow2FASetup(true);
                        setTwoFactorMethod('');
                      } else {
                        if (window.confirm('Disable 2FA?')) {
                          setShow2FASetup(false);
                          setTwoFactorEnabled(false);
                          setTwoFactorMethod('');
                          setOtpCode('');
                          setGeneratedOTP('');
                          setSecurityPassword('');
                          setConfirmPassword('');
                        }
                      }
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: show2FASetup || twoFactorEnabled ? '#667eea' : '#ccc',
                    transition: '0.4s',
                    borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: '26px',
                      width: '26px',
                      left: '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      transition: '0.4s',
                      borderRadius: '50%',
                      transform: show2FASetup || twoFactorEnabled ? 'translateX(26px)' : 'translateX(0)'
                    }} />
                  </span>
                </label>
              </div>

              {/* 2FA Setup Form - Method Selection */}
              {show2FASetup && !twoFactorMethod && (
                <div style={{ padding: '20px', background: '#f0f4ff', borderRadius: '8px', border: '1px solid #667eea', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Choose 2FA Method</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <button
                      onClick={() => {
                        setTwoFactorMethod('otp');
                        generateOTP();
                      }}
                      style={{
                        padding: '15px',
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f0f4ff'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      📱 OTP Code
                    </button>
                    <button
                      onClick={() => {
                        setTwoFactorMethod('password');
                      }}
                      style={{
                        padding: '15px',
                        background: 'white',
                        border: '2px solid #667eea',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f0f4ff'}
                      onMouseLeave={(e) => e.target.style.background = 'white'}
                    >
                      🔑 Password
                    </button>
                  </div>
                </div>
              )}

              {/* OTP Setup Form */}
              {show2FASetup && twoFactorMethod === 'otp' && (
                <div style={{ padding: '20px', background: '#f0f4ff', borderRadius: '8px', border: '1px solid #667eea', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>📱 Enter OTP Code</h3>
                  
                  <div style={{ padding: '15px', background: 'white', borderRadius: '8px', border: '2px dashed #667eea', marginBottom: '15px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>Your Code:</p>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#667eea', letterSpacing: '3px', fontFamily: 'monospace' }}>
                      {generatedOTP}
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Enter the code:</p>
                  <input
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                    maxLength="6"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '18px',
                      letterSpacing: '6px',
                      textAlign: 'center',
                      border: '2px solid #667eea',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      boxSizing: 'border-box'
                    }}
                  />

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleSetup2FA}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ✅ Verify
                    </button>
                    <button
                      onClick={() => {
                        setTwoFactorMethod('');
                        setOtpCode('');
                        setGeneratedOTP('');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#f0f0f0',
                        color: '#666',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {/* Password Setup Form */}
              {show2FASetup && twoFactorMethod === 'password' && (
                <div style={{ padding: '20px', background: '#f0f4ff', borderRadius: '8px', border: '1px solid #667eea', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>🔑 Create Password</h3>

                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Create a password (min 8 characters):</p>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={securityPassword}
                    onChange={(e) => setSecurityPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      border: '2px solid #667eea',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      boxSizing: 'border-box'
                    }}
                  />

                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Confirm password:</p>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      border: '2px solid #667eea',
                      borderRadius: '6px',
                      marginBottom: '15px',
                      boxSizing: 'border-box'
                    }}
                  />

                  {confirmPassword && securityPassword === confirmPassword && (
                    <p style={{ fontSize: '12px', color: '#10b981', marginBottom: '15px' }}>✅ Passwords match</p>
                  )}
                  {confirmPassword && securityPassword !== confirmPassword && (
                    <p style={{ fontSize: '12px', color: '#ef4444', marginBottom: '15px' }}>❌ Passwords do not match</p>
                  )}

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleSetup2FA}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ✅ Verify
                    </button>
                    <button
                      onClick={() => {
                        setTwoFactorMethod('');
                        setSecurityPassword('');
                        setConfirmPassword('');
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: '#f0f0f0',
                        color: '#666',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ← Back
                    </button>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {message && (
                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  background: message.includes('✅') ? '#d4edda' : '#f8d7da',
                  color: message.includes('✅') ? '#155724' : '#721c24',
                  borderRadius: '6px',
                  border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                  {message}
                </div>
              )}

              {/* Other Security Options */}
              <div style={{ marginTop: '30px' }}>
                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600' }}>Enable Alerts</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Receive security alerts</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#667eea',
                      transition: '0.4s',
                      borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '26px',
                        width: '26px',
                        left: '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '0.4s',
                        borderRadius: '50%',
                        transform: 'translateX(26px)'
                      }} />
                    </span>
                  </label>
                </div>

                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600' }}>Security Alerts</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Get notified about security events</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#667eea',
                      transition: '0.4s',
                      borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '26px',
                        width: '26px',
                        left: '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '0.4s',
                        borderRadius: '50%',
                        transform: 'translateX(26px)'
                      }} />
                    </span>
                  </label>
                </div>

                <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: '600' }}>Login Alerts</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Get notified about new login attempts</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#667eea',
                      transition: '0.4s',
                      borderRadius: '34px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '26px',
                        width: '26px',
                        left: '4px',
                        bottom: '4px',
                        backgroundColor: 'white',
                        transition: '0.4s',
                        borderRadius: '50%',
                        transform: 'translateX(26px)'
                      }} />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="settings-footer">
        <button className="save-btn" onClick={handleSave}>💾 Save Changes</button>
      </div>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>🚪 Logout?</h3>
            <p>Are you sure you want to logout?</p>
            <div className="confirm-actions">
              <button className="btn-primary" onClick={handleLogout}>Yes, Logout</button>
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default Settings;
