import React, { useState, useEffect, useRef } from 'react';
import './UserSettingsEnhanced.css';
import axios from 'axios';
// import PageHeader from './PageHeader';

const UserSettingsEnhanced = ({ user, onLogout, onRefreshUser }) => {
  const [preferences, setPreferences] = useState(null);
  const [twoFactorSettings, setTwoFactorSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('theme');
  // eslint-disable-next-line no-unused-vars
  const [message, setMessage] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [show2FASetup, setShow2FASetup] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail] = useState(user?.email || '');
  
  // Activity & Sessions States
  const [activityLogs, setActivityLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  // 2FA States
  const [otpCode, setOtpCode] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState('otp');
  const [generatedOTP, setGeneratedOTP] = useState('');

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChangeMessage, setPasswordChangeMessage] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (activeTab === 'activity') fetchActivityLogs();
    if (activeTab === 'sessions') fetchActiveSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.error('User ID not available');
        setMessage('Error: User ID not found');
        setLoading(false);
        return;
      }
      
      console.log('Fetching settings for user:', user.id);
      
      // Fetch user preferences
      const prefsResponse = await axios.get(`http://${window.location.hostname}:5000/api/user-settings/${user.id}`);
      console.log('Settings loaded:', prefsResponse.data);
      setPreferences(prefsResponse.data);
      
      // Fetch 2FA settings
      try {
        const twoFAResponse = await axios.get(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/two-factor`);
        console.log('2FA Settings loaded:', twoFAResponse.data);
        setTwoFactorSettings(twoFAResponse.data);
      } catch (err) {
        console.log('2FA settings not found, using defaults');
        setTwoFactorSettings({
          userId: user.id,
          twoFactorEnabled: false,
          twoFactorMethod: 'otp',
          captchaEnabled: true,
          captchaDifficulty: 'medium'
        });
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error fetching settings:', error);
      
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
        alertsEnabled: true,
        securityAlerts: true,
        loginAlerts: true,
        wrongPasswordAlerts: true,
        unauthorizedAccessAlerts: true,
        suspiciousActivityAlerts: true,
        soundNotifications: true,
        pendingRequestNotifications: true,
        language: 'en',
        timezone: 'UTC'
      });
      
      setTwoFactorSettings({
        userId: user?.id,
        twoFactorEnabled: false,
        twoFactorMethod: 'otp',
        captchaEnabled: true,
        captchaDifficulty: 'medium'
      });
      
      setMessage('⚠️ Using default settings. Click Save to create your settings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await axios.get(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/activity-logs`);
      setActivityLogs(response.data);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await axios.get(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/sessions`);
      setActiveSessions(response.data);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      await axios.delete(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/sessions/${sessionId}`);
      fetchActiveSessions();
      setMessage('✅ Session terminated successfully');
    } catch (error) {
      setMessage('❌ Error terminating session');
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    try {
      await axios.delete(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/sessions`);
      fetchActiveSessions();
      setMessage('✅ All other sessions terminated');
    } catch (error) {
      setMessage('❌ Error terminating sessions');
    }
  };

  const handleGlobalCloseSessions = async () => {
    try {
      await axios.post(`http://${window.location.hostname}:5000/api/system/sessions/close-all`, {}, { headers: { 'x-user-role': user.role } });
      setMessage('✅ ALL platform sessions closed recursively');
    } catch (error) {
      setMessage('❌ Error closing all sessions');
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleTwoFactorChange = (key, value) => {
    setTwoFactorSettings(prev => ({
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
      
      // Save preferences
      await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}`, preferences);
      
      // Save 2FA settings
      if (twoFactorSettings) {
        await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/two-factor`, twoFactorSettings);
      }
      
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // Save to localStorage
      localStorage.setItem(`userSettings_${user.id}`, JSON.stringify(preferences));
      
      // Apply theme changes
      applyTheme(preferences);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('❌ Error saving settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage('❌ Please select a valid image file (JPG, PNG, WEBP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const response = await axios.post(`http://${window.location.hostname}:5000/api/users/upload-photo/${user.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.photoUrl) {
        setMessage('✅ Profile picture updated successfully!');
        if (onRefreshUser) {
          await onRefreshUser();
        } else {
          // Fallback if onRefreshUser is not provided
          const updatedUser = { ...user, profile_image: response.data.photoUrl };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setMessage('❌ Failed to upload photo: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingPhoto(false);
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
    
    document.body.style.backgroundColor = theme.backgroundColor;
    document.body.style.color = theme.textColor;
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

  const handleEnable2FA = () => {
    setShow2FASetup(true);
    if (twoFactorMethod === 'otp') {
      generateOTP();
    }
  };

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    return otp;
  };

  // eslint-disable-next-line no-unused-vars
  const handleSetup2FA = async () => {
    try {
      setVerifying2FA(true);
      
      if (twoFactorMethod === 'otp') {
        if (otpCode.length !== 6 || isNaN(otpCode)) {
          setMessage('❌ Please enter a valid 6-digit OTP');
          setVerifying2FA(false);
          return;
        }
        
        // Verify OTP
        const response = await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/verify-otp`, {
          otpCode: otpCode,
          generatedOTP: generatedOTP
        });
        
        if (response.data.valid) {
          handleTwoFactorChange('twoFactorEnabled', true);
          handleTwoFactorChange('twoFactorMethod', 'otp');
          setMessage('✅ OTP Two-Factor Authentication enabled!');
          setShow2FASetup(false);
          setOtpCode('');
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
        
        // Save password-based 2FA
        await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/setup-password-2fa`, {
          securityPassword: securityPassword
        });
        
        handleTwoFactorChange('twoFactorEnabled', true);
        handleTwoFactorChange('twoFactorMethod', 'password');
        setMessage('✅ Password Two-Factor Authentication enabled!');
        setShow2FASetup(false);
        setSecurityPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      setMessage('❌ Error setting up 2FA: ' + (error.response?.data?.message || error.message));
    } finally {
      setVerifying2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setSaving(true);
      
      await axios.post(`http://${window.location.hostname}:5000/api/user-settings/${user.id}/disable-2fa`, {});
      
      handleTwoFactorChange('twoFactorEnabled', false);
      setMessage('✅ Two-Factor Authentication disabled');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setMessage('❌ Error disabling 2FA: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeMessage('');

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordChangeError('Password must be at least 8 characters long');
      return;
    }

    try {
      setSaving(true);
      await axios.post(`http://${window.location.hostname}:5000/api/auth/change-password`, {
        userId: user.id,
        currentPassword,
        newPassword
      });
      setPasswordChangeMessage('✅ Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      setPasswordChangeError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="user-settings-enhanced loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your preferences...</p>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="user-settings-enhanced error">
        <div className="error-message">
          <h2>⚠️ Error Loading Preferences</h2>
          <p>Unable to load your settings. Please try refreshing the page.</p>
          <button onClick={() => window.location.reload()}>🔄 Refresh Page</button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-settings-enhanced">
      {/* Compact Settings Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Settings</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Customize your experience</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px', borderRadius: '20px', border: 'none',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#fff', fontWeight: 600, fontSize: '13px',
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
          }}
        >
          {saving ? '⏳ Saving...' : '💾 Save'}
        </button>
      </div>
      
      <div className="settings-wrapper-image">
        <div className="settings-tabs-container-image">
          <div className="settings-tabs-horizontal-image">
            <button className={`tab-btn-image ${activeTab === 'theme' ? 'active' : ''}`} onClick={() => setActiveTab('theme')}>⚙️ Theme</button>
            <button className={`tab-btn-image ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>🔔 Notifications</button>
            <button className={`tab-btn-image ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>🛡️ Security</button>
            <button className={`tab-btn-image ${activeTab === 'two-factor' ? 'active' : ''}`} onClick={() => setActiveTab('two-factor')}>🔑 2FA</button>
            <button className={`tab-btn-image ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Profile</button>
            <button className={`tab-btn-image ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>📈 Activity</button>
            <button className={`tab-btn-image ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>📱 Sessions</button>
            <button className={`tab-btn-image ${activeTab === 'idle-timeout' ? 'active' : ''}`} onClick={() => setActiveTab('idle-timeout')}>⏱️ Idle Timeout</button>
            {(user.role === 'system_admin' || user.role === 'property_admin') && (
              <button className={`tab-btn-image ${activeTab === 'system' ? 'active' : ''}`} onClick={() => setActiveTab('system')}>
                🖥️ System <span className="expand-icon">⤤</span>
              </button>
            )}
          </div>
          
          {/* Scrollbar element as seen in the image */}
          <div className="settings-custom-scrollbar">
            <span className="scroll-arrow left">◀</span>
            <div className="scroll-track">
              <div className="scroll-thumb"></div>
            </div>
            <span className="scroll-arrow right">▶</span>
          </div>
        </div>
        
        <div className="settings-content-box-image">
          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="tab-content-image">
              <div className="theme-settings-image-header">
                <h2>🎨 Theme Settings (dark mode, colors, layout)</h2>
              </div>
              
              <div className="settings-grid-horizontal" style={{marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px'}}>
                <div className="setting-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Preset Themes</label>
                  <div className="preset-buttons" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button className={`preset-btn ${preferences.theme === 'light' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: preferences.theme === 'light' ? '#e0f7fa' : '#fff', cursor: 'pointer' }} onClick={() => applyPresetTheme('light')}>☀️ Light</button>
                    <button className={`preset-btn ${preferences.theme === 'dark' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: preferences.theme === 'dark' ? '#eceff1' : '#fff', cursor: 'pointer' }} onClick={() => applyPresetTheme('dark')}>🌙 Dark</button>
                    <button className={`preset-btn ${preferences.theme === 'blue' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: preferences.theme === 'blue' ? '#e8eaf6' : '#fff', cursor: 'pointer' }} onClick={() => applyPresetTheme('blue')}>🔵 Blue</button>
                    <button className={`preset-btn ${preferences.theme === 'green' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: preferences.theme === 'green' ? '#e8f5e9' : '#fff', cursor: 'pointer' }} onClick={() => applyPresetTheme('green')}>🟢 Green</button>
                    <button className={`preset-btn ${preferences.theme === 'purple' ? 'active' : ''}`} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', background: preferences.theme === 'purple' ? '#f3e5f5' : '#fff', cursor: 'pointer' }} onClick={() => applyPresetTheme('purple')}>🟣 Purple</button>
                  </div>
                </div>

                <div className="setting-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Custom Colors</label>
                  <div className="color-grid" style={{ display: 'flex', gap: '20px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <div className="color-input">
                      <label style={{ display: 'block', fontSize: '12px' }}>Primary Color</label>
                      <div className="color-picker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <input type="color" value={preferences.primaryColor || '#667eea'} onChange={(e) => handlePreferenceChange('primaryColor', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                        <span>{preferences.primaryColor || '#667eea'}</span>
                      </div>
                    </div>
                    <div className="color-input">
                      <label style={{ display: 'block', fontSize: '12px' }}>Accent Color</label>
                      <div className="color-picker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <input type="color" value={preferences.accentColor || '#764ba2'} onChange={(e) => handlePreferenceChange('accentColor', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                        <span>{preferences.accentColor || '#764ba2'}</span>
                      </div>
                    </div>
                    <div className="color-input">
                      <label style={{ display: 'block', fontSize: '12px' }}>Background Color</label>
                      <div className="color-picker-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px' }}>
                        <input type="color" value={preferences.backgroundColor || '#ffffff'} onChange={(e) => handlePreferenceChange('backgroundColor', e.target.value)} style={{ width: '40px', height: '40px', border: 'none', cursor: 'pointer' }} />
                        <span>{preferences.backgroundColor || '#ffffff'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '10px' }}>
                  <button className="reset-btn" onClick={handleResetTheme} style={{ padding: '8px 16px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer' }}>
                    🔄 Reset to Default
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="tab-content">
              <h2>🔔 Notification Preferences</h2>

              <div className="settings-grid-horizontal">
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

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Sound Alerts</label>
                    <p>Play sound for security events</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.soundNotifications}
                      onChange={(e) => handlePreferenceChange('soundNotifications', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Request Alerts</label>
                    <p>Notifications for new property requests</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.pendingRequestNotifications}
                      onChange={(e) => handlePreferenceChange('pendingRequestNotifications', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="setting-group" style={{ marginTop: '30px' }}>
                <label>System Language</label>
                <div className="language-selector-grid">
                  <button 
                    className={`lang-btn ${preferences.language === 'en' ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('language', 'en')}
                  >
                    🇺🇸 English
                  </button>
                  <button 
                    className={`lang-btn ${preferences.language === 'am' ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('language', 'am')}
                  >
                    🇪🇹 Amharic (አማርኛ)
                  </button>
                  <button 
                    className={`lang-btn ${preferences.language === 'or' ? 'active' : ''}`}
                    onClick={() => handlePreferenceChange('language', 'or')}
                  >
                    🇪🇹 Oromiffa (Afaan Oromoo)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security & Alerts Tab */}
          {activeTab === 'security' && (
            <div className="tab-content">
              <h2>🔒 Security & Alerts</h2>

              <div className="settings-grid-horizontal">
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

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Wrong Password Alerts</label>
                    <p>Alert for failed login with wrong password</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.wrongPasswordAlerts}
                      onChange={(e) => handlePreferenceChange('wrongPasswordAlerts', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="toggle-setting">
                  <div className="toggle-info">
                    <label>Unauthorized Access</label>
                    <p>High priority unauthorized access alert</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.unauthorizedAccessAlerts}
                      onChange={(e) => handlePreferenceChange('unauthorizedAccessAlerts', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="change-password-section" style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#1e293b' }}>Change Password</h3>
                {passwordChangeMessage && <div style={{ padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{passwordChangeMessage}</div>}
                {passwordChangeError && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{passwordChangeError}</div>}
                
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Current Password</label>
                    <div className="password-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        type={showCurrentPassword ? "text" : "password"} 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                        required 
                        style={{ padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>New Password</label>
                    <div className="password-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        required 
                        minLength={8} 
                        style={{ padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        {showNewPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 'bold' }}>Confirm New Password</label>
                    <div className="password-input-wrapper" style={{ position: 'relative' }}>
                      <input 
                        type={showConfirmNewPassword ? "text" : "password"} 
                        value={confirmNewPassword} 
                        onChange={(e) => setConfirmNewPassword(e.target.value)} 
                        required 
                        minLength={8} 
                        style={{ padding: '10px', paddingRight: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }} 
                      />
                      <button 
                        type="button" 
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      >
                        {showConfirmNewPassword ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={saving} style={{ padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
                    Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Two-Factor Authentication Tab */}
          {activeTab === 'two-factor' && (
            <div className="tab-content">
              <h2>🔐 Two-Factor Authentication</h2>
              <div className="security-setup-card">
                {!twoFactorSettings?.isTwoFactorEnabled ? (
                  <div className="setup-info">
                    <div className="setup-icon">🛡️</div>
                    <h3>Enhance Your Account Security</h3>
                    <p>Add an extra layer of protection to your account with Two-Factor Authentication (2FA). Even if someone gets your password, they won't be able to access your account.</p>
                    
                    <div className="two-factor-options">
                      <div 
                        className={`option-card ${twoFactorMethod === 'otp' ? 'active' : ''}`}
                        onClick={() => setTwoFactorMethod('otp')}
                      >
                        <div className="option-icon">📱</div>
                        <div className="option-details">
                          <strong>OTP (One-Time Password)</strong>
                          <p>Receive a code via email or app</p>
                        </div>
                      </div>
                      
                      <div 
                        className={`option-card ${twoFactorMethod === 'password' ? 'active' : ''}`}
                        onClick={() => setTwoFactorMethod('password')}
                      >
                        <div className="option-icon">🔑</div>
                        <div className="option-details">
                          <strong>Security Password</strong>
                          <p>A secondary static password</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      className="enable-btn"
                      onClick={handleEnable2FA}
                    >
                      🚀 Get Started with 2FA
                    </button>

                    <div className="captcha-setting" style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={twoFactorSettings?.captchaEnabled}
                          onChange={(e) => handleTwoFactorChange('captchaEnabled', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                      <div className="toggle-info">
                        <label>Enable CAPTCHA Verification</label>
                        <p>Verify you're human with CAPTCHA challenges (text or math)</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="two-factor-enabled">
                    <div className="status-card success">
                      <h3>✅ Two-Factor Authentication Enabled</h3>
                      <p>Method: <strong>{twoFactorSettings?.twoFactorMethod === 'otp' ? '📱 OTP (One-Time Password)' : twoFactorSettings?.twoFactorMethod === 'password' ? '🔑 Security Password' : 'Unknown'}</strong></p>
                      <p>CAPTCHA: <strong>{twoFactorSettings?.captchaEnabled ? '✅ Enabled' : '❌ Disabled'}</strong></p>
                      <p style={{ fontSize: '13px', color: '#666', marginTop: '10px' }}>Your account is protected with two-factor authentication. You'll need to verify your identity when logging in.</p>
                    </div>

                    <div className="captcha-setting" style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={twoFactorSettings?.captchaEnabled}
                          onChange={(e) => handleTwoFactorChange('captchaEnabled', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                      <div className="toggle-info">
                        <label>Enable CAPTCHA Verification</label>
                        <p>Verify you're human with CAPTCHA challenges</p>
                      </div>
                    </div>

                    <button
                      className="disable-btn"
                      onClick={() => {
                        setConfirmAction(() => () => {
                          handleDisable2FA();
                          setShowConfirm(false);
                        });
                        setShowConfirm(true);
                      }}
                    >
                      🔓 Disable Two-Factor Authentication
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Management Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content">
              <h2>👤 Profile Management</h2>
              <div className="profile-edit-grid">
                <div className="profile-image-section">
                  <div className="large-avatar" style={{ 
                    width: '120px', 
                    height: '120px', 
                    borderRadius: '50%', 
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    color: 'white',
                    marginBottom: '15px',
                    border: '4px solid white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}>
                    {user?.profile_image && !imageError ? (
                      <img 
                        src={`http://${window.location.hostname}:5000${user.profile_image}`} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      user?.name ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                  />
                  <button 
                    className="btn-secondary" 
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploadingPhoto}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {uploadingPhoto ? '⏳ Uploading...' : '📷 Change Picture'}
                  </button>
                </div>
                 <div className="profile-details-section">
                   <div className="input-group">
                     <label>Full Name</label>
                     <input 
                       type="text" 
                       value={profileName} 
                       onChange={(e) => {
                         const val = e.target.value;
                         // Strictly allow only letters and spaces as per user request
                         if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                           setProfileName(val);
                         }
                       }}
                       placeholder="Enter your full name (letters only)"
                     />
                     <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                       * Only letters and spaces allowed. No numbers or special characters.
                     </p>
                   </div>
                   <div className="input-group">
                     <label>Email Address</label>
                     <input type="email" value={profileEmail} readOnly disabled style={{ background: '#f8fafc' }} />
                   </div>
                   <div className="input-group">
                     <label>Role</label>
                     <input type="text" value={user?.role?.replace('_', ' ').toUpperCase()} readOnly disabled style={{ background: '#f8fafc' }} />
                   </div>
                   <button 
                     className="btn-primary" 
                     onClick={async () => {
                       if (!profileName.trim()) {
                         setMessage('❌ Name cannot be empty');
                         return;
                       }
                       try {
                         setSaving(true);
                         await axios.put(`http://${window.location.hostname}:5000/api/users/${user.id}`, {
                           name: profileName
                         });
                         setMessage('✅ Profile updated successfully!');
                         if (onRefreshUser) await onRefreshUser();
                       } catch (error) {
                         setMessage('❌ Failed to update profile');
                       } finally {
                         setSaving(false);
                       }
                     }}
                     disabled={saving}
                   >
                     {saving ? '⏳ Saving...' : 'Save Profile Changes'}
                   </button>
                 </div>
              </div>
            </div>
          )}

          {/* Activity Logs Tab */}
          {activeTab === 'activity' && (
            <div className="tab-content">
              <h2>📋 Account Activity Logs</h2>
              <div className="activity-logs-container">
                {logsLoading ? (
                  <p>Loading logs...</p>
                ) : activityLogs.length === 0 ? (
                  <p>No recent activity found.</p>
                ) : (
                  <table className="settings-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Device</th>
                        <th>IP Address</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.map((log, idx) => (
                        <tr key={idx}>
                          <td><strong>{log.action}</strong></td>
                          <td className="text-muted">{log.user_agent?.substring(0, 30)}...</td>
                          <td><code>{log.ip_address}</code></td>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Active Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="tab-content">
              <div className="sessions-header">
                <h2>📱 Active Sessions</h2>
                <button className="btn-danger-outline" onClick={handleTerminateAllOtherSessions}>
                  Terminate All Other Sessions
                </button>
              </div>
              <p className="help-text">These are the locations currently signed into your account.</p>
              
              <div className="sessions-list">
                {sessionsLoading ? (
                  <p>Loading sessions...</p>
                ) : activeSessions.length === 0 ? (
                  <p>No active sessions found.</p>
                ) : (
                  activeSessions.map((session) => (
                    <div key={session.id} className="session-card">
                      <div className="session-icon">📱</div>
                      <div className="session-details">
                        <div className="session-main">
                          <strong>{session.device_type || 'Unknown Device'}</strong>
                          {session.session_id === 'current' && <span className="current-badge">This Session</span>}
                        </div>
                        <p>{session.location || 'Unknown Location'} • <code>{session.ip_address}</code></p>
                        <p className="last-active">Last active: {new Date(session.last_active).toLocaleString()}</p>
                      </div>
                      <button 
                        className="terminate-btn" 
                        onClick={() => handleTerminateSession(session.id)}
                        disabled={session.session_id === 'current'}
                      >
                        Sign Out
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Idle Timeout Tab */}
          {activeTab === 'idle-timeout' && (
            <div className="tab-content">
              <h2>⏱️ Session Idle Timeout</h2>
              {['system_admin', 'property_admin'].includes(user?.role) ? (
                <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
                  <h3 style={{ color: '#059669', margin: '0 0 8px' }}>You Are Exempt</h3>
                  <p style={{ color: '#64748b', margin: 0 }}>As a <strong>{user.role === 'system_admin' ? 'System Admin' : 'Property Admin'}</strong>, your session will never auto-expire due to inactivity.</p>
                </div>
              ) : (
                <>
                  <p className="help-text">Choose how long your session stays active when you're not interacting with the system. After the idle period, you'll be prompted to stay logged in or will be automatically logged out for security.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '20px' }}>
                    {[
                      { value: 5, label: '5 Minutes', desc: 'Default - Most Secure', icon: '🔒' },
                      { value: 10, label: '10 Minutes', desc: 'Short Break', icon: '☕' },
                      { value: 20, label: '20 Minutes', desc: 'Medium Break', icon: '📖' },
                      { value: 30, label: '30 Minutes', desc: 'Extended Break', icon: '🍽️' },
                      { value: 60, label: '1 Hour', desc: 'Long Session', icon: '⏳' },
                    ].map(opt => {
                      const isSelected = (preferences?.idleTimeout || preferences?.idle_timeout || 5) === opt.value;
                      return (
                        <div
                          key={opt.value}
                          onClick={() => handlePreferenceChange('idleTimeout', opt.value)}
                          style={{
                            padding: '20px 16px', borderRadius: '14px', cursor: 'pointer',
                            textAlign: 'center', transition: 'all 0.3s ease',
                            background: isSelected ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#f8fafc',
                            color: isSelected ? '#fff' : '#1e293b',
                            border: isSelected ? '2px solid #4f46e5' : '2px solid #e2e8f0',
                            boxShadow: isSelected ? '0 8px 25px rgba(79,70,229,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
                            transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <div style={{ fontSize: '28px', marginBottom: '8px' }}>{opt.icon}</div>
                          <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{opt.label}</div>
                          <div style={{ fontSize: '11px', opacity: 0.7 }}>{opt.desc}</div>
                          {opt.value === 5 && (
                            <div style={{
                              marginTop: '8px', fontSize: '10px', fontWeight: 700,
                              padding: '2px 8px', borderRadius: '8px',
                              background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(79,70,229,0.1)',
                              color: isSelected ? '#fff' : '#4f46e5',
                              display: 'inline-block',
                            }}>DEFAULT</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '24px', background: 'rgba(245,158,11,0.08)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                      ⚠️ <strong>Security Note:</strong> A shorter idle timeout provides better security by automatically logging you out when you're away. Choose a longer timeout only if you frequently step away for short periods.
                    </p>
                  </div>

                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: '12px 32px', borderRadius: '12px', border: 'none',
                        background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                        color: '#fff', fontWeight: 700, fontSize: '14px',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 15px rgba(79,70,229,0.3)',
                      }}
                    >
                      {saving ? '⏳ Saving...' : '💾 Save Idle Timeout'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* System Management Tab */}
          {activeTab === 'system' && (user.role === 'system_admin' || user.role === 'property_admin') && (
            <div className="tab-content">
              <h2>🖥️ System Controls</h2>
              
              <div className="system-grid">
                {user.role === 'system_admin' && (
                  <div className="control-card">
                    <h3>Performance Mode</h3>
                    <div className="performance-toggle">
                      <button className="perf-btn slow">Slow</button>
                      <button className="perf-btn normal active">Normal</button>
                      <button className="perf-btn fast">Fast</button>
                    </div>
                    <p className="help-text">Normal mode handles standard traffic efficiently.</p>
                  </div>
                )}

                <div className="control-card">
                  <h3>Security Controls</h3>
                  <div className="toggle-setting">
                    <label>Emergency Lockdown</label>
                    <label className="toggle-switch">
                      <input type="checkbox" />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-setting">
                    <label>External API Access</label>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>

                {user.role === 'system_admin' && (
                  <div className="control-card destructive">
                    <h3>Critical System Actions</h3>
                    <div className="action-buttons">
                      <button className="restart-btn" onClick={() => {
                        if(window.confirm('Are you sure you want to RESTART the system?')) {
                          axios.post(`http://${window.location.hostname}:5000/api/system/restart`, {}, { headers: { 'x-user-role': user.role } });
                        }
                      }}>🔄 Restart System</button>
                      <button className="shutdown-btn" onClick={() => {
                        if(window.confirm('Are you sure you want to SHUTDOWN the system? This will stop all services.')) {
                          axios.post(`http://${window.location.hostname}:5000/api/system/shutdown`, {}, { headers: { 'x-user-role': user.role } });
                        }
                      }}>🛑 Shutdown System</button>
                      <button className="close-all-sessions-btn" onClick={() => {
                        if(window.confirm('WARNING: This will log out EVERY user on the platform. Proceed?')) {
                          handleGlobalCloseSessions();
                        }
                      }}>🛑 Force Clear All Platform Sessions</button>
                    </div>
                  </div>
                )}
                <div className="action-buttons">
                  <button 
                    className="save-all-btn" 
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? '⏳ Saving...' : '💾 Save Global Settings'}
                  </button>
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
            <h3>Confirm Action?</h3>
            <p>Are you sure you want to proceed?</p>
            <div className="confirm-actions">
              <button
                className="confirm-yes"
                onClick={() => confirmAction()}
              >
                Yes, Confirm
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

      {showLogoutConfirm && (
        <div className="confirm-dialog">
          <div className="confirm-content">
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

export default UserSettingsEnhanced;
