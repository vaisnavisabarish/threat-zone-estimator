import { useState } from 'react';
import MapView from '../components/map/MapView';
import { postPostBlast } from '../api/client';

const defaultPayload = {
  latitude: 19.076,
  longitude: 72.878,
  wind_speed_m_s: 8,
  wind_direction_deg: 45,
  configuration: 'single',
  tank_diameter_m: 20,
  tank_height_m: 15,
  fuel_mass_kg: 50000,
  time_offset_min: 30,
};

const timeOptions = [0, 30, 60, 90, 120];

export default function PostBlast() {
  const [formData, setFormData] = useState(defaultPayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  const updateField = (field, value) => {
    const parsed = typeof defaultPayload[field] === 'number' ? Number(value) : value;
    setFormData((prev) => ({ ...prev, [field]: parsed }));
  };

  const fetchPostBlast = async (payload) => {
    setLoading(true);
    setError('');

    try {
      const result = await postPostBlast(payload);
      setResponse(result);
      return result;
    } catch (err) {
      setError(err.message || 'Unable to load post-blast analysis.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await fetchPostBlast(formData);
  };

  const handleTimeOffsetChange = async (nextMinutes) => {
    const payload = { ...formData, time_offset_min: nextMinutes };
    setFormData(payload);
    await fetchPostBlast(payload);
  };

  const incident = response?.incident ?? {
    latitude: formData.latitude,
    longitude: formData.longitude,
  };

  const center = [incident.latitude, incident.longitude];
  const windDirection = response?.wind?.direction_from_deg ?? formData.wind_direction_deg;
  const stagingPoint = response?.staging_point ?? null;
  const stagingNote = stagingPoint?.note ?? 'Visualization reference only; not a validated safe staging location.';
  const geoJsonKey = response
    ? `post-blast-${response.time_offset_min}-${response.geojson?.features?.length ?? 0}`
    : 'post-blast-empty';

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-black text-white tracking-wide uppercase mb-1">Post-Blast Analysis</h1>
        <p className="text-slate-400">Quasi-steady snapshot based on the current DER-02 backend contract.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <form onSubmit={handleSubmit} className="xl:col-span-4 space-y-6">
          <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-950/60 px-5 py-3 border-b border-slate-800">
              <h2 className="text-white font-bold uppercase tracking-widest text-sm">Incident Input</h2>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => updateField('latitude', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => updateField('longitude', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Wind Speed (m/s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.wind_speed_m_s}
                    onChange={(e) => updateField('wind_speed_m_s', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Wind Direction (°)</label>
                  <input
                    type="number"
                    min="0"
                    max="359"
                    value={formData.wind_direction_deg}
                    onChange={(e) => updateField('wind_direction_deg', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Configuration</label>
                <select
                  value={formData.configuration}
                  onChange={(e) => updateField('configuration', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                >
                  <option value="single">Single</option>
                  <option value="dual">Dual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Diameter (m)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={formData.tank_diameter_m}
                    onChange={(e) => updateField('tank_diameter_m', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Height (m)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={formData.tank_height_m}
                    onChange={(e) => updateField('tank_height_m', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Fuel mass (kg)</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={formData.fuel_mass_kg}
                  onChange={(e) => updateField('fuel_mass_kg', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded p-3 uppercase tracking-[0.2em]"
              >
                {loading ? 'Loading…' : 'Run analysis'}
              </button>
            </div>
          </section>

          {error && (
            <div className="rounded border border-red-500/60 bg-red-950/30 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </form>

        <div className="xl:col-span-8 space-y-6">
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-white font-bold uppercase tracking-widest text-sm">Time offset</h2>
                <p className="text-xs text-slate-500">Quasi-steady modeled snapshot</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {timeOptions.map((offset) => (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => handleTimeOffsetChange(offset)}
                    className={`px-3 py-2 rounded border text-xs font-mono uppercase transition ${
                      formData.time_offset_min === offset
                        ? 'border-red-500 bg-red-950/40 text-red-300'
                        : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                    }`}
                    disabled={loading}
                  >
                    T + {offset} min
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
              Time offset labels a quasi-steady modeled snapshot. Hazard geometry is not physically expanded over time.
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-3">
              <h2 className="text-white font-bold uppercase tracking-widest text-sm">Threat map</h2>
            </div>

            <div className="p-3">
              <MapView
                center={center}
                zoom={14}
                facilityPosition={center}
                hazardGeoJson={response?.geojson ?? { type: 'FeatureCollection', features: [] }}
                windDirection={windDirection}
                stagingPoint={stagingPoint}
                stagingNote={stagingNote}
                geoJsonKey={geoJsonKey}
              />
            </div>
          </section>

          {response && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase mb-3">Incident</h3>
                <div className="space-y-2 text-sm text-slate-200">
                  <div><span className="text-slate-500">Latitude:</span> {response.incident.latitude}</div>
                  <div><span className="text-slate-500">Longitude:</span> {response.incident.longitude}</div>
                  <div><span className="text-slate-500">Phase:</span> {response.event_phase}</div>
                  <div><span className="text-slate-500">Offset:</span> T + {response.time_offset_min} min</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase mb-3">Wind</h3>
                <div className="space-y-2 text-sm text-slate-200">
                  <div><span className="text-slate-500">Speed:</span> {response.wind.speed_m_s ?? response.wind.speed_mps ?? 'n/a'} m/s</div>
                  <div><span className="text-slate-500">Direction:</span> {response.wind.direction_from_deg ?? response.wind.direction_deg ?? 'n/a'}°</div>
                  <div><span className="text-slate-500">Convention:</span> {response.wind.convention ?? 'meteorological'}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase mb-3">Severity</h3>
                <div className="space-y-2 text-sm">
                  {response.severity_zones?.map((zone) => (
                    <div key={zone.severity} className="flex justify-between gap-3">
                      <span className="capitalize text-slate-300">{zone.severity}</span>
                      <span className="font-mono text-slate-200">{zone.threshold}</span>
                    </div>
                  )) ?? <div className="text-slate-400">No severity data returned.</div>}
                </div>
              </div>
            </div>
          )}

          {response && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase mb-3">Upwind visualization reference</h3>
                <div className="space-y-2 text-sm text-slate-200">
                  <div><span className="text-slate-500">Type:</span> {stagingPoint?.type ?? 'Point'}</div>
                  <div><span className="text-slate-500">Coordinates:</span> {stagingPoint?.coordinates ? `${stagingPoint.coordinates[1]}, ${stagingPoint.coordinates[0]}` : 'n/a'}</div>
                  <div><span className="text-slate-500">Note:</span> {stagingNote}</div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <h3 className="text-xs font-mono text-slate-400 uppercase mb-3">Model metadata</h3>
                <div className="space-y-2 text-sm text-slate-200">
                  <div><span className="text-slate-500">Grid extent:</span> {response.metadata?.grid_extent_m ?? 'n/a'} m</div>
                  <div><span className="text-slate-500">Cell size:</span> {response.metadata?.grid_cell_size_m ?? 'n/a'} m</div>
                  <div><span className="text-slate-500">Feature count:</span> {response.metadata?.feature_count ?? 'n/a'}</div>
                  {response.lower_hazard_approach_direction && (
                    <div><span className="text-slate-500">Lower hazard direction:</span> {response.lower_hazard_approach_direction}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {response?.disclaimer && (
            <div className="rounded border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
              {response.disclaimer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
