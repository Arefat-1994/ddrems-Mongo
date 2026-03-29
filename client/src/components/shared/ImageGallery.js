import React, { useState, useEffect } from 'react';
import './ImageGallery.css';
import axios from 'axios';

const ImageGallery = ({ propertyId, canDelete, onDelete }) => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/property-images/property/${propertyId}`);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5000/api/property-images/${imageId}`);
      setImages(images.filter(img => img.id !== imageId));
      if (onDelete) onDelete();
      alert('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image');
    }
  };

  if (loading) {
    return <div className="gallery-loading">Loading images...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="empty-icon">🖼️</div>
        <p>No images uploaded yet</p>
      </div>
    );
  }

  const mainImage = images.find(img => img.image_type === 'main') || images[0];
  const galleryImages = images.filter(img => img.image_type === 'gallery');

  return (
    <div className="image-gallery">
      <div className="main-image-container">
        <img
          src={mainImage.image_url}
          alt="Main property"
          className="main-image"
          onClick={() => setSelectedImage(mainImage)}
        />
        {mainImage.image_type === 'main' && (
          <span className="main-image-badge">Main Image</span>
        )}
        {canDelete && (
          <button
            className="delete-image-btn"
            onClick={() => handleDelete(mainImage.id)}
          >
            🗑️ Delete
          </button>
        )}
      </div>

      {galleryImages.length > 0 && (
        <div className="gallery-grid">
          {galleryImages.map(image => (
            <div key={image.id} className="gallery-item">
              <img
                src={image.image_url}
                alt="Property"
                onClick={() => setSelectedImage(image)}
              />
              {canDelete && (
                <button
                  className="delete-gallery-btn"
                  onClick={() => handleDelete(image.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedImage(null)}>
              ✕
            </button>
            <img src={selectedImage.image_url} alt="Full size" />
            <div className="lightbox-info">
              <p>Uploaded: {new Date(selectedImage.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
