import React from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix broken default marker icons
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const { BaseLayer } = LayersControl;

// Coordinate display component
const CoordinateDisplay = ({ lat, lng }) => (
  <div className="map-coordinates-overlay">
    <span>📍 {lat.toFixed(6)}, {lng.toFixed(6)}</span>
  </div>
);

const PropertyMap = ({ latitude, longitude, title, properties }) => {


  const renderLayers = () => (
    <LayersControl position="topright">
      <BaseLayer checked name="Street View">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      </BaseLayer>
      <BaseLayer name="Satellite View">
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      </BaseLayer>
      <BaseLayer name="Terrain View">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        />
      </BaseLayer>
    </LayersControl>
  );

  // Multi-property map mode
  if (properties && properties.length > 0) {
    const validProperties = properties.filter(p => {
      const lat = parseFloat(p.latitude);
      const lng = parseFloat(p.longitude);
      return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    });
    
    if (validProperties.length === 0) return null;
    
    const avgLat = validProperties.reduce((sum, p) => sum + parseFloat(p.latitude), 0) / validProperties.length;
    const avgLng = validProperties.reduce((sum, p) => sum + parseFloat(p.longitude), 0) / validProperties.length;
    
    return (
      <div className="enhanced-property-map multi">
        <MapContainer
          key={`multi-${validProperties.length}`}
          center={[avgLat, avgLng]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          {renderLayers()}
          {validProperties.map((prop, idx) => (
            <Marker key={prop.id || idx} position={[parseFloat(prop.latitude), parseFloat(prop.longitude)]}>
              <Popup>
                <div className="map-popup-content">
                  <strong>{prop.title}</strong>
                  <p>{Number(prop.price).toLocaleString()} ETB</p>
                  <p>{prop.location}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <CoordinateDisplay lat={avgLat} lng={avgLng} />
      </div>
    );
  }

  // Single property map mode
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (!latitude || !longitude || isNaN(lat) || isNaN(lng)) return null;

  return (
    <div className="enhanced-property-map single">
      <MapContainer
        key={`${lat}-${lng}`}
        center={[lat, lng]}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        {renderLayers()}
        <Marker position={[lat, lng]}>
          <Popup>{title || "Property Location"}</Popup>
        </Marker>
      </MapContainer>
      <CoordinateDisplay lat={lat} lng={lng} />
    </div>
  );
};

export default PropertyMap;
