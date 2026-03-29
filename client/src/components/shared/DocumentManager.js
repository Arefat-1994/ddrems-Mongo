import React, { useState, useEffect } from 'react';
import './DocumentManager.css';
import axios from 'axios';

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
      const response = await axios.get(`http://localhost:5000/api/property-documents/property/${propertyId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async (docId, currentLockStatus) => {
    try {
      await axios.put(`http://localhost:5000/api/property-documents/${docId}/lock`, {
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
      await axios.delete(`http://localhost:5000/api/property-documents/${docId}`);
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
      const response = await axios.put(`http://localhost:5000/api/property-documents/${docId}/regenerate-key`);
      fetchDocuments();
      alert(`New access key: ${response.data.access_key}`);
    } catch (error) {
      console.error('Error regenerating key:', error);
      alert('Failed to regenerate key');
    }
  };

  const [showSendModal, setShowSendModal] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [users, setUsers] = useState([]);

  const sendKey = async (doc) => {
    setSelectedDoc(doc);
    setShowSendModal(true);
    // Fetch users (customers) to send the key to
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data.filter(u => u.role === 'user'));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSendKey = async () => {
    if (!recipientId) {
      alert('Please select a recipient');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/messages', {
        sender_id: uploadedBy,
        receiver_id: recipientId,
        subject: `Access Key for ${selectedDoc.document_name}`,
        message: `Hello, here is the access key to view the document "${selectedDoc.document_name}" for property ID ${propertyId}: ${selectedDoc.access_key}`,
        message_type: 'property'
      });
      alert('Key sent successfully!');
      setShowSendModal(false);
      setRecipientId('');
    } catch (error) {
      console.error('Error sending key:', error);
      alert('Failed to send key');
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
                  onClick={() => window.open(doc.document_url, '_blank')}
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
                  className="btn-doc-action send"
                  onClick={() => sendKey(doc)}
                  title="Send Key to Customer"
                >
                  📤 Send
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
      {showSendModal && selectedDoc && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content key-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 Send Access Key</h2>
              <button className="close-btn" onClick={() => setShowSendModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="send-key-form">
                <p>Send access key for <strong>{selectedDoc.document_name}</strong></p>
                <div className="form-group">
                  <label>Select Customer</label>
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    required
                  >
                    <option value="">-- Select a Customer --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setShowSendModal(false)}>Cancel</button>
                  <button className="btn-primary" onClick={handleSendKey}>Send Key</button>
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
