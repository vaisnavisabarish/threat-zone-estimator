import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon path issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export default function ThreatEstimatorMap() {
  // Interactive Control States
  const [facilityLat, setFacilityLat] = useState(13.0827);
  const [facilityLng, setFacilityLng] = useState(80.2707);
  const [fuelMass, setFuelMass] = useState(14000);
  const [tankDiameter, setTankDiameter] = useState(15);
  const [wallThickness, setWallThickness] = useState(0.015);
  const [targetTime, setTargetTime] = useState('2026-09-02T14:30');
  const [windSpeed, setWindSpeed] = useState(8.0);
  const [windDirection, setWindDirection] = useState(135.0);
  const [temperature, setTemperature] = useState(32.0);

  // API Response States
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dismissedAlert, setDismissedAlert] = useState(false);

  // References
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // Initialize Map ONCE
  useEffect(() => {
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current, {
        center: [facilityLat, facilityLng],
        zoom: 17,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Fetch from FastAPI Master ML API & Update Map Overlays
  const updateMapData = async () => {
    const values = {
      lat: Number(facilityLat),
      lng: Number(facilityLng),
      fuelMass: Number(fuelMass),
      tankDiameter: Number(tankDiameter),
      wallThickness: Number(wallThickness),
      windSpeed: Number(windSpeed),
      windDirection: Number(windDirection),
      temperature: Number(temperature),
    };
    const invalid = !targetTime || !Number.isFinite(Date.parse(targetTime))
      || !Number.isFinite(values.lat) || values.lat < -90 || values.lat > 90
      || !Number.isFinite(values.lng) || values.lng < -180 || values.lng > 180
      || !Number.isFinite(values.fuelMass) || values.fuelMass <= 0
      || !Number.isFinite(values.tankDiameter) || values.tankDiameter <= 0
      || !Number.isFinite(values.wallThickness) || values.wallThickness <= 0
      || !Number.isFinite(values.windSpeed) || values.windSpeed < 0 || values.windSpeed > 100
      || !Number.isFinite(values.windDirection) || values.windDirection < 0 || values.windDirection >= 360
      || !Number.isFinite(values.temperature) || values.temperature < -100 || values.temperature > 100;

    if (invalid) {
      setError('Enter valid required values within the displayed ranges before running the prediction.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const formattedTime = targetTime.replace('T', ' ') + ':00';

      const response = await fetch('http://127.0.0.1:8000/api/predict-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_time: formattedTime,
          lat: values.lat,
          lng: values.lng,
          fuel_mass_kg: values.fuelMass,
          tank_diameter_m: values.tankDiameter,
          wall_thickness_m: values.wallThickness,
          wind_speed_ms: values.windSpeed,
          wind_direction_deg: values.windDirection,
          temperature_c: values.temperature
        })
      });

      if (!response.ok) throw new Error('Failed to connect to backend prediction API.');

      const data = await response.json();
      setPredictions(data);

      setDismissedAlert(false);

      // Render native map overlays
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers();

        // Target Marker
        L.marker([values.lat, values.lng])
          .addTo(layerGroupRef.current)
          .bindPopup("<b>Target Tank</b>");

        mapInstanceRef.current.setView([values.lat, values.lng], 17);

        // Danger Zone Polygon
        if (data.geojson && data.geojson.danger_zone) {
          L.geoJSON(data.geojson.danger_zone, {
            style: { color: '#ff3333', fillColor: '#ff3333', fillOpacity: 0.6, weight: 2 }
          }).addTo(layerGroupRef.current);
        }

        // Moderate Zone Polygon
        if (data.geojson && data.geojson.moderate_zone) {
          L.geoJSON(data.geojson.moderate_zone, {
            style: { color: '#ffaa00', fillColor: '#ffaa00', fillOpacity: 0.4, weight: 2 }
          }).addTo(layerGroupRef.current);
        }

        const safeRoute = data.tactical_routing?.safe_approach_route;
        if (Array.isArray(safeRoute) && safeRoute.length > 1) {
          L.polyline(safeRoute, {
            color: '#22d3ee', weight: 5, opacity: 0.9, dashArray: '10 8'
          }).addTo(layerGroupRef.current).bindPopup('Safe approach route');

          const stagingPoint = data.tactical_routing?.staging_point;
          if (Array.isArray(stagingPoint) && stagingPoint.length === 2) {
            L.circleMarker(stagingPoint, {
              radius: 8, color: '#22d3ee', fillColor: '#083344', fillOpacity: 1, weight: 3
            }).addTo(layerGroupRef.current).bindPopup('Safe staging point');
          }
        }
      }

    } catch (err) {
      console.error(err);
      setError('Error fetching predictions. Ensure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const timeToFailure = predictions?.threat_assessment?.time_to_failure_min ?? 'N/A';
  const riskLevel = predictions?.threat_assessment?.risk_level ?? 'N/A';
  const isEmergency = riskLevel === 'CRITICAL' && !dismissedAlert;

  return (
    <div className="absolute inset-0 w-screen h-screen overflow-hidden font-sans bg-slate-950">
      
      {/* NATIVE LEAFLET MAP CONTAINER */}
      <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />

      {/* EMERGENCY SHUTDOWN POPUP OVERLAY */}
      {isEmergency && (
        <div className="absolute inset-0 z-[2000] bg-red-950/80 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="relative bg-slate-900 border-4 border-red-600 rounded-3xl p-8 max-w-xl w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.6)] space-y-6">
            
            {/* CLOSE BUTTON */}
            <button 
              type="button"
              onClick={() => setDismissedAlert(true)}
              className="absolute top-4 right-5 text-slate-400 hover:text-white text-2xl font-black transition-colors cursor-pointer w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-800 border border-transparent hover:border-slate-700"
              title="Dismiss Alert"
            >
              ✕
            </button>

            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600/20 text-red-500 rounded-full text-4xl mb-2 border border-red-500 animate-pulse">
              🚨
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-wider uppercase">
              CRITICAL EMERGENCY ALERT
            </h1>
            
            <p className="text-red-400 text-lg font-mono font-bold">
              IMMEDIATE FACTORY SHUTDOWN REQUIRED
            </p>
            
            <div className="bg-red-950/50 border border-red-800/80 rounded-2xl p-4 text-slate-200 text-sm md:text-base">
              System diagnostics indicate mandatory plant shutdown for the selected forecast period. Predicted catastrophic failure threshold reached in approximately <span className="text-white font-black underline decoration-red-500 text-lg">~{timeToFailure} minutes</span>.
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button 
                type="button"
                onClick={() => {
                  alert("Emergency evacuation protocol broadcasted to plant operations.");
                  setDismissedAlert(true);
                }}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase tracking-widest text-sm transition-all shadow-lg cursor-pointer"
              >
                Execute Protocol
              </button>
              
              <button 
                type="button"
                onClick={() => setDismissedAlert(true)}
                className="py-4 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl uppercase tracking-wider text-sm transition-all border border-slate-700 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP CONTROLS BAR */}
      <div className="absolute top-4 left-4 right-28 z-[1000] bg-slate-900/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-end gap-3 text-gray-200 max-h-[48vh] overflow-y-auto">
        <div className="text-sm font-black uppercase tracking-wider text-red-500 mr-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
          Threat Control Hub:
        </div>

        <div className="flex flex-col w-32">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Latitude</label>
          <input type="number" min="-90" max="90" step="0.0001" value={facilityLat} onChange={(e) => setFacilityLat(e.target.value)} className="border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white font-mono" />
        </div>

        <div className="flex flex-col w-32">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Longitude</label>
          <input type="number" min="-180" max="180" step="0.0001" value={facilityLng} onChange={(e) => setFacilityLng(e.target.value)} className="border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white font-mono" />
        </div>

        <div className="flex flex-col w-32">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Fuel Mass (kg)</label>
          <input type="number" min="1" step="100" value={fuelMass} onChange={(e) => setFuelMass(e.target.value)} className="border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white font-mono" />
        </div>

        <div className="flex flex-col w-32">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Tank Diameter (m)</label>
          <input type="number" min="0.1" max="200" step="0.1" value={tankDiameter} onChange={(e) => setTankDiameter(e.target.value)} className="border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white font-mono" />
        </div>

        <div className="flex flex-col w-32">
          <label className="text-[10px] font-bold uppercase text-slate-400 mb-1">Wall Thickness (m)</label>
          <input type="number" min="0.001" max="1" step="0.001" value={wallThickness} onChange={(e) => setWallThickness(e.target.value)} className="border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-800 text-white font-mono" />
        </div>

        <div className="flex flex-col">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Forecast Time</label>
          <input 
            type="datetime-local" 
            value={targetTime}
            onChange={(e) => setTargetTime(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-col w-36">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Wind Speed (m/s)</label>
          <input 
            type="number" 
            step="0.5"
            value={windSpeed}
            onChange={(e) => setWindSpeed(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-col w-36">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Wind Direction (°)</label>
          <input 
            type="number" 
            min="0" 
            max="360"
            value={windDirection}
            onChange={(e) => setWindDirection(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <div className="flex flex-col w-36">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Temp (°C)</label>
          <input 
            type="number" 
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="border border-slate-700 rounded-xl px-3.5 py-2 text-sm bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono shadow-inner"
          />
        </div>

        <button
          type="button"
          onClick={updateMapData}
          disabled={loading}
          className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-400 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? 'Calculating...' : 'Run Prediction'}
        </button>
      </div>

      {/* BOTTOM METRICS & LEGEND HUD */}
      <div className="absolute bottom-6 left-6 right-6 z-[1000] pointer-events-none flex flex-col md:flex-row justify-between items-end gap-4">
        
        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-5 rounded-2xl shadow-2xl text-xs text-slate-200 w-full md:w-[380px] space-y-2">
          <div className="font-bold text-slate-400 border-b border-slate-800 pb-2 mb-2 uppercase tracking-wider flex justify-between text-sm">
            <span>Simulation Diagnostics</span>
            <span className="text-red-400">LIVE FEED</span>
          </div>
          
          {loading && <em className="text-blue-400">Computing ML simulation...</em>}
          {error && <p className="text-red-400 font-bold">{error}</p>}

          {!loading && predictions && (
            <>
              <p className="flex justify-between text-sm"><span>Risk Level:</span> <b className={riskLevel === 'CRITICAL' ? 'text-red-400' : riskLevel === 'HIGH' ? 'text-orange-400' : 'text-cyan-300'}>{riskLevel}</b></p>
              <p className="flex justify-between text-sm"><span>Model Weather:</span> <b className="text-white">{predictions.environmental_forecast.temperature_c}°C, {predictions.environmental_forecast.humidity_pct}% Hum</b></p>
              <p className="flex justify-between text-sm"><span>Active Wind:</span> <b className="text-white">{predictions.environmental_forecast.wind_speed_ms} m/s @ {predictions.environmental_forecast.wind_direction_deg}°</b></p>
              <p className="flex justify-between text-sm"><span>Internal Stress:</span> <b className="text-white">{(predictions.threat_assessment.hoop_stress_pa / 1000000).toFixed(2)} MPa</b></p>
              <p className="text-red-400 font-bold pt-2 border-t border-slate-800 flex justify-between text-sm">
                <span>Time to Failure:</span> 
                <span>~{predictions.threat_assessment.time_to_failure_min} mins</span>
              </p>
            </>
          )}
        </div>

        <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-4 rounded-2xl shadow-2xl text-xs text-slate-200 flex items-center gap-5">
          <div className="font-bold uppercase tracking-wider text-slate-400 border-r border-slate-800 pr-4">Zones</div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 bg-[#ff3333] opacity-80 rounded-md inline-block shadow-sm"></span> Lethal Zone (10+ psi)
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 bg-[#ffaa00] opacity-80 rounded-md inline-block shadow-sm"></span> Injury Zone (1+ psi)
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-6 border-t-4 border-dashed border-cyan-400 inline-block"></span> Safe Approach
          </div>
        </div>

      </div>

    </div>
  );
}
