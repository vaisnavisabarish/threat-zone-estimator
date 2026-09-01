import { useLocation, useNavigate } from 'react-router-dom';
import MapView from '../components/map/MapView';

const CELL_AREA = 25 * 25;

function zone(estimate, severity) {
  return estimate?.severity_zones?.find((z) => z.severity === severity);
}

function areaFor(estimate, severity) {
  return (zone(estimate, severity)?.cell_count ?? 0) * CELL_AREA;
}

function totalArea(estimate) {
  return ['critical', 'high', 'moderate'].reduce((sum, s) => sum + areaFor(estimate, s), 0);
}

function formatArea(value) {
  return `${Math.round(value).toLocaleString()} m²`;
}

function pctDelta(a, b) {
  if (!a || !b) return null;
  return ((b - a) / a) * 100;
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
        <div className="text-center"><div className="text-4xl mb-3">◌</div><p className="mb-4">No threat-estimation result is loaded.</p><button onClick={() => navigate('/configure')} className="px-5 py-2 rounded bg-white text-slate-950 font-bold">CREATE SCENARIO</button></div>
      </div>
    );
  }

  const latitude = scenario.facility?.latitude ?? 12.9719;
  const longitude = scenario.facility?.longitude ?? 79.1602;
  const windDirection = Number(scenario.environment?.wind_direction_deg ?? 135);
  const windSpeed = Number(scenario.environment?.wind_speed_mps ?? 8);
  const configuration = scenario.facility?.configuration ?? 'single_tank';
  const hazardType = scenario.hazard?.type ?? 'thermal_radiation';
  const hazardLabel = hazardType === 'blast_overpressure' ? 'BLAST OVERPRESSURE' : 'THERMAL RADIATION';
  const unit = hazardType === 'blast_overpressure' ? 'kPa' : 'kW/m²';
  const recommendedApproach = estimate?.lower_hazard_approach_direction ?? 'N/A';
  const critical = zone(estimate, 'critical');
  const high = zone(estimate, 'high');
  const moderate = zone(estimate, 'moderate');
  const currentArea = totalArea(estimate);
  const single = comparison?.single ?? (configuration === 'single_tank' ? estimate : null);
  const dual = comparison?.dual ?? (configuration === 'dual_tank' ? estimate : null);
  const singleArea = totalArea(single);
  const dualArea = totalArea(dual);
  const areaChange = pctDelta(singleArea, dualArea);
  const sourceCount = estimate?.metadata?.source_count ?? (configuration === 'dual_tank' ? 2 : 1);
  const gridSize = estimate?.metadata?.grid_cell_size_m ?? 25;
  const featureCount = estimate?.metadata?.feature_count ?? estimate?.geojson?.features?.length ?? 0;
  const downwind = (windDirection + 180) % 360;

  return (
    <div className="min-h-[calc(100vh-100px)] pb-6">
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
        <div>
          <div className="text-[10px] font-mono tracking-[.25em] text-red-400 mb-1">THERMAVECTOR / THREAT INTELLIGENCE</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Exposure Field</h2>
          <p className="text-xs text-slate-500 mt-1">Wind-coupled hazard geometry · {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
          <span className="px-3 py-1.5 rounded border border-green-900 bg-green-950/30 text-green-300">● MODEL COMPLETE</span>
          <span className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-slate-300">{configuration === 'dual_tank' ? 'DUAL TANK ARRAY' : 'SINGLE TANK'}</span>
          <span className="px-3 py-1.5 rounded border border-slate-700 bg-slate-900 text-orange-300">{hazardLabel}</span>
          <span className="px-3 py-1.5 rounded border border-sky-900 bg-sky-950/40 text-sky-300">WIND {windSpeed.toFixed(1)} m/s · {windDirection.toFixed(0)}°</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
        {[
          ['CRITICAL', critical?.cell_count ?? 0, 'cells', 'text-red-400'],
          ['HIGH', high?.cell_count ?? 0, 'cells', 'text-orange-400'],
          ['MODERATE', moderate?.cell_count ?? 0, 'cells', 'text-yellow-400'],
          ['MODELED AREA', Math.round(currentArea).toLocaleString(), 'm²', 'text-sky-300'],
          ['LOWER-RISK ENTRY', String(recommendedApproach).toUpperCase(), '', 'text-green-400'],
        ].map(([label, value, unitLabel, color]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">
            <div className="text-[9px] font-mono text-slate-500 tracking-wider">{label}</div>
            <div className={`mt-1 font-black font-mono text-sm ${color}`}>{value} <span className="text-[9px] text-slate-600">{unitLabel}</span></div>
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
            tankDiameter={scenario.facility?.diameter_m}
            tankHeight={scenario.facility?.height_m}
            severityZones={estimate?.severity_zones}
          />
        </div>

        <div className="space-y-3">
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-white font-black text-xs uppercase tracking-widest">Response Guidance</h3><span className="text-[9px] font-mono text-green-400 border border-green-900 bg-green-950/30 px-2 py-1 rounded">MODELLED</span></div>
            <div className="rounded-lg border border-green-900/50 bg-green-950/20 p-3">
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Recommended lower-risk entry</div>
              <div className="text-3xl font-black text-green-400 mt-1">↙ {String(recommendedApproach).toUpperCase()}</div>
              <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">Selected from eight compass sectors by sampling modeled exposure intensity. It is a model output, not a certified operational instruction.</p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="bg-slate-950 rounded border border-slate-800 p-2"><div className="text-[9px] text-slate-600">WIND FROM</div><div className="font-mono text-sky-300 text-sm mt-1">{windDirection.toFixed(0)}°</div></div>
              <div className="bg-slate-950 rounded border border-slate-800 p-2"><div className="text-[9px] text-slate-600">DOWNWIND</div><div className="font-mono text-sky-300 text-sm mt-1">{downwind.toFixed(0)}°</div></div>
              <div className="bg-slate-950 rounded border border-slate-800 p-2"><div className="text-[9px] text-slate-600">SOURCES</div><div className="font-mono text-sky-300 text-sm mt-1">{sourceCount}</div></div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3">Why This Exposure Shape?</h3>
            <div className="space-y-2">
              {[
                ['01', 'WIND EFFECT', `Field is elongated toward ${downwind.toFixed(0)}° downwind.`],
                ['02', 'SOURCE GEOMETRY', configuration === 'dual_tank' ? 'Two spatially separated sources create interacting fields.' : `Single source concentrates the modeled field around one tank.`],
                ['03', 'FALLOFF', `Each ${gridSize} m × ${gridSize} m cell receives a modeled ${unit} intensity.`],
                ['04', 'SEVERITY', 'Cells crossing engineering thresholds become critical, high or moderate zones.'],
              ].map(([num, title, body]) => (
                <div key={num} className="flex gap-3 border-b border-slate-800/70 pb-2 last:border-0 last:pb-0">
                  <div className="text-[9px] font-mono text-slate-600 pt-0.5">{num}</div><div><div className="text-[9px] font-bold text-slate-400">{title}</div><div className="text-[10px] text-slate-600 leading-relaxed mt-0.5">{body}</div></div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3"><h3 className="text-white font-black text-xs uppercase tracking-widest">Configuration Comparison</h3>{areaChange !== null && <span className={`text-[9px] font-mono px-2 py-1 rounded border ${areaChange >= 0 ? 'text-orange-300 border-orange-900 bg-orange-950/20' : 'text-green-300 border-green-900 bg-green-950/20'}`}>{areaChange >= 0 ? '+' : ''}{areaChange.toFixed(1)}% AREA</span>}</div>
            <div className="overflow-hidden rounded border border-slate-800">
              <table className="w-full text-[10px]"><thead className="bg-slate-950 text-slate-500"><tr><th className="text-left p-2 font-normal">Metric</th><th className="text-right p-2 font-normal">Single</th><th className="text-right p-2 font-normal">Dual</th></tr></thead>
                <tbody className="text-slate-300">
                  <tr className="border-t border-slate-800"><td className="p-2 text-slate-500">Modeled area</td><td className="p-2 text-right font-mono">{single ? formatArea(singleArea) : '—'}</td><td className="p-2 text-right font-mono">{dual ? formatArea(dualArea) : '—'}</td></tr>
                  <tr className="border-t border-slate-800"><td className="p-2 text-slate-500">Critical cells</td><td className="p-2 text-right font-mono text-red-400">{zone(single, 'critical')?.cell_count ?? '—'}</td><td className="p-2 text-right font-mono text-red-400">{zone(dual, 'critical')?.cell_count ?? '—'}</td></tr>
                  <tr className="border-t border-slate-800"><td className="p-2 text-slate-500">Source count</td><td className="p-2 text-right font-mono">1</td><td className="p-2 text-right font-mono">2</td></tr>
                  <tr className="border-t border-slate-800"><td className="p-2 text-slate-500">Geometry</td><td className="p-2 text-right">concentrated</td><td className="p-2 text-right">separated / overlap</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-[9px] text-slate-600 mt-2 leading-relaxed">Both configurations are evaluated under the same wind, location, tank dimensions and hazard model, so the difference isolates source geometry.</p>
          </section>

          <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-3">Computational Provenance</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-mono">
              <div><span className="text-slate-600">GRID</span><div className="text-slate-300 mt-0.5">{gridSize} m × {gridSize} m</div></div>
              <div><span className="text-slate-600">CELLS</span><div className="text-slate-300 mt-0.5">{featureCount}</div></div>
              <div><span className="text-slate-600">EXTENT</span><div className="text-slate-300 mt-0.5">±{estimate?.metadata?.grid_extent_m ?? 500} m</div></div>
              <div><span className="text-slate-600">UNIT</span><div className="text-slate-300 mt-0.5">{unit}</div></div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 text-[9px] text-slate-600 leading-relaxed">Simplified educational engineering model. Not certified for emergency operations, regulation or life-safety decisions.</div>
          </section>

          <button onClick={() => navigate('/configure')} className="w-full py-3 rounded-lg bg-white text-slate-950 font-black text-xs tracking-widest hover:bg-slate-200 transition">← RUN ANOTHER SCENARIO</button>
        </div>
      </div>
    </div>
  );
}
