import React, { useState } from 'react';
import './DocumentViewer.css';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

const DocumentViewer = ({ propertyId, userId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewedDocument, setViewedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

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



  React.useEffect(() => {
    if (propertyId) {
      fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const openDocument = (doc) => {
    if (doc.is_locked) {
      alert('This document is currently locked by the owner.');
      return;
    }
    setViewedDocument(doc);
    setShowDocumentModal(true);
  };

  if (loading) {
    return <div className="doc-viewer-loading">Loading documents...</div>;
  }

  return (
    <div className="document-viewer">
      <div className="doc-viewer-header">
        <h3>📄 Property Documents</h3>
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
                    onClick={() => openDocument(doc)}
                  >
                    👁️ View Document
                  </button>
                )}
              </div>
            </div>
          ))}
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

              <button
                className="btn-secondary"
                onClick={async () => {
                  try {
                    const authenticity = await axios.get(`${API_BASE}/property-documents/${viewedDocument.id}/authenticate`);
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
