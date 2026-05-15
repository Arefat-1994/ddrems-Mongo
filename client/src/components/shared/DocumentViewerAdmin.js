import React, { useState, useEffect } from 'react';
import './DocumentViewer.css';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

const DocumentViewerAdmin = ({ propertyId, property, userId, userRole, onVerificationAction }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [accessKey, setAccessKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [viewedDocument, setViewedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [showAccessKeyForDoc, setShowAccessKeyForDoc] = useState(null);


  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/property-documents/property/${propertyId}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const verifyAndView = async () => {
    if (!accessKey.trim()) {
      alert('Please enter an access key');
      return;
    }

    setVerifying(true);
    try {
      const response = await axios.post(`${API_BASE}/property-documents/verify-access`, {
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


  const handleToggleLock = async (doc) => {
    const action = doc.is_locked ? 'unlock' : 'lock';
    if (!window.confirm(`Are you sure you want to ${action} this document?`)) return;

    try {
      await axios.put(`${API_BASE}/property-documents/${doc.id}/lock`, {
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
      const response = await axios.put(`${API_BASE}/property-documents/${doc.id}/regenerate-key`);
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
      await axios.delete(`${API_BASE}/property-documents/${doc.id}`);
      alert('Document deleted successfully!');
      fetchDocuments(); // Refresh the documents list
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };



  const handleDeleteProperty = async () => {
    if (!window.confirm('PERMANENTLY DELETE this property? This action cannot be undone!')) return;

    try {
      await axios.delete(`${API_BASE}/properties/${propertyId}`);
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
    return <div className="doc-viewer-loading" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading documents...</div>;
  }

  return (
    <div className="document-accordion" style={{ margin: '20px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
      <div 
        className="accordion-header" 
        onClick={() => setIsAccordionOpen(!isAccordionOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 20px',
          background: '#f8fafc',
          cursor: 'pointer',
          borderBottom: isAccordionOpen ? '1px solid #e2e8f0' : 'none'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '15px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📄 PROPERTY DOCUMENTS
        </h3>
        <button 
          className="btn-primary" 
          style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px' }}
          onClick={(e) => { e.stopPropagation(); setIsAccordionOpen(!isAccordionOpen); }}
        >
          {isAccordionOpen ? '▲ Hide' : '▼ Docs'}
        </button>
      </div>

      {isAccordionOpen && (
        <div className="accordion-content" style={{ padding: '20px', background: '#fff' }}>
          <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b' }}>📄 PROPERTY DOCUMENTS ({documents.length})</h4>
          
          {documents.length === 0 ? (
            <div className="doc-viewer-empty" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <p>No documents uploaded for this property.</p>
            </div>
          ) : (
            <div className="documents-list" style={{ display: 'grid', gap: '15px' }}>
              {documents.map(doc => (
                <div key={doc.id} className="document-card" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px 20px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  background: '#fff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '24px' }}>📋</div>
                    <div>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px', color: '#1e293b' }}>{doc.document_name}</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#94a3b8' }}>{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => openKeyModal(doc)}
                      style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      👁️ View
                    </button>
                    {userRole !== 'system_admin' && (
                      <button
                        onClick={() => handleRegenerateKey(doc)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        🔑 Regen Key
                      </button>
                    )}
                    {userRole !== 'system_admin' && (
                      <button
                        onClick={() => setShowAccessKeyForDoc(doc)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '12px', padding: '0 10px' }}
                      >
                        <span style={{ fontSize: '16px', marginBottom: '2px' }}>📋</span>
                        Show Key
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleLock(doc)}
                      style={{ background: '#ffedd5', border: 'none', color: '#ea580c', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
                      title={doc.is_locked ? "Unlock" : "Lock"}
                    >
                      {doc.is_locked ? "🔒" : "🔓"}
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      style={{ background: '#fee2e2', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              flexWrap: 'wrap',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: property?.status === 'active' ? '#dcfce7' : property?.status === 'pending' ? '#fef3c7' : '#fee2e2',
                  color: property?.status === 'active' ? '#166534' : property?.status === 'pending' ? '#92400e' : '#991b1b',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: `1px solid ${property?.status === 'active' ? '#bbf7d0' : property?.status === 'pending' ? '#fde68a' : '#fecaca'}`
                }}>
                  Status: {property?.status.toUpperCase()}
                </span>
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
                  onClick={() => { setShowDocumentModal(false); }}
                  style={{ padding: '10px 20px' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show Key Popup Modal */}
      {showAccessKeyForDoc && (
        <div className="modal-overlay" onClick={() => setShowAccessKeyForDoc(null)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0 }}>🔐 Access Key</h3>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
              For document: <strong>{showAccessKeyForDoc.document_name}</strong>
            </p>
            <div style={{ 
              background: '#f8fafc', 
              padding: '20px', 
              borderRadius: '8px', 
              border: '2px dashed #cbd5e1',
              fontFamily: 'monospace',
              fontSize: '24px',
              letterSpacing: '2px',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}>
              {showAccessKeyForDoc.access_key}
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => {
                navigator.clipboard.writeText(showAccessKeyForDoc.access_key);
                alert('Copied to clipboard!');
                setShowAccessKeyForDoc(null);
              }}
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewerAdmin;
