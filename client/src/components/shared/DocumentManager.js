import React, { useState, useEffect } from 'react';
import './DocumentManager.css';
import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;

const DocumentManager = ({ propertyId, uploadedBy }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    fetchDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/property-documents/property/${propertyId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async (docId, currentLockStatus) => {
    try {
      await axios.put(`${API_BASE}/property-documents/${docId}/lock`, {
        is_locked: !currentLockStatus
      });
      fetchDocuments();
      alert(`Document ${!currentLockStatus ? 'locked' : 'unlocked'} successfully`);
    } catch (error) {
      console.error('Error toggling lock:', error);
      alert('Failed to update document lock status');
    }
  };

  const deleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE}/property-documents/${docId}`);
      fetchDocuments();
      alert('Document deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const showAccessKey = (doc) => {
    setSelectedDoc(doc);
    setShowKeyModal(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Access key copied to clipboard!');
  };

  const regenerateKey = async (docId) => {
    if (!window.confirm('Are you sure you want to regenerate the access key? The old key will no longer work.')) {
      return;
    }
    try {
      const response = await axios.put(`${API_BASE}/property-documents/${docId}/regenerate-key`);
      fetchDocuments();
      alert(`New access key: ${response.data.access_key}`);
    } catch (error) {
      console.error('Error regenerating key:', error);
      alert('Failed to regenerate key');
    }
  };



  const handleView = (doc) => {
    try {
      if (!doc.document_url) {
        alert('Document URL not found');
        return;
      }

      if (doc.document_url.startsWith('data:')) {
        // Handle data URL (base64)
        const parts = doc.document_url.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const b64Data = parts[1];
        
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const blob = new Blob(byteArrays, { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        
        // Note: We should ideally revoke the URL later, but for simple viewing this is fine
      } else {
        // Handle direct URL
        window.open(doc.document_url, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Failed to open document. The file might be corrupted or too large.');
    }
  };

  if (loading) {
    return <div className="doc-manager-loading">Loading documents...</div>;
  }

  return (
    <div className="document-manager">
      <div className="doc-manager-header">
        <h3>📄 Manage Documents</h3>
        <span className="doc-count">{documents.length} document(s)</span>
      </div>

      {documents.length === 0 ? (
        <div className="doc-manager-empty">
          <div className="empty-icon">📄</div>
          <p>No documents uploaded yet</p>
          <span>Upload documents using the form above</span>
        </div>
      ) : (
        <div className="doc-manager-list">
          {documents.map(doc => (
            <div key={doc.id} className="doc-manager-card">
              <div className="doc-card-header">
                <div className="doc-icon-type">
                  {doc.document_type === 'title_deed' && '📜'}
                  {doc.document_type === 'survey_plan' && '🗺️'}
                  {doc.document_type === 'tax_clearance' && '💳'}
                  {doc.document_type === 'building_permit' && '🏗️'}
                  {doc.document_type === 'ownership_certificate' && '📋'}
                  {doc.document_type === 'other' && '📄'}
                </div>
                <div className="doc-card-info">
                  <h4>{doc.document_name}</h4>
                  <p>{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div className="doc-status">
                  {doc.is_locked ? (
                    <span className="status-locked">🔒 Locked</span>
                  ) : (
                    <span className="status-unlocked">🔓 Unlocked</span>
                  )}
                </div>
              </div>

              <div className="doc-card-body">
                <div className="doc-meta">
                  <span>📅 {new Date(doc.created_at).toLocaleDateString()}</span>
                  <span>🔑 Key: {doc.access_key}</span>
                </div>
              </div>

              <div className="doc-card-actions">
                <button
                  className="btn-doc-action view"
                  onClick={() => handleView(doc)}
                  title="View Document"
                >
                  👁️ View
                </button>
                <button
                  className="btn-doc-action key"
                  onClick={() => showAccessKey(doc)}
                  title="Show Access Key"
                >
                  🔑 Key
                </button>
                <button
                  className="btn-doc-action regen"
                  onClick={() => regenerateKey(doc.id)}
                  title="Regenerate Access Key"
                >
                  🔄 Regen
                </button>

                <button
                  className={`btn-doc-action ${doc.is_locked ? 'unlock' : 'lock'}`}
                  onClick={() => toggleLock(doc.id, doc.is_locked)}
                  title={doc.is_locked ? 'Unlock Document' : 'Lock Document'}
                >
                  {doc.is_locked ? '🔓 Unlock' : '🔒 Lock'}
                </button>
                <button
                  className="btn-doc-action delete"
                  onClick={() => deleteDocument(doc.id)}
                  title="Delete Document"
                >
                  🗑️ Delete
                </button>

              </div>
            </div>
          ))}
        </div>
      )}

      {showKeyModal && selectedDoc && (
        <div className="modal-overlay" onClick={() => setShowKeyModal(false)}>
          <div className="modal-content key-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Access Key</h2>
              <button className="close-btn" onClick={() => setShowKeyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="key-display-card">
                <div className="key-icon">🔐</div>
                <h3>{selectedDoc.document_name}</h3>
                <div className="access-key-display">
                  {selectedDoc.access_key}
                </div>
                <button
                  className="btn-copy-key"
                  onClick={() => copyToClipboard(selectedDoc.access_key)}
                >
                  📋 Copy to Clipboard
                </button>
                <div className="key-info">
                  <p>Share this key with customers to allow them to view the document.</p>
                  <p className="key-warning">⚠️ Keep this key secure. Anyone with this key can view the document.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentManager;
