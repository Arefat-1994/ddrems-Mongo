import React, { useState } from 'react';
import './Register.css';
import axios from 'axios';

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
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

    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
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
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join DDREMS - Dire Dawa Real Estate Management System</p>
        </div>

        {error && (
          <div className="error-message">
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form">
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
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g., +251912345678"
              required
            />
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
              <option value="broker">Broker - Manage property sales</option>
            </select>
            <small className="form-hint">
              ℹ️ Admin accounts are created by the system only
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password (min 6 characters)"
              required
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-register"
            disabled={loading}
          >
            {loading ? '⏳ Creating Account...' : '✅ Create Account'}
          </button>
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
