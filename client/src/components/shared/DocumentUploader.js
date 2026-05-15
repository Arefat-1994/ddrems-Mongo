import React, { useState } from 'react';
import axios from 'axios';
import './DocumentUploader.css';

const DocumentUploader = ({ propertyId, uploadedBy, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('title_deed');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setDocumentName(file.name);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a document to upload');
      return;
    }

    if (!documentName.trim()) {
      alert('Please enter a document name');
      return;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxSize) {
      alert(`File is too large! Maximum size is 10MB.\nYour file: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setUploading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      const documentBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(selectedFile);
      });

      console.log('Uploading document...', {
        property_id: propertyId,
        document_name: documentName,
        document_type: documentType,
        size: `${(selectedFile.size / 1024).toFixed(2)} KB`
      });

      const API_BASE = `${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}/api`;
      const response = await axios.post(`${API_BASE}/property-documents`, {
        property_id: propertyId,
        document_name: documentName,
        document_url: documentBase64,
        document_type: documentType,
        uploaded_by: uploadedBy
      }, {
        timeout: 300000, // 5 minutes
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log('Upload successful:', response.data);

      alert(`✅ Document uploaded successfully!\n\n🔑 Access Key: ${response.data.access_key}\n\nShare this key with customers to allow them to view the document.`);

      setSelectedFile(null);
      setDocumentName('');
      setDocumentType('title_deed');

      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      let errorMessage = 'Failed to upload document.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '⏱️ Upload timeout. The file might be too large or your connection is slow.';
      } else if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        
        if (error.response.status === 413) {
          errorMessage = '📦 File is too large for the server to handle. Try a smaller file.';
        } else if (error.response.status === 500) {
          const detail = error.response.data?.error ? `\nDetail: ${error.response.data.error}` : '';
          const errCode = error.response.data?.code ? `\nCode: ${error.response.data.code}` : '';
          errorMessage = `🔧 Server error: ${error.response.data?.message || 'Database issue.'}${detail}${errCode}`;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = '🌐 Cannot connect to server. Make sure the backend is running on port 5000.';
      } else {
        errorMessage = `❌ ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="document-uploader">
      <div className="form-group">
        <label>Document Type</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
        >
          <option value="title_deed">Title Deed</option>
          <option value="survey_plan">Survey Plan</option>
          <option value="tax_clearance">Tax Clearance</option>
          <option value="building_permit">Building Permit</option>
          <option value="ownership_certificate">Ownership Certificate</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Document Name</label>
        <input
          type="text"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder="e.g., Property Title Deed 2024"
        />
      </div>

      <div className="upload-area-doc">
        <input
          type="file"
          id="doc-upload"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <label htmlFor="doc-upload" className="upload-label-doc">
          <div className="upload-icon-doc">📄</div>
          {selectedFile ? (
            <div className="file-selected">
              <p>{selectedFile.name}</p>
              <span>{(selectedFile.size / 1024).toFixed(2)} KB</span>
            </div>
          ) : (
            <>
              <p>Click to select document</p>
              <span>PDF, DOC, DOCX, JPG, PNG (Max 10MB)</span>
            </>
          )}
        </label>
      </div>

      {selectedFile && (
        <button
          className="btn-upload-doc"
          onClick={handleUpload}
          disabled={uploading}
          type="button"
        >
          {uploading ? '⏳ Uploading...' : '📤 Upload & Generate Access Key'}
        </button>
      )}

      <div className="info-box">
        <div className="info-icon">ℹ️</div>
        <div className="info-content">
          <strong>Access Key System</strong>
          <p>After uploading, you'll receive a unique access key. Share this key with customers to allow them to view the document securely.</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploader;
