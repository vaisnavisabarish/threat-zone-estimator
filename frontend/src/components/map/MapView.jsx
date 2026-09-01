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
const mockHazardZones = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        severity: 'moderate',
        label: 'Moderate Hazard',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [80.2670, 13.0860],
          [80.2780, 13.0860],
          [80.2810, 13.0790],
          [80.2780, 13.0740],
          [80.2670, 13.0740],
          [80.2640, 13.0790],
          [80.2670, 13.0860],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        severity: 'high',
        label: 'High Hazard',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [80.2690, 13.0835],
          [80.2760, 13.0835],
          [80.2780, 13.0790],
          [80.2760, 13.0760],
          [80.2690, 13.0760],
          [80.2670, 13.0790],
          [80.2690, 13.0835],
        ]],
      },
    },
    {
      type: 'Feature',
      properties: {
        severity: 'critical',
        label: 'Critical Hazard',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [80.2710, 13.0815],
          [80.2750, 13.0815],
          [80.2760, 13.0790],
          [80.2740, 13.0770],
          [80.2710, 13.0770],
          [80.2700, 13.0790],
          [80.2710, 13.0815],
        ]],
      },
    },
  ],
};

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
  hazardGeoJson = mockHazardZones,
  windDirection = 135,
}) {
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

        {hazardGeoJson && (
          <GeoJSON
            data={hazardGeoJson}
            style={getZoneStyle}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(
                `<strong>${feature.properties.label}</strong>`
              );
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