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

const mockHazardZones = {
  type: 'FeatureCollection',
  features: [],
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
  stagingPoint = null,
  stagingNote = null,
  geoJsonKey = 'hazard-zones',
}) {
  const resolvedCenter = Array.isArray(center) && center.length === 2 ? center : defaultCenter;
  const resolvedFacilityPosition = Array.isArray(facilityPosition) && facilityPosition.length === 2
    ? facilityPosition
    : defaultCenter;

  const stagingPosition = Array.isArray(stagingPoint?.coordinates)
    && stagingPoint.coordinates.length === 2
    ? [stagingPoint.coordinates[1], stagingPoint.coordinates[0]]
    : null;

  return (
    <div className="map-wrapper">
      <MapContainer
        key={resolvedCenter.join(',')}
        center={resolvedCenter}
        zoom={zoom}
        scrollWheelZoom
        className="threat-map"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {resolvedFacilityPosition && (
          <Marker position={resolvedFacilityPosition}>
            <Popup>
              <strong>Incident</strong>
              <br />
              Threat-zone source
            </Popup>
          </Marker>
        )}

        {hazardGeoJson && (
          <GeoJSON
            key={geoJsonKey}
            data={hazardGeoJson}
            style={getZoneStyle}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(featurePopup(feature));
            }}
          />
        )}

        {stagingPosition && (
          <Marker position={stagingPosition}>
            <Popup>
              <strong>Upwind visualization reference</strong>
              <br />
              {stagingNote ?? 'Visualization reference only; not a validated safe staging location.'}
            </Popup>
          </Marker>
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function featurePopup(feature) {
  const properties = feature?.properties ?? {};
  const lines = [];
  const heading = properties.label ?? properties.severity ?? 'Hazard zone';
  if (heading) lines.push(`<strong>${escapeHtml(heading)}</strong>`);
  if (properties.intensity != null) {
    const unit = properties.unit ? ` ${escapeHtml(properties.unit)}` : '';
    lines.push(`${escapeHtml(properties.intensity)}${unit}`);
  }
  if (properties.event_phase) lines.push(`Phase: ${escapeHtml(properties.event_phase)}`);
  if (properties.time_offset_min != null) lines.push(`T + ${escapeHtml(properties.time_offset_min)} minutes`);
  if (properties.severity) lines.push(`Severity: ${escapeHtml(properties.severity)}`);
  return lines.join('<br />') || 'Hazard zone';
}
