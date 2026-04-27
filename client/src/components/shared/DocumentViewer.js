import React, { useState } from 'react';
import './DocumentViewer.css';
import axios from 'axios';

const API_BASE = `http://${window.location.hostname}:5000/api`;

const DocumentViewer = ({ propertyId, userId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [accessKey, setAccessKey] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [viewedDocument, setViewedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [enteredKey, setEnteredKey] = useState('');

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

  const requestAccess = async () => {
    try {
      await axios.post(`${API_BASE}/document-access/request`, {
        property_id: propertyId,
        user_id: userId
      });
      alert('Access request sent! You will receive the access key once approved.');
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert('Failed to send access request');
      }
    }
  };

  const verifyAndView = async () => {
    if (!accessKey.trim()) {
      alert('Please enter an access key');
      return;
    }

    const normalizedKey = accessKey.trim().toUpperCase();
    setVerifying(true);
    try {
      const response = await axios.post(`${API_BASE}/property-documents/verify-access`, {
        document_id: selectedDoc.id,
        access_key: normalizedKey
      });

      // Show document in modal instead of new tab
      setViewedDocument(response.data);
      setEnteredKey(normalizedKey);
      setShowDocumentModal(true);
      setShowKeyModal(false);
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

  React.useEffect(() => {
    if (propertyId) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const openKeyModal = (doc) => {
    setSelectedDoc(doc);
    setShowKeyModal(true);
    setAccessKey('');
    setEnteredKey('');
  };

  if (loading) {
    return <div className="doc-viewer-loading">Loading documents...</div>;
  }

  return (
    <div className="document-viewer">
      <div className="doc-viewer-header">
        <h3>📄 Property Documents</h3>
        <button className="btn-request-access" onClick={requestAccess}>
          🔑 Request Access
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="doc-viewer-empty">
          <div className="empty-icon">📄</div>
          <p>No documents available</p>
          <span>Request access from the property owner</span>
        </div>
      ) : (
        <div className="documents-list">
          {documents.map(doc => (
            <div key={doc.id} className="document-card">
              <div className="doc-icon">
                {doc.document_type === 'title_deed' && '📜'}
                {doc.document_type === 'survey_plan' && '🗺️'}
                {doc.document_type === 'tax_clearance' && '💳'}
                {doc.document_type === 'building_permit' && '🏗️'}
                {doc.document_type === 'ownership_certificate' && '📋'}
                {doc.document_type === 'other' && '📄'}
              </div>
              <div className="doc-info">
                <h4>{doc.document_name}</h4>
                <p>{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <div className="doc-actions">
                {doc.is_locked ? (
                  <span className="doc-locked">🔒 Locked</span>
                ) : (
                  <button
                    className="btn-view-doc"
                    onClick={() => openKeyModal(doc)}
                  >
                    🔑 Enter Key to View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showKeyModal && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Enter Access Key</h2>
              <button className="close-btn" onClick={() => setShowKeyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="key-instruction">
                Enter the access key provided by the property owner to view this document.
              </p>
              <div className="key-input-group">
                <input
                  type="text"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  maxLength="8"
                  className="key-input"
                  autoFocus
                />
              </div>
              <div className="document-preview">
                <div className="doc-icon-large">📄</div>
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
                {verifying ? '⏳ Verifying...' : '✓ Verify & View'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDocumentModal && viewedDocument && (
        <div className="modal-overlay" onClick={() => setShowDocumentModal(false)}>
          <div className="modal-content extra-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Document Approved</h2>
              <button className="close-btn" onClick={() => setShowDocumentModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ minHeight: '70vh' }}>
              <p>Document: <strong>{viewedDocument.document_name}</strong></p>
              <p>Type: <strong>{viewedDocument.document_type}</strong></p>
              <div style={{ margin: '20px 0', textAlign: 'center' }}>
                {viewedDocument.document_url.startsWith('data:image') ? (
                  <img
                    src={viewedDocument.document_url}
                    alt={viewedDocument.document_name}
                    className="doc-preview-image"
                    style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                ) : (
                  <iframe
                    title="Document Viewer"
                    src={viewedDocument.document_url}
                    style={{ width: '100%', height: '60vh', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  ></iframe>
                )}
              </div>
              <p className="key-bottom-display" style={{ marginTop: '15px', color: '#16a34a', fontWeight: 'bold' }}>
                🔑 Access Key Verified: {enteredKey || viewedDocument.access_key || 'N/A'}
              </p>
              <button
                className="btn-secondary"
                onClick={async () => {
                  try {
                    const authenticity = await axios.get(`${API_BASE}/property-documents/${selectedDoc.id}/authenticate`);
                    alert(`🔍 Document authenticity check result: ${authenticity.data.status}.\n${authenticity.data.comments}`);
                  } catch (error) {
                    console.error('Authenticity check failed', error);
                    alert('Failed to verify document authenticity');
                  }
                }}
              >Scan Document Originality</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
