import React, { useState } from 'react';
import './ImageUploader.css';

const ImageUploader = ({ propertyId, uploadedBy, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState({
    front: { file: null, url: null },
    back: { file: null, url: null },
    left: { file: null, url: null },
    right: { file: null, url: null }
  });

  const compressImage = (file, callback) => {
    // Skip small images (< 1MB)
    if (file.size < 1024 * 1024) {
      callback(file);
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          callback(compressedFile);
        }, 'image/jpeg', 0.85);
      };
    };
  };

  const handleFileSelect = (viewType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    compressImage(file, (compressedFile) => {
      const url = URL.createObjectURL(compressedFile);
      setImages(prev => ({
        ...prev,
        [viewType]: { file: compressedFile, url }
      }));
    });
  };

  const handleUpload = async () => {
    const views = Object.keys(images);
    const hasFiles = views.some(view => images[view].file !== null);
    
    if (!hasFiles) {
      alert('Please select at least one image to upload');
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const viewType of views) {
        const item = images[viewType];
        if (!item.file) continue;
        
        try {
          const formData = new FormData();
          formData.append('image', item.file);
          formData.append('property_id', propertyId);
          formData.append('image_type', viewType === 'front' ? 'main' : viewType);
          if (uploadedBy) formData.append('uploaded_by', uploadedBy);
          
          const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`;
          const response = await fetch(`${API_BASE}/property-images/upload`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Upload failed for ${viewType}`);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${viewType} image:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        alert(`✅ ${successCount} image(s) uploaded successfully!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        setImages({
          front: { file: null, url: null },
          back: { file: null, url: null },
          left: { file: null, url: null },
          right: { file: null, url: null }
        });
        
        if (onUploadComplete) onUploadComplete();
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

  const removePreview = (viewType) => {
    setImages(prev => ({
      ...prev,
      [viewType]: { file: null, url: null }
    }));
  };

  const views = [
    { id: 'front', label: 'Front View', icon: '🏠', required: true },
    { id: 'back', label: 'Back View', icon: '🔙', required: false },
    { id: 'left', label: 'Left Side', icon: '⬅️', required: false },
    { id: 'right', label: 'Right Side', icon: '➡️', required: false }
  ];
  
  const hasFiles = Object.values(images).some(item => item.file !== null);
  const fileCount = Object.values(images).filter(item => item.file !== null).length;

  return (
    <div className="image-uploader">
      <div className="views-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {views.map(view => (
          <div key={view.id} className="view-upload-card" style={{ border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center', position: 'relative', background: '#f8fafc' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>{view.icon} {view.label} {view.required && <span style={{ color: '#ef4444' }}>*</span>}</h4>
            
            {images[view.id].url ? (
              <div className="view-preview" style={{ position: 'relative', height: '140px' }}>
                <img src={images[view.id].url} alt={view.label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                <button 
                  type="button" 
                  onClick={() => removePreview(view.id)}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="upload-area-mini" style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="file"
                  id={`upload-${view.id}`}
                  accept="image/*"
                  onChange={(e) => handleFileSelect(view.id, e)}
                  style={{ display: 'none' }}
                />
                <label htmlFor={`upload-${view.id}`} style={{ cursor: 'pointer', color: '#3b82f6', fontWeight: '600', padding: '10px 20px', border: '1px solid #bfdbfe', borderRadius: '8px', background: '#eff6ff' }}>
                  Select Image
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {hasFiles && (
        <button
          className="btn-upload"
          onClick={handleUpload}
          disabled={uploading}
          type="button"
          style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 'bold' }}
        >
          {uploading ? '⏳ Uploading...' : `📤 Upload ${fileCount} Image(s)`}
        </button>
      )}
    </div>
  );
};

export default ImageUploader;
