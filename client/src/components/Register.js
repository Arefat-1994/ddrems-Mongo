import React, { useState } from 'react';
import './Register.css';
import axios from 'axios';
import BrandLogo from './shared/BrandLogo';

const Register = ({ onBackToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user' // default to customer
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPasswords, setGeneratedPasswords] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  
  // Country codes with max phone digit lengths (digits after the country code)
  const countryCodes = [
    { code: '+251', name: 'Ethiopia', flag: '🇪🇹', maxDigits: 9 },
    { code: '+1', name: 'US/Canada', flag: '🇺🇸', maxDigits: 10 },
    { code: '+44', name: 'UK', flag: '🇬🇧', maxDigits: 10 },
    { code: '+971', name: 'UAE', flag: '🇦🇪', maxDigits: 9 },
    { code: '+254', name: 'Kenya', flag: '🇰🇪', maxDigits: 9 },
    { code: '+91', name: 'India', flag: '🇮🇳', maxDigits: 10 },
    { code: '+86', name: 'China', flag: '🇨🇳', maxDigits: 11 },
    { code: '+49', name: 'Germany', flag: '🇩🇪', maxDigits: 11 },
    { code: '+33', name: 'France', flag: '🇫🇷', maxDigits: 9 },
    { code: '+61', name: 'Australia', flag: '🇦🇺', maxDigits: 9 },
    { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦', maxDigits: 9 },
    { code: '+90', name: 'Turkey', flag: '🇹🇷', maxDigits: 10 },
    { code: '+234', name: 'Nigeria', flag: '🇳🇬', maxDigits: 10 },
    { code: '+27', name: 'South Africa', flag: '🇿🇦', maxDigits: 9 },
    { code: '+20', name: 'Egypt', flag: '🇪🇬', maxDigits: 10 },
    { code: '+255', name: 'Tanzania', flag: '🇹🇿', maxDigits: 9 },
    { code: '+256', name: 'Uganda', flag: '🇺🇬', maxDigits: 9 },
    { code: '+253', name: 'Djibouti', flag: '🇩🇯', maxDigits: 8 },
    { code: '+291', name: 'Eritrea', flag: '🇪🇷', maxDigits: 7 },
    { code: '+252', name: 'Somalia', flag: '🇸🇴', maxDigits: 8 },
    { code: '+249', name: 'Sudan', flag: '🇸🇩', maxDigits: 9 },
    { code: '+81', name: 'Japan', flag: '🇯🇵', maxDigits: 10 },
    { code: '+82', name: 'South Korea', flag: '🇰🇷', maxDigits: 10 },
    { code: '+55', name: 'Brazil', flag: '🇧🇷', maxDigits: 11 },
    { code: '+52', name: 'Mexico', flag: '🇲🇽', maxDigits: 10 },
    { code: '+7', name: 'Russia', flag: '🇷🇺', maxDigits: 10 },
    { code: '+39', name: 'Italy', flag: '🇮🇹', maxDigits: 10 },
    { code: '+34', name: 'Spain', flag: '🇪🇸', maxDigits: 9 },
    { code: '+31', name: 'Netherlands', flag: '🇳🇱', maxDigits: 9 },
    { code: '+46', name: 'Sweden', flag: '🇸🇪', maxDigits: 9 },
    { code: '+47', name: 'Norway', flag: '🇳🇴', maxDigits: 8 },
    { code: '+48', name: 'Poland', flag: '🇵🇱', maxDigits: 9 },
    { code: '+63', name: 'Philippines', flag: '🇵🇭', maxDigits: 10 },
    { code: '+60', name: 'Malaysia', flag: '🇲🇾', maxDigits: 10 },
    { code: '+65', name: 'Singapore', flag: '🇸🇬', maxDigits: 8 },
    { code: '+62', name: 'Indonesia', flag: '🇮🇩', maxDigits: 11 },
    { code: '+66', name: 'Thailand', flag: '🇹🇭', maxDigits: 9 },
    { code: '+84', name: 'Vietnam', flag: '🇻🇳', maxDigits: 9 },
    { code: '+92', name: 'Pakistan', flag: '🇵🇰', maxDigits: 10 },
    { code: '+880', name: 'Bangladesh', flag: '🇧🇩', maxDigits: 10 },
    { code: '+94', name: 'Sri Lanka', flag: '🇱🇰', maxDigits: 9 },
    { code: '+98', name: 'Iran', flag: '🇮🇷', maxDigits: 10 },
    { code: '+964', name: 'Iraq', flag: '🇮🇶', maxDigits: 10 },
    { code: '+972', name: 'Israel', flag: '🇮🇱', maxDigits: 9 },
    { code: '+962', name: 'Jordan', flag: '🇯🇴', maxDigits: 9 },
    { code: '+961', name: 'Lebanon', flag: '🇱🇧', maxDigits: 8 },
    { code: '+212', name: 'Morocco', flag: '🇲🇦', maxDigits: 9 },
    { code: '+213', name: 'Algeria', flag: '🇩🇿', maxDigits: 9 },
    { code: '+216', name: 'Tunisia', flag: '🇹🇳', maxDigits: 8 },
    { code: '+233', name: 'Ghana', flag: '🇬🇭', maxDigits: 9 },
    { code: '+237', name: 'Cameroon', flag: '🇨🇲', maxDigits: 9 },
    { code: '+225', name: 'Ivory Coast', flag: '🇨🇮', maxDigits: 10 },
    { code: '+243', name: 'DR Congo', flag: '🇨🇩', maxDigits: 9 },
    { code: '+260', name: 'Zambia', flag: '🇿🇲', maxDigits: 9 },
    { code: '+263', name: 'Zimbabwe', flag: '🇿🇼', maxDigits: 9 },
    { code: '+258', name: 'Mozambique', flag: '🇲🇿', maxDigits: 9 }
  ];
  const [selectedCountryCode, setSelectedCountryCode] = useState('+251');
  const [step, setStep] = useState(1); // 1: Input, 2: Review & Terms
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const getSelectedCountry = () => countryCodes.find(c => c.code === selectedCountryCode) || countryCodes[0];

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    const generateOne = () => {
      let pwd = '';
      // Ensure at least one of each required type
      pwd += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
      pwd += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      pwd += '0123456789'[Math.floor(Math.random() * 10)];
      pwd += '!@#$%^&*()_+'[Math.floor(Math.random() * 12)];
      
      // Fill the rest to reach 12 characters
      for(let i = 0; i < 8; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Shuffle the string
      return pwd.split('').sort(() => 0.5 - Math.random()).join('');
    };

    setGeneratedPasswords([generateOne(), generateOne(), generateOne()]);
  };

  const selectGeneratedPassword = (pwd) => {
    setFormData({
      ...formData,
      password: pwd,
      confirmPassword: pwd
    });
    setGeneratedPasswords([]);
    setShowPassword(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Strict alphabetic validation for full name
    if (name === 'name') {
      const alphabeticValue = value.replace(/[^a-zA-Z\s]/g, '');
      setFormData({ ...formData, [name]: alphabeticValue });
      setError('');
      return;
    }

    // Strict numeric validation for phone number with max length enforcement
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '');
      const country = getSelectedCountry();
      const trimmed = numericValue.slice(0, country.maxDigits);
      setFormData({ ...formData, [name]: trimmed });
      setError('');
      return;
    }

    setFormData({
      ...formData,
      [name]: value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      // Validation for Step 1
      if (!formData.name || !formData.email || !formData.password) {
        setError('Please fill in all required fields');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }
      // Phone number length validation
      const selectedCountry = getSelectedCountry();
      if (formData.phone.length < selectedCountry.maxDigits) {
        setError(`Phone number must be ${selectedCountry.maxDigits} digits for ${selectedCountry.name} (${selectedCountry.code}). You entered ${formData.phone.length} digits.`);
        return;
      }

      setStep(2);
      return;
    }

    // Validation for Step 2
    if (!agreedToTerms) {
      setError('You must agree to the terms and conditions to proceed.');
      return;
    }

    setLoading(true);

    try {
      const fullPhoneNumber = `${selectedCountryCode}${formData.phone}`;
      
      await axios.post(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        phone: fullPhoneNumber,
        password: formData.password,
        role: formData.role
      });

      alert('✅ Registration successful! Please login with your credentials.');
      onBackToLogin();
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container" style={{ background: "url('/hero-bg.png') no-repeat center center fixed", backgroundSize: 'cover' }}>
      <div className="register-card">
        <div className="register-header">
          <BrandLogo size="large" showSlogan={true} />
          <h2 className="auth-heading">Create Account</h2>
        </div>

        <div className="auth-info-box">
          <div className="info-icon">i</div>
          <p>Join DDREMS and manage properties<br />with ease and efficiency. Let's get started!</p>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
          {step === 1 ? (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                  <select 
                    className="phone-country-select"
                    value={selectedCountryCode} 
                    onChange={(e) => {
                      setSelectedCountryCode(e.target.value);
                      setFormData({ ...formData, phone: '' });
                    }}
                    title={getSelectedCountry().name}
                  >
                    {countryCodes.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input
                    className="phone-number-input"
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={`Enter ${getSelectedCountry().maxDigits} digits (${getSelectedCountry().name})`}
                    required
                    maxLength={getSelectedCountry().maxDigits}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <small style={{ color: '#64748b', fontSize: '11px' }}>
                    Only digits allowed. No letters or symbols.
                  </small>
                  <small style={{ 
                    color: formData.phone.length === getSelectedCountry().maxDigits ? '#10b981' : '#94a3b8', 
                    fontSize: '11px', fontWeight: '600' 
                  }}>
                    {formData.phone.length}/{getSelectedCountry().maxDigits} digits
                  </small>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Register As *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="user">Customer - Browse and buy properties</option>
                  <option value="owner">Property Owner - List your properties</option>
                </select>
                <small className="form-hint">
                  ℹ️ Brokers must apply via the "Become Broker" section
                </small>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="password" style={{ margin: 0 }}>Password *</label>
                  <button 
                    type="button" 
                    onClick={generateStrongPassword}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                  >
                    🎲 Generate Strong Password
                  </button>
                </div>
                
                {generatedPasswords.length > 0 && (
                  <div style={{ marginBottom: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#475569', fontWeight: '600' }}>Choose a secure password:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {generatedPasswords.map((pwd, idx) => (
                        <button 
                          key={idx} 
                          type="button"
                          onClick={() => selectGeneratedPassword(pwd)}
                          style={{ 
                            background: 'white', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '6px', 
                            cursor: 'pointer', fontFamily: 'monospace', fontSize: '14px', fontWeight: 'bold', color: '#1e293b',
                            transition: 'all 0.2s', textAlign: 'left'
                          }}
                          onMouseOver={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.color = '#6366f1'; }}
                          onMouseOut={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#1e293b'; }}
                        >
                          {pwd}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password (min 6 characters)"
                    required
                    minLength="6"
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                />
              </div>

              <button type="submit" className="btn-register">
                Next: Review Information
              </button>
            </>
          ) : (
            <div className="register-review-step">
              <div className="review-section">
                <h3>🔍 Review Your Information</h3>
                <div className="review-card">
                  <div className="review-item"><strong>Full Name:</strong> {formData.name}</div>
                  <div className="review-item"><strong>Email:</strong> {formData.email}</div>
                  <div className="review-item"><strong>Phone:</strong> {selectedCountryCode} {formData.phone}</div>
                  <div className="review-item"><strong>Role:</strong> {formData.role === 'user' ? 'Customer' : 'Property Owner'}</div>
                </div>
              </div>

              <div className="terms-section">
                <h3>📜 Terms and Conditions</h3>
                <div className="terms-container">
                  <h4>1. Use of Service</h4>
                  <p>By creating an account, you agree to use the DDREMS platform in accordance with all local laws and regulations of the Dire Dawa administration.</p>
                  
                  <h4>2. Data Privacy</h4>
                  <p>Your personal information will be protected and used only for real estate transaction purposes within the platform.</p>
                  
                  <h4>3. Accuracy of Information</h4>
                  <p>You agree to provide accurate and truthful information during registration and in all your interactions on the platform.</p>
                  
                  <h4>4. Responsibilities</h4>
                  <p>Owners are responsible for the accuracy of their property listings. Customers are responsible for verifying property details before making payments.</p>
                </div>
                
                <label className="terms-checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={agreedToTerms} 
                    onChange={(e) => setAgreedToTerms(e.target.checked)} 
                  />
                  <span>I agree to the Terms and Conditions above.</span>
                </label>
              </div>

              <div className="review-actions">
                <button type="button" className="btn-back-edit" onClick={() => setStep(1)}>
                  ← Back to Edit
                </button>
                <button
                  type="submit"
                  className="btn-register"
                  disabled={loading}
                >
                  {loading ? '⏳ Creating Account...' : '✅ Confirm & Create Account'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div className="register-footer">
          <p>Already have an account?</p>
          <button
            className="btn-back-to-login"
            onClick={onBackToLogin}
          >
            ← Back to Login
          </button>
        </div>

        <div className="register-info">
          <h3>📋 What happens after registration?</h3>
          <div className="info-steps">
            <div className="info-step">
              <span className="step-number">1</span>
              <div className="step-content">
                <h4>Complete Your Profile</h4>
                <p>After login, complete your profile with required documents</p>
              </div>
            </div>
            <div className="info-step">
              <span className="step-number">2</span>
              <div className="step-content">
                <h4>Admin Approval</h4>
                <p>Your profile will be reviewed and approved by our admin team</p>
              </div>
            </div>
            <div className="info-step">
              <span className="step-number">3</span>
              <div className="step-content">
                <h4>Full Access</h4>
                <p>Once approved, you'll have full access to all features</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
