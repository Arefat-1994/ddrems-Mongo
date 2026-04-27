import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPropertyViewer.css';

const API_BASE = `http://${window.location.hostname}:5000/api`;

// Fix missing marker icons in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create custom icons based on property type
const getMarkerIcon = (propertyType) => {
  const colors = {
    villa: 'red',
    house: 'red',
    apartment: 'blue',
    shop: 'green'
  };
  const color = colors[propertyType] || 'blue';
  
  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

// Map events handler component
const MapClickHandler = ({ onMapClick, isActive }) => {
  useMapEvents({
    click: (e) => {
      if (isActive) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

// Component to handle map zooming externally
const MapController = ({ centerProperty }) => {
  const map = useMap();
  useEffect(() => {
    if (centerProperty && centerProperty.latitude && centerProperty.longitude) {
      map.flyTo([parseFloat(centerProperty.latitude), parseFloat(centerProperty.longitude)], 16, {
        duration: 1.5
      });
    }
  }, [centerProperty, map]);
  return null;
};

const MapPropertyViewer = ({ user, initialPropertyId, onClose }) => {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [activeTab, setActiveTab] = useState('properties');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [centerProperty, setCenterProperty] = useState(null);
  const [locationAnalysis, setLocationAnalysis] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      // If initialPropertyId is provided, fetch THAT specific property directly
      // This is crucial for admins viewing pending/inactive properties
      if (initialPropertyId) {
        try {
          const response = await axios.get(`${API_BASE}/properties/${initialPropertyId}`);
          const target = response.data;
          
          if (target && target.latitude && target.longitude) {
            // Important: properties state should only contain this one property
            setProperties([target]);
            setCenterProperty(target);
            setSelectedProperty(target);
            return;
          }
        } catch (err) {
          console.error('Error fetching deep-linked property:', err);
          // Fall back to general list if specific fetch fails
        }
      }

      // General map data (usually only active properties)
      const response = await axios.get(`${API_BASE}/map-properties/map-data`);
      setProperties(response.data);
      
      // Secondary check just in case it was in the map-data but not selected
      if (initialPropertyId && response.data.length > 0) {
        const target = response.data.find(p => p.id === initialPropertyId);
        if (target && target.latitude && target.longitude) {
          setCenterProperty(target);
          setSelectedProperty(target);
          setProperties([target]);
        }
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      showNotification('Failed to load properties', 'error');
    } finally {
      setLoading(false);
    }
  }, [initialPropertyId]);

  const fetchLocationAnalysis = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/map-properties/location-analysis`);
      setLocationAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchLocationAnalysis();
  }, [fetchProperties, fetchLocationAnalysis]);

  const panToProperty = (property) => {
    setCenterProperty(property);
    setSelectedProperty(property);
  };

  return (
    <div className="map-property-viewer">
      {notification && (
        <div className={`map-notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Close Button - Top Right Corner */}
      {onClose && (
        <button
          className="map-close-btn"
          onClick={onClose}
          title="Close Map View"
        >
          ✕
        </button>
      )}

      <div className="map-container">
        <MapContainer 
          center={[9.6009, 41.8596]} 
          zoom={13} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapClickHandler isActive={false} onMapClick={() => {}} />
          {centerProperty && <MapController centerProperty={centerProperty} />}

          {/* Dire Dawa city bounding circle */}
          <Circle center={[9.6009, 41.8596]} radius={5000} pathOptions={{ color: '#667eea', weight: 2, fillOpacity: 0.05 }} />

          {/* Property Markers */}
          {properties.filter(p => p.latitude && p.longitude).map(property => {
            const lat = parseFloat(property.latitude);
            const lng = parseFloat(property.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker 
                key={property.id} 
                position={[lat, lng]} 
                icon={getMarkerIcon(property.type)}
                eventHandlers={{ click: () => panToProperty(property) }}
              >
                <Popup>
                  <div style={{ padding: '4px', minWidth: '220px', fontFamily: '"Segoe UI", sans-serif' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#1a1a2e' }}>{property.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ background: '#667eea', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>{property.type}</span>
                      <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>{property.listing_type === 'rent' ? 'For Rent' : 'For Sale'}</span>
                    </div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 'bold', color: '#10b981' }}>ETB {parseFloat(property.price).toLocaleString()}</p>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#64748b' }}>📍 {property.address || property.location || 'Dire Dawa'}</p>
                    <div style={{ display: 'flex', gap: '8px', margin: '8px 0', fontSize: '11px', color: '#475569' }}>
                      {property.bedrooms && <span>🛏️ {property.bedrooms} Beds</span>}
                      {property.bathrooms && <span>🚿 {property.bathrooms} Baths</span>}
                      {property.area && <span>📐 {property.area} sqm</span>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="map-legend">
          <h4>Property Types</h4>
          <div className="legend-items">
            <span className="legend-item"><div style={{width: 12, height: 12, background: 'red', borderRadius: '50%', display: 'inline-block'}}></div> Villa/House</span>
            <span className="legend-item"><div style={{width: 12, height: 12, background: 'blue', borderRadius: '50%', display: 'inline-block'}}></div> Apartment</span>
            <span className="legend-item"><div style={{width: 12, height: 12, background: 'green', borderRadius: '50%', display: 'inline-block'}}></div> Shop</span>
          </div>
        </div>

        {loading && (
          <div className="map-loading-overlay">
            <div className="map-spinner"></div>
            <p>Loading properties...</p>
          </div>
        )}
      </div>

      <div className="map-sidebar">
        <div className="map-sidebar-header">
          <div>
            <h2>🏙️ Dire Dawa Properties</h2>
            <p className="map-sidebar-subtitle">{properties.length} properties on map</p>
          </div>
        </div>

        <div className="map-sidebar-tabs">
          <button 
            className={`map-tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
            onClick={() => setActiveTab('properties')}
          >
            🏠 Properties
          </button>
          <button 
            className={`map-tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            📊 Analysis
          </button>
        </div>

        {activeTab === 'properties' && (
          <div className="map-sidebar-content">
            {selectedProperty ? (
              <div className="map-property-details">
                <button className="map-btn-back" onClick={() => setSelectedProperty(null)}>← Back to list</button>
                <h3>{selectedProperty.title}</h3>
                <p className="map-price">ETB {parseFloat(selectedProperty.price).toLocaleString()}</p>
                <span className="map-type-badge">{selectedProperty.type}</span>
                <span className="map-listing-badge">{selectedProperty.listing_type === 'rent' ? 'For Rent' : 'For Sale'}</span>
                <p className="map-address">📍 {selectedProperty.address || selectedProperty.location || 'Dire Dawa'}</p>
                
                <div className="map-specs">
                  {selectedProperty.bedrooms && <span>🛏️ {selectedProperty.bedrooms} Beds</span>}
                  {selectedProperty.bathrooms && <span>🚿 {selectedProperty.bathrooms} Baths</span>}
                  {selectedProperty.area && <span>📐 {selectedProperty.area} sqm</span>}
                </div>

                {selectedProperty.description && (
                  <p className="map-description">{selectedProperty.description}</p>
                )}

                {selectedProperty.owner_name && (
                  <p className="map-owner-info">👤 Owner: {selectedProperty.owner_name}</p>
                )}
              </div>
            ) : (
              <div className="map-property-list">
                {properties.length === 0 ? (
                  <div className="map-empty-state">
                    <div className="map-empty-icon">🗺️</div>
                    <h4>No properties found</h4>
                    <p>Properties with map coordinates will appear here</p>
                  </div>
                ) : (
                  properties.map(property => (
                    <div 
                      key={property.id} 
                      className="map-property-list-item"
                      onClick={() => panToProperty(property)}
                    >
                      <div className="map-property-list-info">
                        <h4>{property.title}</h4>
                        <p className="map-list-price">ETB {parseFloat(property.price).toLocaleString()}</p>
                        <div className="map-list-meta">
                          <span className={`map-type-tag type-${property.type}`}>{property.type}</span>
                          <span className="map-list-location">📍 {property.address || property.location || 'Dire Dawa'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analysis' && locationAnalysis && (
          <div className="map-sidebar-content map-analysis-content">
            <div className="map-analysis-header">
              <h3>📊 Dire Dawa Market Analysis</h3>
              <p className="map-analysis-subtitle">Eastern Ethiopia • Real-time Data</p>
            </div>

            <div className="map-analysis-stats">
              <div className="map-stat-card">
                <span className="map-stat-value">{locationAnalysis.totalProperties}</span>
                <span className="map-stat-label">Total Properties</span>
              </div>
              <div className="map-stat-card">
                <span className="map-stat-value">{locationAnalysis.recentActivity}</span>
                <span className="map-stat-label">New (30 days)</span>
              </div>
            </div>

            {locationAnalysis.priceAnalysis && (
              <div className="map-analysis-section">
                <h4>💰 Price Analysis</h4>
                <div className="map-analysis-detail">
                  <span>Average Price:</span>
                  <strong>ETB {parseFloat(locationAnalysis.priceAnalysis.avg_price || 0).toLocaleString()}</strong>
                </div>
                <div className="map-analysis-detail">
                  <span>Avg. Area:</span>
                  <strong>{parseFloat(locationAnalysis.priceAnalysis.avg_area || 0).toFixed(0)} sqm</strong>
                </div>
                <div className="map-analysis-detail">
                  <span>Price/sqm:</span>
                  <strong>ETB {parseFloat(locationAnalysis.priceAnalysis.price_per_sqm || 0).toLocaleString()}</strong>
                </div>
              </div>
            )}

            {locationAnalysis.byType && locationAnalysis.byType.length > 0 && (
              <div className="map-analysis-section">
                <h4>🏠 By Property Type</h4>
                {locationAnalysis.byType.map((t, i) => (
                  <div key={i} className="map-type-analysis-row">
                    <span className={`map-type-tag type-${t.type}`}>{t.type}</span>
                    <span className="map-type-count">{t.count} properties</span>
                    <span className="map-type-avg">~ETB {parseFloat(t.avg_price || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="map-analysis-section">
              <h4>📍 Neighborhoods</h4>
              <div className="map-neighborhood-list">
                {locationAnalysis.neighborhoods?.map((n, i) => (
                  <div 
                    key={i} 
                    className="map-neighborhood-item"
                    onClick={() => {
                        setCenterProperty({ latitude: n.lat, longitude: n.lng });
                    }}
                  >
                    <strong>{n.name}</strong>
                    <span>{n.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPropertyViewer;
