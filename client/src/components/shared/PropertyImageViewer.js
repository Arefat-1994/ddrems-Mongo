import React, { useState, useRef, useEffect } from 'react';
import './PropertyImageViewer.css';

const PropertyImageViewer = ({ images, propertyTitle, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const currentImage = images[currentImageIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') previousImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === 'r' || e.key === 'R') rotateImage();
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    resetView();
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    resetView();
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 5));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const rotateImage = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetRotation = () => {
    setRotation(0);
  };

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleMouseWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleDoubleClick = () => {
    if (zoom === 1) {
      setZoom(2);
    } else {
      resetZoom();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`property-image-viewer ${isFullscreen ? 'fullscreen' : ''}`}
      onWheel={handleMouseWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="viewer-header">
        <div className="viewer-title">
          <h2>{propertyTitle}</h2>
          <span className="image-counter">
            {currentImageIndex + 1} / {images.length}
          </span>
        </div>
        <div className="viewer-controls-top">
          <button
            className="control-btn"
            title="Reset View (R)"
            onClick={resetView}
          >
            🔄 Reset
          </button>
          <button
            className="control-btn"
            title="Close (Esc)"
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="image-container">
        <img
          ref={imageRef}
          src={currentImage}
          alt={`${propertyTitle} - Image ${currentImageIndex + 1}`}
          className="viewer-image"
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panX}px, ${panY}px)`,
            cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
          }}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />
      </div>

      {/* Bottom Controls */}
      <div className="viewer-controls-bottom">
        {/* Navigation */}
        <div className="nav-controls">
          <button
            className="nav-btn"
            onClick={previousImage}
            title="Previous Image (←)"
          >
            ◀ Previous
          </button>
          <button
            className="nav-btn"
            onClick={nextImage}
            title="Next Image (→)"
          >
            Next ▶
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button
            className="control-btn"
            onClick={zoomOut}
            title="Zoom Out (-)"
            disabled={zoom <= 0.5}
          >
            🔍− Zoom Out
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            className="control-btn"
            onClick={zoomIn}
            title="Zoom In (+)"
            disabled={zoom >= 5}
          >
            🔍+ Zoom In
          </button>
          <button
            className="control-btn"
            onClick={resetZoom}
            title="Reset Zoom"
          >
            1:1
          </button>
        </div>

        {/* Rotation & Fullscreen */}
        <div className="transform-controls">
          <button
            className="control-btn"
            onClick={rotateImage}
            title="Rotate (R)"
          >
            🔁 Rotate {rotation}°
          </button>
          <button
            className="control-btn"
            onClick={resetRotation}
            title="Reset Rotation"
          >
            ↺ Reset Rotation
          </button>
          <button
            className="control-btn"
            onClick={toggleFullscreen}
            title="Fullscreen (F)"
          >
            {isFullscreen ? '⛶ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {/* Keyboard Hints */}
      <div className="keyboard-hints">
        <p>💡 Keyboard: ← → (Navigate) | +/- (Zoom) | R (Rotate) | F (Fullscreen) | Esc (Close) | Double-click (Quick Zoom)</p>
      </div>
    </div>
  );
};

export default PropertyImageViewer;
