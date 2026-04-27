import React, { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './MapPropertyPicker.css';

// Fix missing marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const MapEvents = ({ setLocation, reverseGeocode }) => {
  useMapEvents({
    click: (e) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setLocation(prev => ({ ...prev, lat, lng }));
      reverseGeocode(lat, lng);
    }
  });
  return null;
};

// Component to handle external map pans and zooms
const MapController = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && center.lat && center.lng) {
      map.flyTo([center.lat, center.lng], map.getZoom() > 14 ? map.getZoom() : 16);
    }
  }, [center, map]);
  return null;
};

const MapPropertyPicker = ({ onLocationSelect, onClose, initialLocation }) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation || {
    lat: 9.6009,
    lng: 41.8596,
    address: 'Dire Dawa, Ethiopia'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Reverse geocoding via Nominatim
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      setSelectedLocation(prev => ({
        ...prev,
        lat,
        lng,
        address: res.data && res.data.display_name 
          ? res.data.display_name 
          : `Dire Dawa (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      }));
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      setSelectedLocation(prev => ({
        ...prev,
        lat,
        lng,
        address: `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`
      }));
    }
  }, []);

  // Forward geocoding search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Dire Dawa')}`);
      if (res.data && res.data.length > 0) {
        const firstResult = res.data[0];
        const lat = parseFloat(firstResult.lat);
        const lng = parseFloat(firstResult.lon);
        setSelectedLocation({
          lat,
          lng,
          address: firstResult.display_name
        });
      } else {
        alert("Location not found. Please try a different search term.");
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation);
  };

  const handleGoToMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setSelectedLocation(prev => ({ ...prev, lat, lng }));
        reverseGeocode(lat, lng);
      }, () => {
        alert('Unable to get your location. Please allow location access.');
      });
    }
  };

  const eventHandlers = useMemo(
    () => ({
      dragend(e) {
        const marker = e.target;
        if (marker != null) {
          const lat = marker.getLatLng().lat;
          const lng = marker.getLatLng().lng;
          setSelectedLocation(prev => ({ ...prev, lat, lng }));
          reverseGeocode(lat, lng);
        }
      },
    }),
    [reverseGeocode],
  );

  return (
    <div className="map-picker-overlay">
      <div className="map-picker-container">
        <div className="map-picker-header">
          <h3>📍 Select Property Location — Dire Dawa</h3>
          <button className="map-picker-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="map-picker-content">
          <div className="map-picker-map-wrapper">
            <div className="map-picker-search-bar" style={{ display: 'flex', gap: '8px', zIndex: 1000 }}>
              <input
                type="text"
                placeholder="🔍 Search location in Dire Dawa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="map-search-input"
                style={{ flex: 1 }}
              />
              <button 
                onClick={handleSearch} 
                disabled={isSearching}
                style={{ padding: '0 12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {isSearching ? '...' : 'Search'}
              </button>
              <button className="btn-my-location" onClick={handleGoToMyLocation} title="Use my location">
                📌
              </button>
            </div>
            
            <div className="map-picker-map" style={{ position: 'relative', height: '400px', width: '100%', zIndex: 0 }}>
              <MapContainer 
                center={[selectedLocation.lat, selectedLocation.lng]} 
                zoom={14} 
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEvents setLocation={setSelectedLocation} reverseGeocode={reverseGeocode} />
                <MapController center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }} />
                
                <Marker 
                  position={[selectedLocation.lat, selectedLocation.lng]} 
                  draggable={true}
                  eventHandlers={eventHandlers}
                  icon={redIcon}
                />
              </MapContainer>
            </div>
          </div>

          <div className="map-picker-info">
            <div className="info-section">
              <h4>📍 Selected Location</h4>
              <div className="location-display">
                <p><strong>Latitude:</strong> {selectedLocation.lat.toFixed(6)}</p>
                <p><strong>Longitude:</strong> {selectedLocation.lng.toFixed(6)}</p>
                <p><strong>Address:</strong> {selectedLocation.address}</p>
              </div>
            </div>

            <div className="info-section">
              <h4>📋 Instructions</h4>
              <ul>
                <li>Click on the map to place marker</li>
                <li>Drag the marker to adjust location</li>
                <li>Search for specific places like "Kezira"</li>
                <li>Use 📌 button for your current location</li>
              </ul>
            </div>

            <div className="info-section dire-dawa-info">
              <h4>🏙️ Dire Dawa</h4>
              <p className="city-description">
                Eastern Ethiopia's second-largest city. Major commercial hub with diverse property market.
              </p>
            </div>

            <div className="map-picker-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleConfirm}>
                ✓ Confirm Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPropertyPicker;
