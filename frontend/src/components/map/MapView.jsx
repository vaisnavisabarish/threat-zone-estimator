import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const defaultCenter = [13.0827, 80.2707];

// Temporary mock hazard zones.
// Later, your backend teammate's GeoJSON will replace this.


function getZoneStyle(feature) {
  const severity = feature?.properties?.severity;

  if (severity === 'critical') {
    return {
      fillColor: '#ef4444',
      fillOpacity: 0.45,
      color: '#ef4444',
      weight: 2,
    };
  }

  if (severity === 'high') {
    return {
      fillColor: '#f97316',
      fillOpacity: 0.4,
      color: '#f97316',
      weight: 2,
    };
  }

  return {
    fillColor: '#eab308',
    fillOpacity: 0.35,
    color: '#eab308',
    weight: 2,
  };
}

function WindArrow({ direction = 135 }) {
  const map = useMap();

  const center = map.getCenter();

  const arrowIcon = L.divIcon({
    className: 'wind-arrow-wrapper',
    html: `
      <div
        class="wind-arrow"
        style="transform: rotate(${direction}deg)"
        title="Wind direction: ${direction}°"
      >
        ➤
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <Marker position={center} icon={arrowIcon}>
      <Popup>
        Wind direction: {direction}°
      </Popup>
    </Marker>
  );
}

export default function MapView({
  center = defaultCenter,
  zoom = 14,
  facilityPosition = defaultCenter,
  hazardGeoJson = null,
  windDirection = 135,
})  {
  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="threat-map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={facilityPosition}>
          <Popup>
            <strong>Facility</strong>
            <br />
            Threat-zone source
          </Popup>
        </Marker>

        {hazardGeoJson?.type === 'FeatureCollection' && (
  <GeoJSON
    data={hazardGeoJson}
    style={getZoneStyle}
    onEachFeature={(feature, layer) => {
      const severity = feature?.properties?.severity;
      const intensity = feature?.properties?.intensity;

      layer.bindPopup(`
        <strong>${severity ?? 'Hazard'}</strong>
        <br />
        Intensity: ${intensity ?? 'N/A'} kW/m²
      `);
    }}
  />
)}

        <WindArrow direction={windDirection} />
      </MapContainer>

      <div className="map-legend">
        <div className="legend-title">Threat Level</div>

        <div className="legend-item">
          <span className="legend-box critical" />
          Critical
        </div>

        <div className="legend-item">
          <span className="legend-box high" />
          High
        </div>

        <div className="legend-item">
          <span className="legend-box moderate" />
          Moderate
        </div>
      </div>

      <div className="wind-label">
        Wind: {windDirection}°
      </div>
    </div>
  );
}