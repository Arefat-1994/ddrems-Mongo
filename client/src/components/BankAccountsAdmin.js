import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PageHeader from './PageHeader';

const BankAccountsAdmin = ({ user, onLogout, setCurrentPage, setCurrentView }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ bank_name: '', account_number: '', account_name: 'DDREMS', type: 'bank', status: 'active' });
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${window.API_URL}/bank-accounts`);
      setAccounts(res.data);
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${window.API_URL}/bank-accounts/${editingId}`, formData);
      } else {
        await axios.post(`${window.API_URL}/bank-accounts`, formData);
      }
      setShowModal(false);
      fetchAccounts();
    } catch (error) {
      alert('Failed to save bank account');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      try {
        await axios.delete(`${window.API_URL}/bank-accounts/${id}`);
        fetchAccounts();
      } catch (error) {
        alert('Failed to delete bank account');
      }
    }
  };

  const toggleStatus = async (account) => {
    try {
      const newStatus = account.status === 'active' ? 'inactive' : 'active';
      await axios.put(`${window.API_URL}/bank-accounts/${account._id}`, { status: newStatus });
      fetchAccounts();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  const openAddModal = () => {
    setFormData({ bank_name: '', account_number: '', account_name: 'DDREMS', type: 'bank', status: 'active' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (acc) => {
    setFormData(acc);
    setEditingId(acc._id);
    setShowModal(true);
  };

  return (
    <div className="system-admin-dashboard">
      <PageHeader
        title="Bank Accounts Management"
        subtitle="Control system payment accounts"
        user={user}
        onLogout={onLogout}
        onSettingsClick={() => setCurrentPage('settings')}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setCurrentView('dashboard')}>← Back to Analytics</button>
            <button className="btn-primary" onClick={openAddModal}>+ Add Account</button>
          </div>
        }
      />
      <div style={{ padding: '20px' }}>
        {loading ? (
          <p>Loading accounts...</p>
        ) : (
          <table style={{ width: '100%', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <thead style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '15px' }}>Bank Name</th>
                <th style={{ padding: '15px' }}>Account Name</th>
                <th style={{ padding: '15px' }}>Account Number</th>
                <th style={{ padding: '15px' }}>Type</th>
                <th style={{ padding: '15px' }}>Status</th>
                <th style={{ padding: '15px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '15px', fontWeight: 'bold' }}>{acc.bank_name}</td>
                  <td style={{ padding: '15px' }}>{acc.account_name}</td>
                  <td style={{ padding: '15px', color: '#1e3a8a', fontFamily: 'monospace', fontSize: '15px' }}>{acc.account_number}</td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ padding: '5px 10px', borderRadius: '15px', fontSize: '12px', background: acc.type === 'bank' ? '#e0f2fe' : '#fef3c7' }}>
                      {acc.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <button 
                      onClick={() => toggleStatus(acc)}
                      style={{ border: 'none', padding: '5px 15px', borderRadius: '15px', cursor: 'pointer', fontWeight: 'bold', 
                        background: acc.status === 'active' ? '#d1fae5' : '#fee2e2', color: acc.status === 'active' ? '#065f46' : '#991b1b' }}
                    >
                      {acc.status.toUpperCase()}
                    </button>
                  </td>
                  <td style={{ padding: '15px', display: 'flex', gap: '10px' }}>
                    <button onClick={() => openEditModal(acc)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(acc._id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No bank accounts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Account' : 'Add Account'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px' }}>
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} required placeholder="e.g. CBE, Awash" />
              </div>
              <div className="form-group">
                <label>Account Name</label>
                <input type="text" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Account Number / Phone</label>
                <input type="text" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="bank">Bank Transfer</option>
                  <option value="mobile">Mobile Money</option>
                  <option value="chapa_manual">Chapa Manual Reference</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions" style={{ padding: 0, marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountsAdmin;
