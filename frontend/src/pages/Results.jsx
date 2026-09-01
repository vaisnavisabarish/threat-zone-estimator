import { useLocation, useNavigate } from 'react-router-dom';
import MapView from '../components/map/MapView';

const CELL_AREA = 25 * 25;

function zone(estimate, severity) {
  return estimate?.severity_zones?.find((z) => z.severity === severity);
}

function areaFor(estimate, severity) {
  return (zone(estimate, severity)?.cell_count ?? 0) * CELL_AREA;
}

function formatArea(value) {
  return `${Math.round(value).toLocaleString()} m²`;
}

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const scenario = location.state?.scenario;
  const estimate = location.state?.estimate;
  const comparison = location.state?.comparison;

  if (!scenario || !estimate) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-slate-300">
        <div className="text-center">
          <div className="text-4xl mb-3">◌</div>
          <p className="mb-4">No threat-estimation result is loaded.</p>
          <button
            onClick={() => navigate('/configure')}
            className="px-5 py-2 rounded bg-white text-slate-950 font-bold"
          >
            CREATE SCENARIO
          </button>
        </div>
      </div>
    );
  }

  const latitude = scenario.facility?.latitude ?? 12.9719;
  const longitude = scenario.facility?.longitude ?? 79.1602;
  const windDirection = scenario.environment?.wind_direction_deg ?? 135;
  const windSpeed = scenario.environment?.wind_speed_mps ?? 8;
  const configuration = scenario.facility?.configuration ?? 'single_tank';
  const hazardType = scenario.hazard?.type ?? 'thermal_radiation';

  const hazardLabel =
    hazardType === 'blast_overpressure'
      ? 'BLAST OVERPRESSURE'
      : 'THERMAL RADIATION';

  const recommendedApproach =
    estimate?.lower_hazard_approach_direction ?? 'N/A';

  const critical = zone(estimate, 'critical');
  const high = zone(estimate, 'high');
  const moderate = zone(estimate, 'moderate');

  const currentArea =
    areaFor(estimate, 'critical') +
    areaFor(estimate, 'high') +
    areaFor(estimate, 'moderate');

  const single = comparison?.single ?? (configuration === 'single_tank' ? estimate : null);
  const dual = comparison?.dual ?? (configuration === 'dual_tank' ? estimate : null);

  return (
    <div className="min-h-[calc(100vh-100px)] pb-6">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div>
          <div className="text-[10px] font-mono tracking-[.25em] text-red-400 mb-1">
            THERMAVECTOR / THREAT INTELLIGENCE
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Exposure Field
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Wind-coupled hazard geometry · {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <span className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300">
            {configuration === 'dual_tank' ? 'DUAL TANK ARRAY' : 'SINGLE TANK'}
          </span>
          <span className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-orange-300">
            {hazardLabel}
          </span>
          <span className="px-3 py-1.5 rounded border border-sky-900 bg-sky-950/40 text-sky-300">
            WIND {windSpeed.toFixed(1)} m/s · {windDirection.toFixed(0)}°
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
        {[
          ['CRITICAL', critical?.cell_count ?? 0, 'cells', 'text-red-400'],
          ['HIGH', high?.cell_count ?? 0, 'cells', 'text-orange-400'],
          ['MODERATE', moderate?.cell_count ?? 0, 'cells', 'text-yellow-400'],
          ['MODELED AREA', Math.round(currentArea).toLocaleString(), 'm²', 'text-sky-300'],
          ['LOWER-RISK ENTRY', String(recommendedApproach).toUpperCase(), '', 'text-green-400'],
        ].map(([label, value, unit, color]) => (
          <div
            key={label}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5"
          >
            <div className="text-[9px] font-mono text-slate-500 tracking-wider">
              {label}
            </div>
            <div className={`mt-1 font-black font-mono text-sm ${color}`}>
              {value} <span className="text-[9px] text-slate-600">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3.3fr)_minmax(300px,1fr)] gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative min-h-[620px]">
          <MapView
            center={[latitude, longitude]}
            facilityPosition={[latitude, longitude]}
            windDirection={windDirection}
            windSpeed={windSpeed}
            hazardGeoJson={estimate?.geojson}
            hazardType={hazardType}
            configuration={configuration}
            recommendedApproach={recommendedApproach}
          />
        </div>

        <div className="space-y-3">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-black text-xs uppercase tracking-widest">
                Response Guidance
              </h3>
              <span className="text-[9px] font-mono text-green-400 border border-green-900 bg-green-950/30 px-2 py-1 rounded">
                MODELLED
              </span>
            </div>

            <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">
                Lowest modeled exposure sector
              </div>
              <div className="text-2xl font-black text-green-400 mt-1">
                {String(recommendedApproach).toUpperCase()}
              </div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                Approach recommendation is derived by sampling modeled intensity
                across eight compass sectors.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-slate-950 rounded border border-slate-800 p-2">
                <div className="text-[9px] text-slate-600">WIND FROM</div>
                <div className="font-mono text-sky-300 text-sm mt-1">{windDirection.toFixed(0)}°</div>
              </div>
              <div className="bg-slate-950 rounded border border-slate-800 p-2">
                <div className="text-[9px] text-slate-600">DOWNWIND</div>
                <div className="font-mono text-sky-300 text-sm mt-1">{((windDirection + 180) % 360).toFixed(0)}°</div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3">
              Configuration Comparison
            </h3>

            <div className="overflow-hidden rounded border border-slate-800">
              <table className="w-full text-[10px]">
                <thead className="bg-slate-950 text-slate-500">
                  <tr>
                    <th className="text-left p-2 font-normal">Metric</th>
                    <th className="text-right p-2 font-normal">Single</th>
                    <th className="text-right p-2 font-normal">Dual</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-t border-slate-800">
                    <td className="p-2 text-slate-500">Modeled area</td>
                    <td className="p-2 text-right font-mono">
                      {single ? formatArea(areaFor(single, 'critical') + areaFor(single, 'high') + areaFor(single, 'moderate')) : '—'}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {dual ? formatArea(areaFor(dual, 'critical') + areaFor(dual, 'high') + areaFor(dual, 'moderate')) : '—'}
                    </td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="p-2 text-slate-500">Critical cells</td>
                    <td className="p-2 text-right font-mono text-red-400">{zone(single, 'critical')?.cell_count ?? '—'}</td>
                    <td className="p-2 text-right font-mono text-red-400">{zone(dual, 'critical')?.cell_count ?? '—'}</td>
                  </tr>
                  <tr className="border-t border-slate-800">
                    <td className="p-2 text-slate-500">Geometry</td>
                    <td className="p-2 text-right">compact</td>
                    <td className="p-2 text-right">overlap / wider</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">
              Dual configuration uses two spatially separated sources with split
              fuel mass, so their modeled fields can overlap and change the footprint.
            </p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3">
              Model Trace
            </h3>
            <div className="space-y-2 text-[10px] font-mono">
              <div className="flex justify-between"><span className="text-slate-600">GRID</span><span className="text-slate-300">25 m cells</span></div>
              <div className="flex justify-between"><span className="text-slate-600">EXTENT</span><span className="text-slate-300">±500 m</span></div>
              <div className="flex justify-between"><span className="text-slate-600">FEATURES</span><span className="text-slate-300">{estimate?.metadata?.feature_count ?? estimate?.geojson?.features?.length ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">SOURCES</span><span className="text-slate-300">{estimate?.metadata?.source_count ?? '—'}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 text-[9px] text-slate-600">
              Educational engineering model. Not certified for emergency operations.
            </div>
          </section>

          <button
            onClick={() => navigate('/configure')}
            className="w-full py-3 rounded-lg bg-white text-slate-950 font-black text-xs tracking-widest hover:bg-slate-200 transition"
          >
            ← RUN ANOTHER SCENARIO
          </button>
        </div>
      </div>
    </div>
  );
}
