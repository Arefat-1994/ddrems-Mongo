import React, { useState, useEffect } from 'react';
import './ImageGallery.css';
import axios from 'axios';

const API_BASE = `${window.API_URL}`;

const ImageGallery = ({ propertyId, canDelete, onDelete }) => {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_BASE}/property-images/property/${propertyId}`);
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
      await axios.delete(`${API_BASE}/property-images/${imageId}`);
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

  // Reorder images to ensure order: front/main, back, left, right if possible
  const orderedImages = [];
  const mainImg = images.find(img => img.image_type === 'main' || img.image_type === 'front');
  const backImg = images.find(img => img.image_type === 'back');
  const leftImg = images.find(img => img.image_type === 'left');
  const rightImg = images.find(img => img.image_type === 'right');
  
  if (mainImg) orderedImages.push({...mainImg, label: 'Front View'});
  if (backImg) orderedImages.push({...backImg, label: 'Back View'});
  if (leftImg) orderedImages.push({...leftImg, label: 'Left Side'});
  if (rightImg) orderedImages.push({...rightImg, label: 'Right Side'});
  
  // Add any other gallery images that didn't match the standard types
  images.forEach(img => {
    if (!orderedImages.find(oi => oi.id === img.id)) {
      orderedImages.push({...img, label: 'Gallery View'});
    }
  });

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === orderedImages.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? orderedImages.length - 1 : prev - 1));
  };

  const currentImage = orderedImages[currentIndex];

  return (
    <div className="image-gallery-carousel">
      <div className="carousel-container">
        {orderedImages.length > 1 && (
          <button className="carousel-arrow prev" onClick={prevSlide}>
            &#10094;
          </button>
        )}
        
        <div className="carousel-slide">
          <img
            src={currentImage.image_url}
            alt={currentImage.label}
            className="carousel-image"
          />
          <div className="carousel-badge">{currentImage.label}</div>
          
          {canDelete && (
            <button
              className="carousel-delete-btn"
              onClick={() => handleDelete(currentImage.id)}
              title="Delete this image"
            >
              🗑️
            </button>
          )}
        </div>

        {orderedImages.length > 1 && (
          <button className="carousel-arrow next" onClick={nextSlide}>
            &#10095;
          </button>
        )}
      </div>
      
      {orderedImages.length > 1 && (
        <div className="carousel-indicators">
          {orderedImages.map((_, idx) => (
            <button
              key={idx}
              className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
