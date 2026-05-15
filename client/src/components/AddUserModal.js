import React, { useState } from 'react';
import './AddUserModal.css';
import axios from 'axios';

const AddUserModal = ({ onClose, onSuccess, initialRole }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'admin123',
    role: initialRole || 'user'
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex = /^[a-zA-Z\s]{3,50}$/;

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (!nameRegex.test(formData.name.trim())) {
      newErrors.name = 'Name should be 3-50 characters and contain only letters';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone is required for brokers and admins
    const isSpecialRole = ['broker', 'property_admin', 'system_admin', 'admin'].includes(formData.role);
    if (isSpecialRole && !formData.phone) {
      newErrors.phone = 'Phone number is required for this role';
    } else if (formData.phone) {
      const cleanPhone = formData.phone.replace(/\s/g, '').replace(/-/g, '');
      if (!/^(\+251|0)9[0-9]{8}$/.test(cleanPhone)) {
        newErrors.phone = 'Invalid Ethiopian phone number (e.g. 0912345678)';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const response = await axios.post(`${API_BASE}/users/add`, formData);
      
      if (response.data.success) {
        alert(`✅ User account created successfully!
        
Role: ${formData.role}
Email: ${formData.email}
Password: ${formData.password}`);
        
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert(`❌ Failed to create user: ${error.response?.data?.message || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-user-modal-overlay" onClick={onClose}>
      <div className="add-user-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Add New User</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
              <label>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251..."
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label>User Role *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="user">Customer</option>
                <option value="owner">Property Owner</option>
                <option value="broker">Broker</option>
                <option value="property_admin">Property Admin</option>
                <option value="admin">Admin</option>
                <option value="system_admin">System Admin</option>
              </select>
            </div>

            <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
              <label>Initial Password</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
              <small>Default password is admin123</small>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? '⏳ Creating...' : '✅ Create User Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
