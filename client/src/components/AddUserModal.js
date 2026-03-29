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
  const [submitting, setSubmitting] = useState(false);

  const API_BASE = `http://${window.location.hostname}:5000/api`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.role) {
      alert('❌ Please fill in all required fields');
      return;
    }

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
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+251..."
              />
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

            <div className="form-group">
              <label>Initial Password</label>
              <input
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
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
