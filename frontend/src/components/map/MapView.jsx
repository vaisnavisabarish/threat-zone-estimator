import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  Circle,
  Polyline,
  useMap,
} from 'react-leaflet';
import { useEffect, useMemo } from 'react';
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

const DEFAULT_CENTER = [12.9719, 79.1602];

const SEVERITY = {
  critical: { fill: '#ef4444', border: '#ff6b6b', label: 'CRITICAL', threshold: '≥ 10' },
  high: { fill: '#f97316', border: '#fb923c', label: 'HIGH', threshold: '5–10' },
  moderate: { fill: '#eab308', border: '#fde047', label: 'MODERATE', threshold: '2–5' },
};

const COMPASS = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

function destination(lat, lon, bearingDeg, distanceM) {
  const R = 6371000;
  const b = (bearingDeg * Math.PI) / 180;
  const p1 = (lat * Math.PI) / 180;
  const l1 = (lon * Math.PI) / 180;
  const d = distanceM / R;

  const p2 = Math.asin(
    Math.sin(p1) * Math.cos(d) +
      Math.cos(p1) * Math.sin(d) * Math.cos(b)
  );
  const l2 =
    l1 +
    Math.atan2(
      Math.sin(b) * Math.sin(d) * Math.cos(p1),
      Math.cos(d) - Math.sin(p1) * Math.sin(p2)
    );

  return [(p2 * 180) / Math.PI, (l2 * 180) / Math.PI];
}

function ZoneStyle(feature) {
  const severity = feature?.properties?.severity;
  const s = SEVERITY[severity] ?? SEVERITY.moderate;
  return {
    fillColor: s.fill,
    fillOpacity: severity === 'critical' ? 0.52 : severity === 'high' ? 0.42 : 0.30,
    color: s.border,
    opacity: 0.9,
    weight: severity === 'critical' ? 2.4 : 1.4,
  };
}

function MapAutoFit({ hazardGeoJson }) {
  const map = useMap();

  useEffect(() => {
    if (!hazardGeoJson?.features?.length) return;
    const layer = L.geoJSON(hazardGeoJson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [55, 55],
        maxZoom: 16,
        animate: true,
        duration: 0.8,
      });
    }
  }, [hazardGeoJson, map]);

  return null;
}

function ScaleControl() {
  const map = useMap();

  useEffect(() => {
    const control = L.control.scale({
      imperial: false,
      metric: true,
      position: 'bottomleft',
      maxWidth: 120,
    });
    control.addTo(map);
    return () => control.remove();
  }, [map]);

  return null;
}

function FacilityOverlay({ position, configuration }) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: 'facility-marker-wrapper',
        html: `
          <div class="facility-radar">
            <div class="facility-ring facility-ring-1"></div>
            <div class="facility-ring facility-ring-2"></div>
            <div class="facility-core">⚠</div>
          </div>
        `,
        iconSize: [54, 54],
        iconAnchor: [27, 27],
      }),
    []
  );

  return (
    <Marker position={position} icon={icon} zIndexOffset={1000}>
      <Popup>
        <div className="map-popup">
          <div className="popup-kicker">SOURCE FACILITY</div>
          <strong>{configuration === 'dual_tank' ? 'DUAL TANK ARRAY' : 'SINGLE TANK'}</strong>
          <div className="popup-muted">Hazard origin / modeled source</div>
        </div>
      </Popup>
    </Marker>
  );
}

