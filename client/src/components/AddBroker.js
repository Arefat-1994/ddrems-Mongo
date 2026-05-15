import React, { useState } from 'react';
import './AddBroker.css';
import axios from 'axios';

const AddBroker = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'admin123'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = 'Name should only contain letters and spaces';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      const cleanPhone = formData.phone.replace(/\s/g, '');
      if (!/^(\+251|0)9[0-9]{8}$/.test(cleanPhone)) {
        newErrors.phone = 'Enter a valid Ethiopian phone number (09... or +2519...)';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Initial password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      console.log('Sending broker creation request:', formData);
      const response = await axios.post(`${process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`}/api/brokers/create-account`, formData);
      console.log('Response:', response.data);
      
      if (response.data.success && response.data.user_id) {
        alert(`✅ Broker account created successfully!

User ID: ${response.data.user_id}
Email: ${formData.email}
Password: ${formData.password}

The broker can now login and complete their profile.`);
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        alert('❌ Failed to create broker account. Please try again.');
      }
    } catch (error) {
      console.error('Error creating broker:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to create broker account';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-broker-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>🤝 Add New Broker</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="info-banner">
              <span className="info-icon">ℹ️</span>
              <div>
                <strong>Account Creation Process:</strong>
                <p>1. Create broker account with basic information</p>
                <p>2. Broker receives login credentials</p>
                <p>3. Broker logs in and completes their profile</p>
                <p>4. Admin approves the profile</p>
                <p>5. Broker gets full access to the system</p>
              </div>
            </div>

            <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter broker's full name"
                required
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="broker@example.com"
                required
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
              <label>Phone Number *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251912345678"
                required
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label>Initial Password</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Default: admin123"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
              <small className="form-hint">
                The broker can change this password after first login
              </small>
            </div>

            <div className="credentials-box">
              <h4>📋 Login Credentials (Share with Broker)</h4>
              <div className="credential-item">
                <strong>Email:</strong> {formData.email || 'Not set'}
              </div>
              <div className="credential-item">
                <strong>Password:</strong> {formData.password}
              </div>
              <div className="credential-item">
                <strong>Role:</strong> Broker
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '⏳ Creating...' : '✅ Create Broker Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBroker;
