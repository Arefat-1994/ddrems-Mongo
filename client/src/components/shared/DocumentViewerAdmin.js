import React, { useState, useEffect } from 'react';
import './DocumentViewer.css';
import axios from 'axios';

const DocumentViewerAdmin = ({ propertyId, property, userId, onVerificationAction }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [accessKey, setAccessKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [viewedDocument, setViewedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/property-documents/property/${propertyId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propertyId) {
      fetchDocuments();
    }
  }, [propertyId]);

  const verifyAndView = async () => {
    if (!accessKey.trim()) {
      alert('Please enter an access key');
      return;
    }

    setVerifying(true);
    try {
      const response = await axios.post('http://localhost:5000/api/property-documents/verify-access', {
        document_id: selectedDoc.id,
        access_key: accessKey.trim().toUpperCase()
      });

      // Set the viewed document
      setViewedDocument(response.data);
      setShowKeyModal(false);
      setShowDocumentModal(true);
      setAccessKey('');
    } catch (error) {
      if (error.response?.status === 401) {
        alert('Invalid access key. Please check and try again.');
      } else if (error.response?.status === 403) {
        alert('This document is currently locked by the owner.');
      } else {
        alert('Failed to verify access key');
      }
    } finally {
      setVerifying(false);
    }
  };

  const openKeyModal = (doc) => {
    setSelectedDoc(doc);
    setShowKeyModal(true);
    setAccessKey('');
  };

  const handleSendKey = async (doc) => {
    if (!property) {
      alert('Property information not available');
      return;
    }

    const ownerName = property.owner_name || property.broker_name || 'Property Owner';
    const confirmMessage = `Send the access key for "${doc.document_name}" to ${ownerName}?\n\nAccess Key: ${doc.access_key}\n\nThis will help the owner share the document with customers.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // For now, we'll just show the key in an alert
      // In a real implementation, this could send an email or notification
      alert(`✅ Access key sent to ${ownerName}!\n\nDocument: ${doc.document_name}\nAccess Key: ${doc.access_key}\n\nThe owner can now share this key with customers who request document access.`);
    } catch (error) {
      console.error('Error sending key:', error);
      alert('Failed to send access key');
    }
  };

  const handleToggleLock = async (doc) => {
    const action = doc.is_locked ? 'unlock' : 'lock';
    if (!window.confirm(`Are you sure you want to ${action} this document?`)) return;

    try {
      await axios.put(`http://localhost:5000/api/property-documents/${doc.id}/lock`, {
        is_locked: !doc.is_locked
      });
      alert(`Document ${action}ed successfully!`);
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert(`Failed to ${action} document`);
    }
  };

  const handleRegenerateKey = async (doc) => {
    if (!window.confirm('Regenerate access key? The old key will no longer work.')) return;

    try {
      const response = await axios.put(`http://localhost:5000/api/property-documents/${doc.id}/regenerate-key`);
      alert(`✅ Access key regenerated!\n\nNew Key: ${response.data.access_key}\n\nMake sure to send this new key to the property owner.`);
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      console.error('Error regenerating key:', error);
      alert('Failed to regenerate access key');
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!window.confirm('PERMANENTLY DELETE this document? This action cannot be undone!')) return;

    try {
      await axios.delete(`http://localhost:5000/api/property-documents/${doc.id}`);
      alert('Document deleted successfully!');
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleVerificationAction = async (action) => {
    const confirmMessages = {
      approved: 'Approve this property? It will become active and visible to customers.',
      suspended: 'Suspend this property? It will be hidden from customers.',
      rejected: 'Reject this property? It will be deactivated and hidden.'
    };

    if (!window.confirm(confirmMessages[action])) return;

    try {
      await axios.put(`http://localhost:5000/api/properties/${propertyId}/verify`, {
        status: action,
        verified_by: userId,
        notes: `${action} after document review by admin`
      });
      
      alert(`Property ${action} successfully!`);
      setShowDocumentModal(false);
      
      if (onVerificationAction) {
        onVerificationAction();
      }
    } catch (error) {
      console.error(`Error: ${action}`, error);
      alert(`Failed to ${action} property`);
    }
  };

  const handleDeleteProperty = async () => {
    if (!window.confirm('PERMANENTLY DELETE this property? This action cannot be undone!')) return;

    try {
      await axios.delete(`http://localhost:5000/api/properties/${propertyId}`);
      alert('Property deleted permanently.');
      setShowDocumentModal(false);
      
      if (onVerificationAction) {
        onVerificationAction();
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property');
    }
  };

  const getDocumentIcon = (type) => {
    const icons = {
      title_deed: '📜',
      survey_plan: '🗺️',
      tax_clearance: '💳',
      building_permit: '🏗️',
      ownership_certificate: '📋',
      other: '📄'
    };
    return icons[type] || '📄';
  };

  if (loading) {
    return <div className="doc-viewer-loading">Loading documents...</div>;
  }

  return (
    <div className="document-viewer">
      <div className="doc-viewer-header">
        <h3>📄 Property Documents ({documents.length})</h3>
      </div>

      {documents.length === 0 ? (
        <div className="doc-viewer-empty">
          <div className="empty-icon">📄</div>
          <p>No documents uploaded for this property</p>
          <span>Owner needs to upload documents for verification</span>
        </div>
      ) : (
        <div className="documents-list">
          {documents.map(doc => (
            <div key={doc.id} className="document-card">
              <div className="doc-icon">
                {getDocumentIcon(doc.document_type)}
              </div>
              <div className="doc-info">
                <h4>{doc.document_name}</h4>
                <p>{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                {doc.is_locked && <span className="doc-locked-badge">🔒 Locked</span>}
              </div>
              <div className="doc-actions">
                {doc.is_locked ? (
                  <span className="doc-locked">🔒 Locked by Owner</span>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-view-doc"
                      onClick={() => openKeyModal(doc)}
                    >
                      👁️ View Document
                    </button>
                    <button
                      className="btn-send-key"
                      onClick={() => handleSendKey(doc)}
                      title="Send access key to property owner"
                    >
                      📤 Send Key
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  <button
                    className="btn-icon-small"
                    onClick={() => handleToggleLock(doc)}
                    title={doc.is_locked ? 'Unlock document' : 'Lock document'}
                  >
                    {doc.is_locked ? '🔓' : '🔒'}
                  </button>
                  <button
                    className="btn-icon-small"
                    onClick={() => handleRegenerateKey(doc)}
                    title="Regenerate access key"
                  >
                    🔑
                  </button>
                  <button
                    className="btn-icon-small danger"
                    onClick={() => handleDeleteDocument(doc)}
                    title="Delete document"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Access Key Entry Modal */}
      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Enter Access Key</h2>
              <button className="close-btn" onClick={() => setShowKeyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="key-instruction">
                Enter the access key to view and verify this document.
              </p>
              <div className="key-input-group">
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character key"
                  maxLength="8"
                  className="key-input"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && accessKey.trim()) {
                      verifyAndView();
                    }
                  }}
                />
              </div>
              <div className="document-preview">
                <div className="doc-icon-large">{getDocumentIcon(selectedDoc?.document_type)}</div>
                <h4>{selectedDoc?.document_name}</h4>
                <p>{selectedDoc?.document_type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowKeyModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={verifyAndView}
                disabled={verifying || !accessKey.trim()}
              >
                {verifying ? '⏳ Verifying...' : '✓ Verify & View Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal with Verification Actions */}
      {showDocumentModal && viewedDocument && (
        <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <div>
                <h2>📄 {viewedDocument.document_name}</h2>
                <p style={{ margin: '5px 0', color: '#64748b', fontSize: '14px' }}>
                  {viewedDocument.document_type.replace('_', ' ').toUpperCase()} • 
                  Uploaded: {new Date(viewedDocument.created_at).toLocaleDateString()}
                </p>
              </div>
              <button className="close-btn" onClick={() => setShowDocumentModal(false)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ padding: '0', maxHeight: 'calc(90vh - 200px)', overflow: 'auto' }}>
              {/* Property Info Bar */}
              <div style={{ 
                padding: '15px 20px', 
                background: '#f8fafc', 
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{property?.title}</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                    📍 {property?.location} • 💰 {property?.price ? (property.price / 1000000).toFixed(2) + 'M ETB' : 'N/A'}
                  </p>
                </div>
                <span className="status-badge" style={{ 
                  background: property?.status === 'active' ? '#10b981' : 
                             property?.status === 'pending' ? '#f59e0b' : 
                             property?.status === 'suspended' ? '#f97316' : '#6b7280',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {property?.status || 'unknown'}
                </span>
              </div>

              {/* Document Display */}
              <div style={{ padding: '20px', background: '#fff' }}>
                {viewedDocument.document_url.startsWith('data:application/pdf') ? (
                  <iframe
                    src={viewedDocument.document_url}
                    style={{ width: '100%', height: '600px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    title={viewedDocument.document_name}
                  />
                ) : viewedDocument.document_url.startsWith('data:image') ? (
                  <div style={{ textAlign: 'center' }}>
                    <img
                      src={viewedDocument.document_url}
                      alt={viewedDocument.document_name}
                      style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📄</div>
                    <p>Document type not supported for inline viewing</p>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = viewedDocument.document_url;
                        link.download = viewedDocument.document_name;
                        link.click();
                      }}
                      style={{ marginTop: '20px' }}
                    >
                      📥 Download Document
                    </button>
                  </div>
                )}
              </div>

              {/* Document Details */}
              <div style={{ 
                padding: '15px 20px', 
                background: '#f8fafc', 
                borderTop: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#64748b' }}>Document ID:</strong>
                    <p style={{ margin: '5px 0 0 0' }}>{viewedDocument.id}</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#64748b' }}>Access Key:</strong>
                    <p style={{ margin: '5px 0 0 0', fontFamily: 'monospace' }}>{viewedDocument.access_key}</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#64748b' }}>Upload Date:</strong>
                    <p style={{ margin: '5px 0 0 0' }}>{new Date(viewedDocument.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <strong style={{ fontSize: '12px', color: '#64748b' }}>Status:</strong>
                    <p style={{ margin: '5px 0 0 0' }}>{viewedDocument.is_locked ? '🔒 Locked' : '🔓 Unlocked'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Actions */}
            <div className="modal-actions" style={{ 
              padding: '20px', 
              borderTop: '2px solid #e2e8f0',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-success" 
                  onClick={() => handleVerificationAction('approved')}
                  style={{ padding: '10px 20px' }}
                >
                  ✅ Approve Property
                </button>
                <button 
                  className="btn-warning" 
                  onClick={() => handleVerificationAction('suspended')}
                  style={{ padding: '10px 20px' }}
                >
                  ⏸️ Suspend Property
                </button>
                <button 
                  className="btn-danger" 
                  onClick={() => handleVerificationAction('rejected')}
                  style={{ padding: '10px 20px' }}
                >
                  ❌ Reject Property
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn-danger" 
                  onClick={handleDeleteProperty}
                  style={{ padding: '10px 20px', background: '#dc2626' }}
                >
                  🗑️ Delete Property
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => setShowDocumentModal(false)}
                  style={{ padding: '10px 20px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewerAdmin;
