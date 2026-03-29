import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RealEstateAgreementWorkflow.css';

const RealEstateAgreementWorkflow = ({ user, onLogout }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    fetchAgreements();
    if (user.role === 'user') {
      fetchProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      let endpoint = '';

      if (user.role === 'user') {
        endpoint = `http://localhost:5000/api/real-estate-agreement/customer/${user.id}`;
      } else if (user.role === 'property_admin' || user.role === 'system_admin') {
        endpoint = `http://localhost:5000/api/real-estate-agreement/admin/pending`;
      } else if (user.role === 'owner') {
        endpoint = `http://localhost:5000/api/real-estate-agreement/owner/${user.id}`;
      }

      if (endpoint) {
        const response = await axios.get(endpoint);
        setAgreements(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching agreements:', error);
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/properties');
      setProperties(response.data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending_admin_review': { emoji: '⏳', label: 'Pending Admin Review', color: '#f59e0b' },
      'forwarded_to_owner': { emoji: '➡️', label: 'Forwarded to Owner', color: '#8b5cf6' },
      'owner_approved': { emoji: '✅', label: 'Owner Approved', color: '#10b981' },
      'owner_rejected': { emoji: '❌', label: 'Owner Rejected', color: '#ef4444' },
      'waiting_customer_input': { emoji: '⏳', label: 'Waiting for Customer', color: '#f59e0b' },
      'submitted_by_customer': { emoji: '📤', label: 'Submitted by Customer', color: '#3b82f6' },
      'owner_final_approved': { emoji: '✅', label: 'Final Approved', color: '#10b981' },
      'payment_submitted': { emoji: '💳', label: 'Payment Submitted', color: '#3b82f6' },
      'completed': { emoji: '🎉', label: 'Completed', color: '#10b981' }
    };
    return badges[status] || { emoji: '❓', label: status, color: '#6b7280' };
  };

  const handleRequestAgreement = () => {
    setModalType('request');
    setFormData({});
    setShowModal(true);
  };

  const handleAction = (agreement, type) => {
    setSelectedAgreement(agreement);
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedAgreement && modalType !== 'request') return;

    setActionLoading(true);
    try {
      let endpoint = '';
      let method = 'POST';
      let data = {};

      switch (modalType) {
        case 'request':
          endpoint = 'http://localhost:5000/api/real-estate-agreement/request';
          data = {
            property_id: formData.property_id,
            customer_id: user.id,
            customer_notes: formData.customer_notes
          };
          break;

        case 'generate':
          endpoint = `http://localhost:5000/api/real-estate-agreement/${selectedAgreement.id}/generate`;
          data = { admin_id: user.id };
          break;

        case 'forward':
          endpoint = `http://localhost:5000/api/real-estate-agreement/${selectedAgreement.id}/forward-to-owner`;
          data = { admin_id: user.id };
          break;

        case 'owner_response':
          endpoint = `http://localhost:5000/api/real-estate-agreement/${selectedAgreement.id}/owner-response`;
          data = {
            owner_id: user.id,
            response_status: formData.response_status,
            response_message: formData.response_message
          };
          break;

        case 'payment':
          endpoint = `http://localhost:5000/api/real-estate-agreement/${selectedAgreement.id}/submit-payment`;
          data = {
            customer_id: user.id,
            payment_method: formData.payment_method,
            payment_amount: formData.payment_amount,
            receipt_file_path: formData.receipt_file_path
          };
          break;

        case 'verify_payment':
          endpoint = `http://localhost:5000/api/real-estate-agreement/${selectedAgreement.id}/verify-payment`;
          data = {
            admin_id: user.id,
            verification_status: formData.verification_status,
            verification_notes: formData.verification_notes
          };
          break;

        default:
          return;
      }

      const response = await axios({
        method,
        url: endpoint,
        data
      });

      alert(`✅ ${response.data.message}`);
      setShowModal(false);
      fetchAgreements();
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAgreements = filter === 'all'
    ? agreements
    : agreements.filter(a => a.status === filter || a.status.includes(filter));

  const getWorkflowStep = (status) => {
    const steps = {
      'pending_admin_review': 1,
      'forwarded_to_owner': 2,
      'owner_approved': 3,
      'owner_rejected': 0,
      'waiting_customer_input': 4,
      'submitted_by_customer': 5,
      'owner_final_approved': 6,
      'payment_submitted': 7,
      'completed': 8
    };
    return steps[status] || 0;
  };

  return (
    <div className="real-estate-workflow-page">
      <div className="workflow-header">
        <div className="header-content">
          <h1>🏘️ Real Estate Agreement Workflow</h1>
          <p>Manage property agreements through the complete lifecycle</p>
        </div>
        <div className="header-actions">
          {user.role === 'user' && (
            <button className="btn-primary" onClick={handleRequestAgreement}>
              📝 Request Agreement
            </button>
          )}
        </div>
      </div>

      <div className="workflow-container">
        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            📋 All ({agreements.length})
          </button>
          <button
            className={`tab ${filter === 'pending_admin_review' ? 'active' : ''}`}
            onClick={() => setFilter('pending_admin_review')}
          >
            ⏳ Pending ({agreements.filter(a => a.status === 'pending_admin_review').length})
          </button>
          <button
            className={`tab ${filter === 'forwarded_to_owner' ? 'active' : ''}`}
            onClick={() => setFilter('forwarded_to_owner')}
          >
            ➡️ With Owner ({agreements.filter(a => a.status === 'forwarded_to_owner').length})
          </button>
          <button
            className={`tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            🎉 Completed ({agreements.filter(a => a.status === 'completed').length})
          </button>
        </div>

        {/* Agreements List */}
        {loading ? (
          <div className="loading">⏳ Loading agreements...</div>
        ) : filteredAgreements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No agreements found</h3>
            <p>No agreements match your current filter</p>
          </div>
        ) : (
          <div className="agreements-list">
            {filteredAgreements.map((agreement) => {
              const badge = getStatusBadge(agreement.status);
              const step = getWorkflowStep(agreement.status);

              return (
                <div key={agreement.id} className="agreement-card">
                  {/* Workflow Progress */}
                  <div className="workflow-progress">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                      <div className="step-number">1</div>
                      <div className="step-label">Request</div>
                    </div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                      <div className="step-number">2</div>
                      <div className="step-label">Owner Review</div>
                    </div>
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                      <div className="step-number">3</div>
                      <div className="step-label">Owner Approval</div>
                    </div>
                    <div className={`step ${step >= 4 ? 'active' : ''}`}>
                      <div className="step-number">4</div>
                      <div className="step-label">Customer Input</div>
                    </div>
                    <div className={`step ${step >= 5 ? 'active' : ''}`}>
                      <div className="step-number">5</div>
                      <div className="step-label">Customer Submit</div>
                    </div>
                    <div className={`step ${step >= 6 ? 'active' : ''}`}>
                      <div className="step-number">6</div>
                      <div className="step-label">Final Approval</div>
                    </div>
                    <div className={`step ${step >= 7 ? 'active' : ''}`}>
                      <div className="step-number">7</div>
                      <div className="step-label">Payment</div>
                    </div>
                    <div className={`step ${step >= 8 ? 'active' : ''}`}>
                      <div className="step-number">8</div>
                      <div className="step-label">Complete</div>
                    </div>
                  </div>

                  {/* Card Header */}
                  <div className="card-header">
                    <div className="header-left">
                      <h3>Agreement #{agreement.id}</h3>
                      <span className="status-badge" style={{ background: badge.color + '20', color: badge.color }}>
                        {badge.emoji} {badge.label}
                      </span>
                    </div>
                    <div className="header-right">
                      <span className="date">{new Date(agreement.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Property</span>
                        <span className="value">{agreement.property_title}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Location</span>
                        <span className="value">{agreement.property_location}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Price</span>
                        <span className="value">{Number(agreement.property_price).toLocaleString()} ETB</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Customer</span>
                        <span className="value">{agreement.customer_name} (ID: {agreement.customer_id})</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Owner</span>
                        <span className="value">{agreement.owner_name || 'N/A'} (ID: {agreement.owner_id})</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions">
                    {/* Customer Actions */}
                    {user.role === 'user' && agreement.status === 'waiting_customer_input' && (
                      <>
                        <button className="btn-primary" onClick={() => handleAction(agreement, 'payment')}>
                          💳 Submit Payment
                        </button>
                      </>
                    )}

                    {/* Admin Actions */}
                    {(user.role === 'property_admin' || user.role === 'system_admin') && (
                      <>
                        {agreement.status === 'pending_admin_review' && (
                          <>
                            <button className="btn-success" onClick={() => handleAction(agreement, 'generate')}>
                              📄 Generate Agreement
                            </button>
                            <button className="btn-primary" onClick={() => handleAction(agreement, 'forward')}>
                              ➡️ Forward to Owner
                            </button>
                          </>
                        )}
                        {agreement.status === 'submitted_by_customer' && (
                          <button className="btn-info" onClick={() => handleAction(agreement, 'verify_payment')}>
                            ✅ Verify Payment
                          </button>
                        )}
                      </>
                    )}

                    {/* Owner Actions */}
                    {user.role === 'owner' && agreement.status === 'forwarded_to_owner' && (
                      <>
                        <button className="btn-success" onClick={() => handleAction(agreement, 'owner_response')}>
                          ✅ Accept Agreement
                        </button>
                        <button className="btn-danger" onClick={() => {
                          setFormData({ response_status: 'rejected' });
                          handleAction(agreement, 'owner_response');
                        }}>
                          ❌ Reject Agreement
                        </button>
                      </>
                    )}

                    {/* View Details */}
                    <button className="btn-secondary" onClick={() => {
                      setSelectedAgreement(agreement);
                      setModalType('details');
                      setShowModal(true);
                    }}>
                      👁️ View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === 'request' && '📝 Request Agreement'}
                {modalType === 'generate' && '📄 Generate Agreement'}
                {modalType === 'forward' && '➡️ Forward to Owner'}
                {modalType === 'owner_response' && '✅ Owner Response'}
                {modalType === 'payment' && '💳 Submit Payment'}
                {modalType === 'verify_payment' && '✅ Verify Payment'}
                {modalType === 'details' && '📋 Agreement Details'}
              </h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalType === 'request' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Select Property</label>
                    <select value={formData.property_id || ''} onChange={(e) => setFormData({...formData, property_id: e.target.value})} required>
                      <option value="">Choose a property...</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>
                          {prop.title} - {Number(prop.price).toLocaleString()} ETB
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes (Optional)</label>
                    <textarea
                      value={formData.customer_notes || ''}
                      onChange={(e) => setFormData({...formData, customer_notes: e.target.value})}
                      rows="4"
                      placeholder="Add any notes about your request..."
                    />
                  </div>
                </form>
              )}

              {modalType === 'owner_response' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Response</label>
                    <select value={formData.response_status || ''} onChange={(e) => setFormData({...formData, response_status: e.target.value})} required>
                      <option value="">Select response...</option>
                      <option value="accepted">✅ Accept Agreement</option>
                      <option value="rejected">❌ Reject Agreement</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea
                      value={formData.response_message || ''}
                      onChange={(e) => setFormData({...formData, response_message: e.target.value})}
                      rows="4"
                      placeholder="Add your message..."
                    />
                  </div>
                </form>
              )}

              {modalType === 'payment' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={formData.payment_method || ''} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} required>
                      <option value="">Select method...</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Amount (ETB)</label>
                    <input
                      type="number"
                      value={formData.payment_amount || ''}
                      onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Receipt File Path</label>
                    <input
                      type="text"
                      value={formData.receipt_file_path || ''}
                      onChange={(e) => setFormData({...formData, receipt_file_path: e.target.value})}
                      placeholder="/uploads/receipt.pdf"
                    />
                  </div>
                </form>
              )}

              {modalType === 'verify_payment' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Verification Status</label>
                    <select value={formData.verification_status || ''} onChange={(e) => setFormData({...formData, verification_status: e.target.value})} required>
                      <option value="">Select status...</option>
                      <option value="verified">✅ Verified</option>
                      <option value="rejected">❌ Rejected</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      value={formData.verification_notes || ''}
                      onChange={(e) => setFormData({...formData, verification_notes: e.target.value})}
                      rows="4"
                      placeholder="Add verification notes..."
                    />
                  </div>
                </form>
              )}

              {modalType === 'details' && selectedAgreement && (
                <div className="details-view">
                  <div className="detail-section">
                    <h3>📋 Agreement Information</h3>
                    <div className="detail-grid">
                      <div><strong>Agreement ID:</strong> {selectedAgreement.id}</div>
                      <div><strong>Status:</strong> {getStatusBadge(selectedAgreement.status).label}</div>
                      <div><strong>Created:</strong> {new Date(selectedAgreement.created_at).toLocaleString()}</div>
                      <div><strong>Updated:</strong> {new Date(selectedAgreement.updated_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>🏘️ Property Information</h3>
                    <div className="detail-grid">
                      <div><strong>Title:</strong> {selectedAgreement.property_title}</div>
                      <div><strong>Location:</strong> {selectedAgreement.property_location}</div>
                      <div><strong>Type:</strong> {selectedAgreement.property_type}</div>
                      <div><strong>Price:</strong> {Number(selectedAgreement.property_price).toLocaleString()} ETB</div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>👤 Customer Information</h3>
                    <div className="detail-grid">
                      <div><strong>Name:</strong> {selectedAgreement.customer_name}</div>
                      <div><strong>ID:</strong> {selectedAgreement.customer_id}</div>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>🏠 Owner Information</h3>
                    <div className="detail-grid">
                      <div><strong>Name:</strong> {selectedAgreement.owner_name || 'N/A'}</div>
                      <div><strong>ID:</strong> {selectedAgreement.owner_id}</div>
                    </div>
                  </div>

                  {selectedAgreement.customer_notes && (
                    <div className="detail-section">
                      <h3>📝 Customer Notes</h3>
                      <p>{selectedAgreement.customer_notes}</p>
                    </div>
                  )}

                  {selectedAgreement.response_message && (
                    <div className="detail-section">
                      <h3>💬 Response Message</h3>
                      <p>{selectedAgreement.response_message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              {modalType !== 'details' && (
                <button className="btn-primary" onClick={handleSubmitAction} disabled={actionLoading}>
                  {actionLoading ? '⏳ Processing...' : '✅ Confirm'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealEstateAgreementWorkflow;
