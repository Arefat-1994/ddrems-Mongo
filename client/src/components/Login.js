import React, { useState } from 'react';
import './Login.css';
import axios from 'axios';
import Register from './Register';
import BrandLogo from './shared/BrandLogo';

const Login = ({ onLogin, initialShowRegister = false, onBackToLanding }) => {
  const [showRegister, setShowRegister] = useState(initialShowRegister);

  const handleBackToLogin = () => {
    if (initialShowRegister && onBackToLanding) {
      onBackToLanding();
    } else {
      setShowRegister(false);
    }
  };

  if (showRegister) {
    return <Register onBackToLogin={handleBackToLogin} />;
  }

  return <LoginForm onLogin={onLogin} onShowRegister={() => setShowRegister(true)} onBackToLanding={onBackToLanding} />;
};

const LoginForm = ({ onLogin, onShowRegister, onBackToLanding }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = email, 2 = otp
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Security lockout states
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [isBanned, setIsBanned] = useState(false);
  // Suspicion logic removed to fix unused vars

  // Lockout countdown timer
  React.useEffect(() => {
    if (lockCountdown <= 0) {
      setIsLocked(false);
      return;
    }
    const timer = setInterval(() => {
      setLockCountdown(prev => {
        if (prev <= 1) {
          setIsLocked(false);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked || isBanned) return;
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`http://${window.location.hostname}:5000/api/auth/login`, {
        email,
        password
      });
      
      // Success — reset everything
      setIsLocked(false);
      setIsBanned(false);
      onLogin(response.data.token, response.data.user);
    } catch (err) {
      const data = err.response?.data;
      const status = err.response?.status;



      if (status === 429 && data?.locked) {
        // Locked out
        setIsLocked(true);
        setLockCountdown(data.remaining_seconds || 60);
        setError(`🔒 ${data.message}`);
      } else if (data?.banned) {
        setIsBanned(true);
        setError(`🛑 ${data.message}`);
      } else if (data?.suspicious) {
        setError(`🚨 ${data.message}`);
      } else if (status === 403) {
        setError('⏳ ' + (data?.message || 'Your account is pending activation.'));
      } else if (status === 401) {
        setError('❌ ' + (data?.message || 'Invalid email or password.'));
      } else {
        setError('⚠️ Login failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    try {
      if (resetStep === 1) {
        // Request OTP
        const res = await axios.post(`http://${window.location.hostname}:5000/api/auth/forgot-password`, { email: resetEmail });
        setResetMessage(res.data.message);
        setResetStep(2);
      } else {
        // Verify OTP
        const res = await axios.post(`http://${window.location.hostname}:5000/api/auth/verify-otp`, { email: resetEmail, otp: otpCode });
        setResetMessage(res.data.message);
        setTimeout(() => {
          setShowForgotModal(false);
          setResetStep(1);
          setResetEmail('');
          setOtpCode('');
          setResetMessage('');
        }, 3000);
      }
    } catch (err) {
      setResetError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ background: "url('/hero-bg.png') no-repeat center center fixed", backgroundSize: 'cover' }}>
      <div className="login-card">
        {onBackToLanding && (
          <button 
            type="button" 
            onClick={onBackToLanding}
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <i className="fas fa-arrow-left"></i> Back to Home
          </button>
        )}
        <div className="login-header" style={{marginTop: onBackToLanding ? '20px' : '0'}}>
          <BrandLogo size="large" showSlogan={true} />
          <h2 className="auth-heading">Login</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ddrems.com"
              required
              disabled={isLocked || isBanned}
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ margin: 0 }}>Password</label>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', padding: 0 }}
                onClick={() => { setShowForgotModal(true); setResetStep(1); setResetMessage(''); setResetError(''); }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLocked || isBanned}
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', 
                  right: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontSize: '16px',
                  padding: '5px'
                }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="login-btn" 
            disabled={loading || isLocked || isBanned}
            style={{ 
              opacity: (isLocked || isBanned) ? 0.6 : 1, 
              cursor: (isLocked || isBanned) ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? 'Logging in...' : isLocked ? `Locked (${lockCountdown}s)` : isBanned ? 'Account Banned' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          
          <div className="register-section">
            <p>Don't have an account?</p>
            <button 
              type="button"
              className="btn-show-register" 
              onClick={onShowRegister}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: '16px', padding: '30px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>🔐 Reset Password</h2>
              <button onClick={() => setShowForgotModal(false)} style={{ background: '#f3f4f6', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {resetMessage && <div style={{ padding: '10px', background: '#dcfce7', color: '#166534', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{resetMessage}</div>}
            {resetError && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{resetError}</div>}

            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Email Address</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  required
                  disabled={resetStep === 2}
                  style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box' }}
                />
              </div>

              {resetStep === 2 && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>OTP Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter 6-digit OTP from email"
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', boxSizing: 'border-box', letterSpacing: '2px' }}
                  />
                </div>
              )}

              <button type="submit" disabled={resetLoading} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: resetLoading ? 0.7 : 1 }}>
                {resetLoading ? 'Processing...' : (resetStep === 1 ? 'Send OTP' : 'Verify OTP')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
