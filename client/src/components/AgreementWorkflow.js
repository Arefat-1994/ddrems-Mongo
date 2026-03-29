import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AgreementWorkflow.css';
import PageHeader from './PageHeader';

const AgreementWorkflow = ({ user, onLogout }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'request', 'forward', 'decision', 'generate', 'edit', 'submit', 'review', 'final', 'commission', 'handshake'
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [agreementFields, setAgreementFields] = useState([]);

  useEffect(() => {
    fetchAgreements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      if (user.role === 'user') {
        endpoint = `http://localhost:5000/api/agreement-workflow/user/${user.id}`;
      } else if (user.role === 'property_admin' || user.role === 'system_admin') {
        endpoint = `http://localhost:5000/api/agreement-workflow/admin/pending`;
      } else {
        endpoint = `http://localhost:5000/api/agreement-workflow/user/${user.id}`;
      }

      const response = await axios.get(endpoint);
      setAgreements(response.data.agreements || response.data);
    } catch (error) {
      console.error('Error fetching agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgreementFields = async (agreementId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/agreement-workflow/${agreementId}/fields`);
      setAgreementFields(response.data.fields || []);
    } catch (error) {
      console.error('Error fetching agreement fields:', error);
      setAgreementFields([]);
    }
  };

  const handleAction = (agreement, type) => {
    setSelectedAgreement(agreement);
    setModalType(type);
    setFormData({});
    setShowModal(true);
    
    // Fetch fields if opening edit modal
    if (type === 'edit') {
      fetchAgreementFields(agreement.id);
    }
  };

  const handleSubmitAction = async () => {
    if (!selectedAgreement) return;
    
    setActionLoading(true);
    try {
      let endpoint = '';
      let method = 'POST';
      let data = {};

      switch (modalType) {
        case 'request':
          endpoint = `/api/agreement-workflow/request`;
          data = {
            customer_id: user.id,
            property_id: formData.property_id,
            customer_notes: formData.notes
          };
          break;

        case 'forward':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/forward-to-owner`;
          method = 'PUT';
          data = {
            admin_id: user.id,
            admin_notes: formData.notes
          };
          break;

        case 'decision':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/owner-decision`;
          method = 'PUT';
          data = {
            owner_id: user.id,
            decision: formData.decision,
            owner_notes: formData.notes
          };
          break;

        case 'generate':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/generate-agreement`;
          data = {
            admin_id: user.id,
            template_id: formData.template_id || 1
          };
          break;

        case 'edit':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/update-fields`;
          method = 'PUT';
          data = {
            customer_id: user.id,
            fields: formData.fields || {}
          };
          break;

        case 'submit':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/submit-agreement`;
          data = {
            customer_id: user.id,
            payment_method: formData.payment_method,
            payment_amount: formData.payment_amount,
            receipt_file_path: formData.receipt_file_path
          };
          break;

        case 'review':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/admin-review`;
          method = 'PUT';
          data = {
            admin_id: user.id,
            action: formData.action,
            admin_notes: formData.notes
          };
          break;

        case 'final':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/owner-final-review`;
          data = {
            owner_id: user.id,
            owner_notes: formData.notes
          };
          break;

        case 'commission':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/calculate-commission`;
          data = {
            admin_id: user.id,
            commission_percentage: formData.commission_percentage || 5.00
          };
          break;

        case 'handshake':
          endpoint = `/api/agreement-workflow/${selectedAgreement.id}/final-handshake`;
          data = {
            user_id: user.id,
            user_role: user.role
          };
          break;

        default:
          return;
      }

      const response = await axios({
        method,
        url: `http://localhost:5000${endpoint}`,
        data
      });

      // Auto-populate fields if agreement was just generated
      if (modalType === 'generate') {
        try {
          await axios.get(`http://localhost:5000/api/agreement-workflow/${selectedAgreement.id}/auto-populate-fields`);
        } catch (error) {
          console.error('Error auto-populating fields:', error);
        }
      }

      alert(`✅ ${response.data.message}`);
      setShowModal(false);
      fetchAgreements();
    } catch (error) {
      alert(`❌ Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStepColor = (step) => {
    const colors = {
      1: '#3b82f6', 2: '#8b5cf6', 3: '#ec4899', 4: '#f59e0b',
      5: '#10b981', 6: '#06b6d4', 7: '#6366f1', 8: '#f97316',
      9: '#14b8a6', 10: '#22c55e'
    };
    return colors[step] || '#6b7280';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending_admin_review': { emoji: '⏳', label: 'Pending Admin Review', color: '#f59e0b' },
      'waiting_owner_response': { emoji: '👤', label: 'Waiting Owner Response', color: '#8b5cf6' },
      'owner_accepted': { emoji: '✅', label: 'Owner Accepted', color: '#10b981' },
      'owner_rejected': { emoji: '❌', label: 'Owner Rejected', color: '#ef4444' },
      'agreement_generated': { emoji: '📄', label: 'Agreement Generated', color: '#3b82f6' },
      'customer_submitted': { emoji: '📤', label: 'Customer Submitted', color: '#06b6d4' },
      'admin_reviewing': { emoji: '👁️', label: 'Admin Reviewing', color: '#6366f1' },
      'waiting_owner_final_review': { emoji: '👤', label: 'Waiting Owner Final Review', color: '#f97316' },
      'owner_submitted': { emoji: '✅', label: 'Owner Submitted', color: '#14b8a6' },
      'ready_for_handshake': { emoji: '🤝', label: 'Ready for Handshake', color: '#22c55e' },
      'completed': { emoji: '🎉', label: 'Completed', color: '#10b981' }
    };
    return badges[status] || { emoji: '❓', label: status, color: '#6b7280' };
  };

  return (
    <div className="agreement-workflow-page">
      <PageHeader
        title="Agreement Workflow"
        subtitle="Manage property agreements through 10-step process"
        user={user}
        onLogout={onLogout}
        actions={
          user.role === 'user' && (
            <button className="btn-primary" onClick={() => handleAction({}, 'request')}>
              ➕ New Agreement Request
            </button>
          )
        }
      />

      <div className="workflow-container">
        {loading ? (
          <div className="loading">⏳ Loading agreements...</div>
        ) : agreements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🤝</div>
            <h3>No agreements yet</h3>
            <p>Start by creating a new agreement request</p>
          </div>
        ) : (
          <div className="agreements-list">
            {agreements.map((agreement) => {
              const badge = getStatusBadge(agreement.status);
              return (
                <div key={agreement.id} className="agreement-card">
                  <div className="card-header">
                    <div className="header-left">
                      <h3>Agreement #{agreement.id}</h3>
                      <span className="status-badge" style={{ background: badge.color + '20', color: badge.color }}>
                        {badge.emoji} {badge.label}
                      </span>
                    </div>
                    <div className="step-indicator">
                      <span style={{ color: getStepColor(agreement.current_step) }}>
                        Step {agreement.current_step}/10
                      </span>
                    </div>
                  </div>

                  <div className="card-body">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="label">Property</span>
                        <span className="value">{agreement.property_title}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Customer</span>
                        <span className="value">{agreement.customer_name}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Owner</span>
                        <span className="value">{agreement.owner_name}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Price</span>
                        <span className="value">{agreement.property_price?.toLocaleString()} ETB</span>
                      </div>
                      {agreement.total_commission && (
                        <div className="info-item">
                          <span className="label">Commission</span>
                          <span className="value">{agreement.total_commission?.toLocaleString()} ETB</span>
                        </div>
                      )}
                      <div className="info-item">
                        <span className="label">Created</span>
                        <span className="value">{new Date(agreement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${(agreement.current_step / 10) * 100}%`,
                        background: getStepColor(agreement.current_step)
                      }}></div>
                    </div>
                  </div>

                  <div className="card-actions">
                    {/* Customer Actions */}
                    {user.role === 'user' && agreement.status === 'agreement_generated' && (
                      <>
                        <button className="btn-info" onClick={() => handleAction(agreement, 'edit')}>
                          ✏️ Edit Fields
                        </button>
                        <button className="btn-success" onClick={() => handleAction(agreement, 'submit')}>
                          📤 Submit with Payment
                        </button>
                      </>
                    )}

                    {/* Admin Actions */}
                    {(user.role === 'property_admin' || user.role === 'system_admin') && (
                      <>
                        {agreement.status === 'pending_admin_review' && (
                          <button className="btn-primary" onClick={() => handleAction(agreement, 'forward')}>
                            ➡️ Forward to Owner
                          </button>
                        )}
                        {agreement.status === 'owner_accepted' && (
                          <button className="btn-success" onClick={() => handleAction(agreement, 'generate')}>
                            📄 Generate Agreement
                          </button>
                        )}
                        {agreement.status === 'customer_submitted' && (
                          <button className="btn-warning" onClick={() => handleAction(agreement, 'review')}>
                            👁️ Review Submission
                          </button>
                        )}
                        {agreement.status === 'owner_submitted' && (
                          <button className="btn-primary" onClick={() => handleAction(agreement, 'commission')}>
                            💰 Calculate Commission
                          </button>
                        )}
                      </>
                    )}

                    {/* Owner Actions */}
                    {user.role === 'owner' && (
                      <>
                        {agreement.status === 'waiting_owner_response' && (
                          <>
                            <button className="btn-success" onClick={() => handleAction(agreement, 'decision')}>
                              ✅ Accept
                            </button>
                            <button className="btn-danger" onClick={() => handleAction(agreement, 'decision')}>
                              ❌ Reject
                            </button>
                          </>
                        )}
                        {agreement.status === 'waiting_owner_final_review' && (
                          <button className="btn-primary" onClick={() => handleAction(agreement, 'final')}>
                            ✅ Submit Final Review
                          </button>
                        )}
                      </>
                    )}

                    {/* Final Handshake */}
                    {agreement.status === 'ready_for_handshake' && (
                      <button className="btn-success" onClick={() => handleAction(agreement, 'handshake')}>
                        🤝 Final Handshake
                      </button>
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
              <h2>{modalType === 'details' ? '📋 Agreement Details' : `Step ${selectedAgreement?.current_step || 1}`}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalType === 'details' && selectedAgreement && (
                <div className="details-view">
                  <div className="detail-section">
                    <h3>Agreement Information</h3>
                    <div className="detail-grid">
                      <div><strong>ID:</strong> {selectedAgreement.id}</div>
                      <div><strong>Status:</strong> {getStatusBadge(selectedAgreement.status).label}</div>
                      <div><strong>Step:</strong> {selectedAgreement.current_step}/10</div>
                      <div><strong>Property:</strong> {selectedAgreement.property_title}</div>
                      <div><strong>Customer:</strong> {selectedAgreement.customer_name}</div>
                      <div><strong>Owner:</strong> {selectedAgreement.owner_name}</div>
                      <div><strong>Price:</strong> {selectedAgreement.property_price?.toLocaleString()} ETB</div>
                      {selectedAgreement.total_commission && (
                        <div><strong>Commission:</strong> {selectedAgreement.total_commission?.toLocaleString()} ETB</div>
                      )}
                      <div><strong>Created:</strong> {new Date(selectedAgreement.created_at).toLocaleString()}</div>
                      {selectedAgreement.completed_date && (
                        <div><strong>Completed:</strong> {new Date(selectedAgreement.completed_date).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'request' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Property ID</label>
                    <input type="number" value={formData.property_id || ''} onChange={(e) => setFormData({...formData, property_id: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" />
                  </div>
                </form>
              )}

              {modalType === 'forward' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Admin Notes</label>
                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" />
                  </div>
                </form>
              )}

              {modalType === 'decision' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Decision</label>
                    <select value={formData.decision || ''} onChange={(e) => setFormData({...formData, decision: e.target.value})} required>
                      <option value="">Select decision</option>
                      <option value="accepted">✅ Accept</option>
                      <option value="rejected">❌ Reject</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" />
                  </div>
                </form>
              )}

              {modalType === 'review' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Action</label>
                    <select value={formData.action || ''} onChange={(e) => setFormData({...formData, action: e.target.value})} required>
                      <option value="">Select action</option>
                      <option value="approved">✅ Approve</option>
                      <option value="rejected">❌ Reject</option>
                      <option value="suspended">⏸️ Suspend</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" />
                  </div>
                </form>
              )}

              {modalType === 'edit' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>📋 Agreement Fields (Auto-populated from Profile & Documents)</h3>
                    
                    {agreementFields.length > 0 ? (
                      <div className="fields-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        {agreementFields.map((field) => (
                          <div key={field.id} className="field-item" style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '13px', color: '#64748b', textTransform: 'uppercase' }}>
                              {field.field_name.replace(/_/g, ' ')}
                            </label>
                            {field.is_editable ? (
                              <input
                                type="text"
                                value={formData[field.field_name] || field.field_value || ''}
                                onChange={(e) => setFormData({...formData, [field.field_name]: e.target.value})}
                                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
                              />
                            ) : (
                              <div style={{ padding: '8px', background: 'white', borderRadius: '6px', fontSize: '13px', color: '#1e293b', fontWeight: '500', border: '1px solid #e2e8f0' }}>
                                {field.field_value}
                              </div>
                            )}
                            {!field.is_editable && (
                              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>🔒 Read-only (auto-populated)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center', color: '#0369a1' }}>
                        <p>⏳ Loading agreement fields...</p>
                      </div>
                    )}
                  </div>
                </form>
              )}

              {modalType === 'submit' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select value={formData.payment_method || ''} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} required>
                      <option value="">Select method</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="check">Check</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Payment Amount (ETB)</label>
                    <input type="number" value={formData.payment_amount || ''} onChange={(e) => setFormData({...formData, payment_amount: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Receipt File Path</label>
                    <input type="text" value={formData.receipt_file_path || ''} onChange={(e) => setFormData({...formData, receipt_file_path: e.target.value})} placeholder="/uploads/receipt.pdf" />
                  </div>
                </form>
              )}

              {modalType === 'commission' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Commission Percentage (%)</label>
                    <input type="number" step="0.01" value={formData.commission_percentage || 5.00} onChange={(e) => setFormData({...formData, commission_percentage: parseFloat(e.target.value)})} />
                  </div>
                  <div className="info-box">
                    <p><strong>Property Price:</strong> {selectedAgreement?.property_price?.toLocaleString()} ETB</p>
                    <p><strong>Commission Rate:</strong> {formData.commission_percentage || 5}%</p>
                    <p><strong>Customer Commission:</strong> {((selectedAgreement?.property_price || 0) * (formData.commission_percentage || 5) / 100).toLocaleString()} ETB</p>
                    <p><strong>Owner Commission:</strong> {((selectedAgreement?.property_price || 0) * (formData.commission_percentage || 5) / 100).toLocaleString()} ETB</p>
                  </div>
                </form>
              )}

              {modalType === 'final' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Final Notes</label>
                    <textarea value={formData.notes || ''} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="3" />
                  </div>
                </form>
              )}

              {modalType === 'handshake' && (
                <div className="handshake-info">
                  <p>🤝 Ready for final handshake!</p>
                  <p>Both parties will sign to complete the transaction.</p>
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

export default AgreementWorkflow;
