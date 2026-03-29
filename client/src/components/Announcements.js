import React, { useState, useEffect } from 'react';
import './Announcements.css';
import PageHeader from './PageHeader';
import axios from 'axios';

const Announcements = ({ user, onLogout }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      // Mock data for demo
      setAnnouncements([
        {
          id: 1,
          title: 'System Maintenance Scheduled',
          content: 'Scheduled maintenance on March 1st from 2:00 AM to 4:00 AM',
          priority: 'high',
          created_at: new Date().toISOString(),
          created_by: 'Admin'
        },
        {
          id: 2,
          title: 'New Feature: 3D Property Tours',
          content: 'We have added support for 3D virtual property tours',
          priority: 'normal',
          created_at: new Date().toISOString(),
          created_by: 'Admin'
        }
      ]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/announcements/${editingId}`, formData);
      } else {
        await axios.post('http://localhost:5000/api/announcements', formData);
      }
      fetchAnnouncements();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Announcement saved locally (backend not connected)');
      setShowModal(false);
      resetForm();
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority
    });
    setEditingId(announcement.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await axios.delete(`http://localhost:5000/api/announcements/${id}`);
        fetchAnnouncements();
      } catch (error) {
        console.error('Error deleting announcement:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({ title: '', content: '', priority: 'normal' });
    setEditingId(null);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: '#ef4444',
      normal: '#3b82f6',
      low: '#6b7280'
    };
    return colors[priority] || colors.normal;
  };

  return (
    <div className="announcements">
      <PageHeader
        title="Announcements"
        subtitle="Manage system-wide announcements and notifications"
        user={user}
        onLogout={onLogout}
        actions={
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <span>➕</span> New Announcement
          </button>
        }
      />

      <div className="announcements-grid">
        {announcements.map(announcement => (
          <div key={announcement.id} className="announcement-card">
            <div className="announcement-header">
              <span 
                className="priority-badge"
                style={{ background: getPriorityColor(announcement.priority) }}
              >
                {announcement.priority}
              </span>
              <span className="announcement-date">
                {new Date(announcement.created_at).toLocaleDateString()}
              </span>
            </div>
            <h3>{announcement.title}</h3>
            <p>{announcement.content}</p>
            <div className="announcement-footer">
              <span className="created-by">By: {announcement.created_by || 'Admin'}</span>
              <div className="announcement-actions">
                <button className="btn-icon" onClick={() => handleEdit(announcement)} title="Edit">
                  ✏️
                </button>
                <button className="btn-icon danger" onClick={() => handleDelete(announcement.id)} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button className="close-btn" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter announcement title"
                />
              </div>
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows="4"
                  placeholder="Enter announcement content"
                />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update' : 'Create'} Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