function WindOverlay({ center, direction, speed }) {
  const downwind = (Number(direction) + 180) % 360;
  const endpoint = destination(center[0], center[1], downwind, 420);

  const arrowIcon = L.divIcon({
    className: 'wind-arrow-wrapper',
    html: `<div class="wind-arrow" style="transform: rotate(${downwind}deg)">➤</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

  return (
    <>
      <Polyline
        positions={[center, endpoint]}
        pathOptions={{
          color: '#38bdf8',
          weight: 3,
          opacity: 0.9,
          dashArray: '10 8',
          className: 'wind-vector-line',
        }}
      />
      <Marker position={endpoint} icon={arrowIcon} interactive={false} />
    </>
  );
}

function ApproachOverlay({ center, direction }) {
  if (!direction || direction === 'N/A' || direction === 'NA') return null;

  const bearing = COMPASS[String(direction).toUpperCase()];
  if (bearing === undefined) return null;

  const outer = destination(center[0], center[1], bearing, 330);

  return (
    <>
      <Polyline
        positions={[outer, center]}
        pathOptions={{
          color: '#22c55e',
          weight: 2.5,
          opacity: 0.85,
          dashArray: '5 7',
        }}
      />
      <Marker
        position={outer}
        icon={L.divIcon({
          className: 'approach-marker-wrapper',
          html: `<div class="approach-marker">↘</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })}
      >
        <Popup>
          <div className="map-popup">
            <div className="popup-kicker">RESPONSE GUIDANCE</div>
            <strong>{String(direction).toUpperCase()} APPROACH</strong>
            <div className="popup-muted">Lowest modeled sector exposure.</div>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = 14,
  facilityPosition = DEFAULT_CENTER,
  hazardGeoJson = null,
  windDirection = 135,
  windSpeed = 8,
  hazardType = 'thermal',
  configuration = 'single_tank',
  recommendedApproach = 'N/A',
}) {
  const isBlast = hazardType === 'blast' || hazardType === 'blast_overpressure';
  const unit = isBlast ? 'kPa' : 'kW/m²';
  const downwind = (Number(windDirection) + 180) % 360;

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        zoomControl
        className="threat-map"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ScaleControl />
        <MapAutoFit hazardGeoJson={hazardGeoJson} />

        <Circle
          center={facilityPosition}
          radius={100}
          pathOptions={{ color: '#94a3b8', weight: 1, opacity: 0.28, dashArray: '4 7', fill: false }}
        />
        <Circle
          center={facilityPosition}
          radius={250}
          pathOptions={{ color: '#94a3b8', weight: 1, opacity: 0.20, dashArray: '4 8', fill: false }}
        />
        <Circle
          center={facilityPosition}
          radius={500}
          pathOptions={{ color: '#94a3b8', weight: 1, opacity: 0.16, dashArray: '4 9', fill: false }}
        />

        <FacilityOverlay
          position={facilityPosition}
          configuration={configuration}
        />

        <WindOverlay
          center={facilityPosition}
          direction={windDirection}
          speed={windSpeed}
        />

        <ApproachOverlay
          center={facilityPosition}
          direction={recommendedApproach}
        />

        {hazardGeoJson?.type === 'FeatureCollection' && (
          <GeoJSON
            key={JSON.stringify(hazardGeoJson)}
            data={hazardGeoJson}
            style={ZoneStyle}
            onEachFeature={(feature, layer) => {
              const severity = feature?.properties?.severity;
              const intensity = feature?.properties?.intensity;
              const featureUnit = feature?.properties?.unit || unit;
              const s = SEVERITY[severity] ?? SEVERITY.moderate;

              layer.bindPopup(`
                <div class="map-popup">
                  <div class="popup-severity ${severity || ''}">${s.label}</div>
                  <div class="popup-value">${intensity ?? 'N/A'} <span>${featureUnit}</span></div>
                  <div class="popup-muted">Grid cell exposure estimate</div>
                </div>
              `);

              layer.on({
                mouseover: (event) => {
                  event.target.setStyle({
                    weight: 3.5,
                    fillOpacity: Math.min((ZoneStyle(feature).fillOpacity || 0.3) + 0.12, 0.75),
                  });
                  event.target.bringToFront();
                },
                mouseout: (event) => event.target.setStyle(ZoneStyle(feature)),
              });
            }}
          />
        )}
      </MapContainer>

      <div className="map-hud map-hud-top-left">
        <div className="hud-status">
          <span className="hud-dot"></span>
          LIVE MODEL OUTPUT
        </div>
        <div className="hud-title">EXPOSURE FIELD</div>
        <div className="hud-subtitle">25 m computational grid</div>
      </div>

      <div className="map-hud map-hud-top-right">
        <div className="hud-row">
          <span>WIND FROM</span>
          <strong>{Number(windDirection).toFixed(0)}°</strong>
        </div>
        <div className="hud-row">
          <span>SPEED</span>
          <strong>{Number(windSpeed).toFixed(1)} m/s</strong>
        </div>
        <div className="hud-row">
          <span>DOWNWIND</span>
          <strong>{downwind.toFixed(0)}°</strong>
        </div>
      </div>

      <div className="map-legend">
        <div className="legend-title">THREAT INTENSITY · {unit}</div>
        {Object.entries(SEVERITY).map(([key, value]) => (
          <div className="legend-item" key={key}>
            <span className={`legend-box ${key}`} />
            <span>{value.label}</span>
            <span className="legend-threshold">{value.threshold}</span>
          </div>
        ))}
        <div className="legend-divider"></div>
        <div className="legend-foot">
          <span className="legend-line wind-line"></span> Downwind vector
        </div>
        <div className="legend-foot">
          <span className="legend-line approach-line"></span> Lower-risk approach
        </div>
      </div>

      <div className="wind-label">
        <span className="wind-icon">➤</span>
        WIND VECTOR · {Number(windDirection).toFixed(0)}° FROM
      </div>
    </div>
  );
}
