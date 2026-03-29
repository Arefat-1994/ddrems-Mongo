import React, { useState } from 'react';
import './ImageUploader.css';

const ImageUploader = ({ propertyId, uploadedBy, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    // Create preview URLs
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select images to upload');
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      // Upload each image
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        try {
          // Create a data URL for the image
          const reader = new FileReader();
          const imageDataUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
          });
          
          const response = await fetch('http://localhost:5000/api/property-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: propertyId,
              image_url: imageDataUrl,
              image_type: i === 0 ? 'main' : 'gallery',
              uploaded_by: uploadedBy
            })
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const data = await response.json();
          console.log(`Image ${i + 1} uploaded:`, data);
          successCount++;
        } catch (error) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        alert(`✅ ${successCount} image(s) uploaded successfully!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        setSelectedFiles([]);
        setPreviewUrls([]);
        
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        alert('❌ All uploads failed. Please check your connection and try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePreview = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  return (
    <div className="image-uploader">
      <div className="upload-area">
        <input
          type="file"
          id="image-upload"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <label htmlFor="image-upload" className="upload-label">
          <div className="upload-icon">📷</div>
          <p>Click to select images</p>
          <span>or drag and drop</span>
        </label>
      </div>

      {previewUrls.length > 0 && (
        <div className="preview-grid">
          {previewUrls.map((url, index) => (
            <div key={index} className="preview-item">
              <img src={url} alt={`Preview ${index + 1}`} />
              <button
                className="remove-preview"
                onClick={() => removePreview(index)}
                type="button"
              >
                ✕
              </button>
              {index === 0 && <span className="main-badge">Main</span>}
            </div>
          ))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <button
          className="btn-upload"
          onClick={handleUpload}
          disabled={uploading}
          type="button"
        >
          {uploading ? '⏳ Uploading...' : `📤 Upload ${selectedFiles.length} Image(s)`}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
