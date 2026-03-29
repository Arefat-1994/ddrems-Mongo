import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AgreementManagement.css';
import PageHeader from './PageHeader';

const AgreementManagement = ({ user, onLogout }) => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgreement, setSelectedAgreement] = useState(null);
  const [selectedAgreementDetails, setSelectedAgreementDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [propertyDocuments, setPropertyDocuments] = useState([]);
  const [agreementDocuments, setAgreementDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  useEffect(() => {
    fetchAgreements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAgreements = async () => {
    try {
      setLoading(true);
      let endpoint = '';

      if (user.role === 'user') {
        endpoint = `http://localhost:5000/api/agreement-requests/customer/${user.id}`;
      } else if (user.role === 'property_admin' || user.role === 'system_admin') {
        endpoint = `http://localhost:5000/api/agreement-requests/admin/pending`;
      } else {
        endpoint = `http://localhost:5000/api/agreement-requests/customer/${user.id}`;
      }

      const response = await axios.get(endpoint);
      setAgreements(response.data || []);
    } catch (error) {
      console.error('Error fetching agreements:', error);
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgreementDetails = async (agreement) => {
    try {
      // Fetch customer profile
      const customerRes = await axios.get(`http://localhost:5000/api/profiles/customer/${agreement.customer_id}`).catch(() => null);
      const customerProfile = customerRes?.data || {};

      // Fetch owner profile
      const ownerRes = await axios.get(`http://localhost:5000/api/profiles/owner/${agreement.owner_id}`).catch(() => null);
      const ownerProfile = ownerRes?.data || {};

      // Fetch property documents
      const docsRes = await axios.get(`http://localhost:5000/api/documents/property/${agreement.property_id}`).catch(() => null);
      const docs = docsRes?.data || [];
      setPropertyDocuments(docs);

      // Fetch agreement documents
      const agreementDocsRes = await axios.get(`http://localhost:5000/api/documents/agreement/${agreement.id}`).catch(() => null);
      const agDocs = agreementDocsRes?.data || [];
      setAgreementDocuments(agDocs);

      setSelectedAgreementDetails({
        ...agreement,
        customerProfile,
        ownerProfile
      });
    } catch (error) {
      console.error('Error fetching agreement details:', error);
      setSelectedAgreementDetails(agreement);
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const getDocumentIcon = (documentType) => {
    const icons = {
      'title_deed': '📜',
      'survey_plan': '📐',
      'tax_clearance': '✅',
      'building_permit': '🏗️',
      'other': '📄',
      'initial': '📝',
      'customer_edited': '✏️',
      'final': '✓'
    };
    return icons[documentType] || '📄';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { emoji: '⏳', label: 'Pending', color: '#f59e0b' },
      'pending_admin_review': { emoji: '⏳', label: 'Pending Admin Review', color: '#f59e0b' },
      'forwarded': { emoji: '➡️', label: 'Forwarded to Owner', color: '#8b5cf6' },
      'owner_accepted': { emoji: '✅', label: 'Accepted', color: '#10b981' },
      'accepted': { emoji: '✅', label: 'Accepted', color: '#10b981' },
      'owner_rejected': { emoji: '❌', label: 'Rejected', color: '#ef4444' },
      'rejected': { emoji: '❌', label: 'Rejected', color: '#ef4444' },
      'completed': { emoji: '🎉', label: 'Completed', color: '#10b981' }
    };
    return badges[status] || { emoji: '❓', label: status, color: '#6b7280' };
  };

  const handleAction = (agreement, type) => {
    setSelectedAgreement(agreement);
    setModalType(type);
    setFormData({});
    setShowModal(true);
  };

  const handleViewDetails = async (agreement) => {
    await fetchAgreementDetails(agreement);
    setModalType('details');
    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedAgreement) return;

    setActionLoading(true);
    try {
      let endpoint = '';
      let method = 'POST';
      let data = {};

      switch (modalType) {
        case 'generate':
          endpoint = `/api/agreement-requests/${selectedAgreement.id}/generate`;
          data = {
            admin_id: user.id,
            template_id: formData.template_id || 1
          };
          break;

        case 'payment':
          endpoint = `/api/agreement-requests/${selectedAgreement.id}/submit-payment`;
          data = {
            customer_id: user.id,
            payment_method: formData.payment_method,
            payment_amount: formData.payment_amount,
            receipt_file_path: formData.receipt_file_path
          };
          break;

        case 'upload_receipt':
          endpoint = `/api/agreement-requests/${selectedAgreement.id}/upload-receipt`;
          data = {
            user_id: user.id,
            receipt_file_path: formData.receipt_file_path,
            receipt_file_name: formData.receipt_file_name
          };
          break;

        case 'send_agreement':
          endpoint = `/api/agreement-requests/${selectedAgreement.id}/send-agreement`;
          data = {
            admin_id: user.id,
            recipient_id: formData.recipient_id
          };
          break;

        case 'notify':
          endpoint = `/api/agreement-requests/${selectedAgreement.id}/notify`;
          data = {
            user_id: user.id,
            notification_message: formData.notification_message
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

  return (
    <div className="agreement-management-page">
      <PageHeader
        title="Agreement Management"
        subtitle="Manage all property agreements and requests"
        user={user}
        onLogout={onLogout}
      />

      <div className="management-container">
        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            📋 All ({agreements.length})
          </button>
          <button 
            className={`tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            ⏳ Pending ({agreements.filter(a => a.status.includes('pending')).length})
          </button>
          <button 
            className={`tab ${filter === 'accepted' ? 'active' : ''}`}
            onClick={() => setFilter('accepted')}
          >
            ✅ Accepted ({agreements.filter(a => a.status.includes('accepted')).length})
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
          <div className="agreements-grid">
            {filteredAgreements.map((agreement) => {
              const badge = getStatusBadge(agreement.status);
              return (
                <div key={agreement.id} className="agreement-card">
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="header-left">
                      <h3>Agreement #{agreement.id}</h3>
                      <span className="status-badge" style={{ background: badge.color + '20', color: badge.color }}>
                        {badge.emoji} {badge.label}
                      </span>
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
                        <span className="label">Customer</span>
                        <span className="value">{agreement.customer_name || 'N/A'} (ID: {agreement.customer_id})</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Owner</span>
                        <span className="value">{agreement.owner_name || 'N/A'} (ID: {agreement.owner_id})</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Location</span>
                        <span className="value">{agreement.property_location}</span>
                      </div>
                      {agreement.request_message && (
                        <div className="info-item full-width">
                          <span className="label">Message</span>
                          <span className="value">{agreement.request_message}</span>
                        </div>
                      )}
                      <div className="info-item">
                        <span className="label">Created</span>
                        <span className="value">{new Date(agreement.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="card-actions">
                    {/* Customer Actions */}
                    {user.role === 'user' && (agreement.status === 'pending' || agreement.status === 'pending_admin_review') && (
                      <>
                        <button className="btn-info" onClick={() => handleAction(agreement, 'payment')}>
                          💳 Submit Payment
                        </button>
                        <button className="btn-warning" onClick={() => handleAction(agreement, 'upload_receipt')}>
                          📄 Upload Receipt
                        </button>
                      </>
                    )}

                    {/* Admin Actions */}
                    {(user.role === 'property_admin' || user.role === 'system_admin') && (
                      <>
                        {(agreement.status === 'pending' || agreement.status === 'pending_admin_review') && (
                          <>
                            <button className="btn-success" onClick={() => handleAction(agreement, 'generate')}>
                              📄 Generate Agreement
                            </button>
                            <button className="btn-primary" onClick={() => handleAction(agreement, 'send_agreement')}>
                              📧 Send Agreement
                            </button>
                          </>
                        )}
                        <button className="btn-info" onClick={() => handleAction(agreement, 'notify')}>
                          🔔 Send Notification
                        </button>
                      </>
                    )}

                    {/* View Details */}
                    <button className="btn-secondary" onClick={() => handleViewDetails(agreement)}>
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
                {modalType === 'details' && '📋 Agreement Details'}
                {modalType === 'generate' && '📄 Generate Agreement'}
                {modalType === 'payment' && '💳 Submit Payment'}
                {modalType === 'upload_receipt' && '📄 Upload Receipt'}
                {modalType === 'send_agreement' && '📧 Send Agreement'}
                {modalType === 'notify' && '🔔 Send Notification'}
              </h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {modalType === 'details' && selectedAgreementDetails && (
                <div className="details-view">
                  {/* Agreement Information */}
                  <div className="detail-section">
                    <h3>📋 Agreement Information</h3>
                    <div className="detail-grid">
                      <div><strong>Agreement ID:</strong> {selectedAgreementDetails.id}</div>
                      <div><strong>Status:</strong> {getStatusBadge(selectedAgreementDetails.status).label}</div>
                      <div><strong>Property:</strong> {selectedAgreementDetails.property_title}</div>
                      <div><strong>Location:</strong> {selectedAgreementDetails.property_location}</div>
                      <div><strong>Created:</strong> {new Date(selectedAgreementDetails.created_at).toLocaleString()}</div>
                      {selectedAgreementDetails.request_message && (
                        <div><strong>Message:</strong> {selectedAgreementDetails.request_message}</div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="detail-section">
                    <h3>👤 Customer Information</h3>
                    <div className="detail-grid">
                      <div><strong>Full Name:</strong> {selectedAgreementDetails.customer_name || 'N/A'}</div>
                      <div><strong>User ID:</strong> {selectedAgreementDetails.customer_id}</div>
                      {selectedAgreementDetails.customerProfile && (
                        <>
                          <div><strong>Email:</strong> {selectedAgreementDetails.customerProfile.email || 'N/A'}</div>
                          <div><strong>Phone:</strong> {selectedAgreementDetails.customerProfile.phone || 'N/A'}</div>
                          <div><strong>Address:</strong> {selectedAgreementDetails.customerProfile.address || 'N/A'}</div>
                          <div><strong>ID Document:</strong> {selectedAgreementDetails.customerProfile.id_document || 'N/A'}</div>
                          <div><strong>Occupation:</strong> {selectedAgreementDetails.customerProfile.occupation || 'N/A'}</div>
                          <div><strong>Income:</strong> {selectedAgreementDetails.customerProfile.income ? `${selectedAgreementDetails.customerProfile.income} ETB` : 'N/A'}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Owner Information */}
                  <div className="detail-section">
                    <h3>🏠 Owner Information</h3>
                    <div className="detail-grid">
                      <div><strong>Full Name:</strong> {selectedAgreementDetails.owner_name || 'N/A'}</div>
                      <div><strong>User ID:</strong> {selectedAgreementDetails.owner_id}</div>
                      {selectedAgreementDetails.ownerProfile && (
                        <>
                          <div><strong>Email:</strong> {selectedAgreementDetails.ownerProfile.email || 'N/A'}</div>
                          <div><strong>Phone:</strong> {selectedAgreementDetails.ownerProfile.phone || 'N/A'}</div>
                          <div><strong>Address:</strong> {selectedAgreementDetails.ownerProfile.address || 'N/A'}</div>
                          <div><strong>ID Document:</strong> {selectedAgreementDetails.ownerProfile.id_document || 'N/A'}</div>
                          <div><strong>Bank Account:</strong> {selectedAgreementDetails.ownerProfile.bank_account || 'N/A'}</div>
                          <div><strong>Tax ID:</strong> {selectedAgreementDetails.ownerProfile.tax_id || 'N/A'}</div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Property Information */}
                  <div className="detail-section">
                    <h3>🏘️ Property Information</h3>
                    <div className="detail-grid">
                      <div><strong>Title:</strong> {selectedAgreementDetails.property_title}</div>
                      <div><strong>Location:</strong> {selectedAgreementDetails.property_location}</div>
                      <div><strong>Type:</strong> {selectedAgreementDetails.property_type || 'N/A'}</div>
                      <div><strong>Price:</strong> {selectedAgreementDetails.property_price ? `${Number(selectedAgreementDetails.property_price).toLocaleString()} ETB` : 'N/A'}</div>
                    </div>
                  </div>

                  {/* Property Documents */}
                  {propertyDocuments.length > 0 && (
                    <div className="detail-section">
                      <h3>📄 Property Documents</h3>
                      <div className="documents-list">
                        {propertyDocuments.map((doc) => (
                          <div key={doc.id} className="document-item">
                            <span className="doc-icon">{getDocumentIcon(doc.document_type)}</span>
                            <span className="doc-name">{doc.document_name}</span>
                            <span className="doc-type">({doc.document_type})</span>
                            <button 
                              className="btn-view-doc"
                              onClick={() => handleViewDocument(doc)}
                              title="View document"
                            >
                              👁️ View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agreement Documents */}
                  {agreementDocuments.length > 0 && (
                    <div className="detail-section">
                      <h3>📋 Agreement Documents</h3>
                      <div className="documents-list">
                        {agreementDocuments.map((doc) => (
                          <div key={doc.id} className="document-item">
                            <span className="doc-icon">{getDocumentIcon(doc.document_type)}</span>
                            <span className="doc-name">Agreement v{doc.version}</span>
                            <span className="doc-type">({doc.document_type})</span>
                            <button 
                              className="btn-view-doc"
                              onClick={() => handleViewDocument(doc)}
                              title="View document"
                            >
                              👁️ View
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalType === 'generate' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Template ID</label>
                    <input type="number" value={formData.template_id || 1} onChange={(e) => setFormData({...formData, template_id: e.target.value})} />
                  </div>
                </form>
              )}

              {modalType === 'payment' && (
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

              {modalType === 'upload_receipt' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Receipt File Path</label>
                    <input type="text" value={formData.receipt_file_path || ''} onChange={(e) => setFormData({...formData, receipt_file_path: e.target.value})} placeholder="/uploads/receipt.pdf" required />
                  </div>
                  <div className="form-group">
                    <label>Receipt File Name</label>
                    <input type="text" value={formData.receipt_file_name || ''} onChange={(e) => setFormData({...formData, receipt_file_name: e.target.value})} placeholder="receipt.pdf" />
                  </div>
                </form>
              )}

              {modalType === 'send_agreement' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Send To</label>
                    <select value={formData.recipient_id || ''} onChange={(e) => setFormData({...formData, recipient_id: e.target.value})} required>
                      <option value="">Select recipient</option>
                      <option value={selectedAgreement.customer_id}>Customer - {selectedAgreement.customer_name}</option>
                      <option value={selectedAgreement.owner_id}>Owner - {selectedAgreement.owner_name}</option>
                    </select>
                  </div>
                </form>
              )}

              {modalType === 'notify' && (
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitAction(); }}>
                  <div className="form-group">
                    <label>Notification Message</label>
                    <textarea 
                      value={formData.notification_message || ''} 
                      onChange={(e) => setFormData({...formData, notification_message: e.target.value})} 
                      rows="4"
                      placeholder="Enter notification message..."
                      required
                    />
                  </div>
                </form>
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

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedDocument && (
        <div className="modal-overlay" onClick={() => setShowDocumentViewer(false)}>
          <div className="modal-content document-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👁️ Document Viewer</h2>
              <button className="close-btn" onClick={() => setShowDocumentViewer(false)}>✕</button>
            </div>

            <div className="modal-body document-body">
              <div className="document-info">
                <div><strong>Document Name:</strong> {selectedDocument.document_name || `Agreement v${selectedDocument.version}`}</div>
                <div><strong>Type:</strong> {selectedDocument.document_type}</div>
                <div><strong>Uploaded:</strong> {new Date(selectedDocument.uploaded_at || selectedDocument.generated_date).toLocaleString()}</div>
              </div>

              <div className="document-preview">
                {selectedDocument.document_path ? (
                  <>
                    {selectedDocument.document_path.match(/\.(pdf|doc|docx)$/i) ? (
                      <div className="document-file-preview">
                        <p>📄 Document File</p>
                        <p>{selectedDocument.document_path}</p>
                        <a href={`http://localhost:5000${selectedDocument.document_path}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
                          📥 Download
                        </a>
                      </div>
                    ) : selectedDocument.document_path.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <div className="document-image-preview">
                        <img src={`http://localhost:5000${selectedDocument.document_path}`} alt="Document" />
                      </div>
                    ) : (
                      <div className="document-file-preview">
                        <p>📎 File: {selectedDocument.document_path}</p>
                        <a href={`http://localhost:5000${selectedDocument.document_path}`} target="_blank" rel="noopener noreferrer" className="btn-primary">
                          📥 Open File
                        </a>
                      </div>
                    )}
                  </>
                ) : selectedDocument.document_content ? (
                  <div className="document-content-preview">
                    <pre>{JSON.stringify(JSON.parse(selectedDocument.document_content), null, 2)}</pre>
                  </div>
                ) : (
                  <div className="document-empty">
                    <p>No document content available</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDocumentViewer(false)}>Close</button>
              {selectedDocument.document_path && (
                <a href={`http://localhost:5000${selectedDocument.document_path}`} download className="btn-primary">
                  📥 Download
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgreementManagement;
