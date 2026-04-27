import React, { useState, useEffect } from 'react';
import './TwoFactorVerification.css';
import axios from 'axios';

const TwoFactorVerification = ({ user, onVerificationComplete, onCancel }) => {
  const [twoFactorSettings, setTwoFactorSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('method'); // 'method', 'otp', 'password', 'captcha'
  
  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  
  // Password
  const [securityPassword, setSecurityPassword] = useState('');
  
  // CAPTCHA
  const [captchaChallenge, setCaptchaChallenge] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => {
    fetchTwoFactorSettings();
  }, [user?.id]);

  const fetchTwoFactorSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/user-settings/${user.id}/two-factor`);
      setTwoFactorSettings(response.data);
      console.log('2FA Settings loaded:', response.data);
    } catch (error) {
      console.error('Error fetching 2FA settings:', error);
      setMessage('❌ Error loading 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOTP(otp);
    return otp;
  };

  const generateCAPTCHA = async () => {
    try {
      const response = await axios.post(`/api/two-factor-auth/${user.id}/generate-captcha`, {
        difficulty: twoFactorSettings?.captchaDifficulty || 'medium'
      });
      setCaptchaChallenge(response.data);
      console.log('CAPTCHA generated:', response.data);
    } catch (error) {
      console.error('Error generating CAPTCHA:', error);
      setMessage('❌ Error generating CAPTCHA');
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setVerifying(true);
      
      if (otpCode.length !== 6 || isNaN(otpCode)) {
        setMessage('❌ Please enter a valid 6-digit OTP');
        setVerifying(false);
        return;
      }

      const response = await axios.post(`/api/user-settings/${user.id}/verify-otp`, {
        otpCode,
        generatedOTP
      });

      if (response.data.valid) {
        setMessage('✅ OTP verified successfully!');
        
        // If CAPTCHA is enabled, proceed to CAPTCHA
        if (twoFactorSettings?.captchaEnabled) {
          setTimeout(() => {
            setStep('captcha');
            generateCAPTCHA();
          }, 1500);
        } else {
          // Complete verification
          setTimeout(() => {
            onVerificationComplete(true);
          }, 1500);
        }
      } else {
        setMessage('❌ Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setMessage('❌ ' + (error.response?.data?.message || 'Error verifying OTP'));
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      setVerifying(true);
      
      if (!securityPassword) {
        setMessage('❌ Please enter your security password');
        setVerifying(false);
        return;
      }

      const response = await axios.post(`/api/two-factor-auth/${user.id}/verify-password-2fa`, {
        securityPassword
      });

      if (response.data.valid) {
        setMessage('✅ Password verified successfully!');
        
        // If CAPTCHA is enabled, proceed to CAPTCHA
        if (twoFactorSettings?.captchaEnabled) {
          setTimeout(() => {
            setStep('captcha');
            generateCAPTCHA();
          }, 1500);
        } else {
          // Complete verification
          setTimeout(() => {
            onVerificationComplete(true);
          }, 1500);
        }
      } else {
        setMessage('❌ Invalid password. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      setMessage('❌ ' + (error.response?.data?.message || 'Error verifying password'));
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyCAPTCHA = async () => {
    try {
      setVerifying(true);
      
      if (!captchaAnswer) {
        setMessage('❌ Please enter the CAPTCHA answer');
        setVerifying(false);
        return;
      }

      const response = await axios.post(`/api/two-factor-auth/${user.id}/verify-captcha`, {
        challengeId: captchaChallenge.challengeId,
        answer: captchaAnswer
      });

      if (response.data.valid) {
        setMessage('✅ CAPTCHA verified successfully!');
        setTimeout(() => {
          onVerificationComplete(true);
        }, 1500);
      } else {
        setMessage('❌ Invalid CAPTCHA answer. Please try again.');
        setCaptchaAnswer('');
      }
    } catch (error) {
      console.error('Error verifying CAPTCHA:', error);
      setMessage('❌ ' + (error.response?.data?.message || 'Error verifying CAPTCHA'));
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="two-factor-verification">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading 2FA settings...</p>
        </div>
      </div>
    );
  }

  if (!twoFactorSettings?.twoFactorEnabled) {
    return (
      <div className="two-factor-verification">
        <div className="error-message">
          <h2>⚠️ Two-Factor Authentication Not Enabled</h2>
          <p>Please enable 2FA in your settings first.</p>
          <button onClick={onCancel}>← Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="two-factor-verification">
      <div className="verification-container">
        <div className="verification-header">
          <h2>🔐 Two-Factor Verification</h2>
          <p>Complete the verification process to access your account</p>
        </div>

        {message && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {/* OTP Verification */}
        {step === 'otp' && twoFactorSettings?.twoFactorMethod === 'otp' && (
          <div className="verification-step">
            <div className="step-info">
              <h3>📱 Enter OTP Code</h3>
              <p>Enter the 6-digit code from your authenticator app</p>
            </div>

            <div className="step-content">
              <div className="otp-display">
                <p className="label">Generated OTP:</p>
                <p className="code">{generatedOTP}</p>
                <p className="hint">Enter this code in your authenticator app</p>
              </div>

              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                maxLength="6"
                className="otp-input"
                disabled={verifying}
              />

              <button
                className="verify-btn"
                onClick={handleVerifyOTP}
                disabled={verifying || otpCode.length !== 6}
              >
                {verifying ? '⏳ Verifying...' : '✅ Verify OTP'}
              </button>
            </div>
          </div>
        )}

        {/* Password Verification */}
        {step === 'password' && twoFactorSettings?.twoFactorMethod === 'password' && (
          <div className="verification-step">
            <div className="step-info">
              <h3>🔑 Enter Security Password</h3>
              <p>Enter your security password to verify</p>
            </div>

            <div className="step-content">
              <input
                type="password"
                placeholder="Enter your security password"
                value={securityPassword}
                onChange={(e) => setSecurityPassword(e.target.value)}
                className="password-input"
                disabled={verifying}
              />

              <button
                className="verify-btn"
                onClick={handleVerifyPassword}
                disabled={verifying || !securityPassword}
              >
                {verifying ? '⏳ Verifying...' : '✅ Verify Password'}
              </button>
            </div>
          </div>
        )}

        {/* CAPTCHA Verification */}
        {step === 'captcha' && captchaChallenge && (
          <div className="verification-step">
            <div className="step-info">
              <h3>🤖 Verify You're Human</h3>
              <p>Complete the CAPTCHA challenge</p>
            </div>

            <div className="step-content">
              <div className="captcha-challenge">
                {captchaChallenge.challengeType === 'text' && (
                  <div className="captcha-text">
                    <p className="label">Enter the text:</p>
                    <p className="challenge">{captchaChallenge.challengeData.display}</p>
                  </div>
                )}

                {captchaChallenge.challengeType === 'math' && (
                  <div className="captcha-math">
                    <p className="label">Solve the math problem:</p>
                    <p className="challenge">{captchaChallenge.challengeData.question}</p>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Enter your answer"
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                  className="captcha-input"
                  disabled={verifying}
                />

                <button
                  className="verify-btn"
                  onClick={handleVerifyCAPTCHA}
                  disabled={verifying || !captchaAnswer}
                >
                  {verifying ? '⏳ Verifying...' : '✅ Verify CAPTCHA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Method Selection */}
        {step === 'method' && (
          <div className="verification-step">
            <div className="step-info">
              <h3>Choose Verification Method</h3>
              <p>Select how you want to verify your identity</p>
            </div>

            <div className="method-selection">
              {twoFactorSettings?.twoFactorMethod === 'otp' && (
                <button
                  className="method-btn otp"
                  onClick={() => {
                    setStep('otp');
                    generateOTP();
                  }}
                >
                  <span className="icon">📱</span>
                  <span className="text">OTP Code</span>
                  <span className="desc">Use authenticator app</span>
                </button>
              )}

              {twoFactorSettings?.twoFactorMethod === 'password' && (
                <button
                  className="method-btn password"
                  onClick={() => setStep('password')}
                >
                  <span className="icon">🔑</span>
                  <span className="text">Security Password</span>
                  <span className="desc">Use your security password</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="verification-footer">
          <button className="cancel-btn" onClick={onCancel}>
            ← Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorVerification;
