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

  const handleFileSelect = (viewType, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImages(prev => ({
      ...prev,
      [viewType]: { file, url }
    }));
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
          const reader = new FileReader();
          const imageDataUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(item.file);
          });
          
          const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`;
          const response = await fetch(`${API_BASE}/property-images`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              property_id: propertyId,
              image_url: imageDataUrl,
              image_type: viewType === 'front' ? 'main' : viewType, // front is main
              uploaded_by: uploadedBy
            })
          });

          if (!response.ok) throw new Error(`Upload failed for ${viewType}`);
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
