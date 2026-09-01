import math
from collections import Counter

from .constants import BLAST_THRESHOLDS_KPA, GRID_CELL_SIZE_M, GRID_EXTENT_M, THERMAL_THRESHOLDS_KW_M2
from .facility import build_sources
from .physics import intensity_at
from .schemas import EstimateRequest

SEVERITY_ORDER = ("critical", "high", "moderate")
COMPASS = (("N", 0), ("NE", 45), ("E", 90), ("SE", 135), ("S", 180), ("SW", 225), ("W", 270), ("NW", 315))


def classify(intensity: float, hazard_type: str) -> str:
    thresholds = THERMAL_THRESHOLDS_KW_M2 if hazard_type == "thermal" else BLAST_THRESHOLDS_KPA
    for severity in SEVERITY_ORDER:
        if intensity >= thresholds[severity]:
            return severity
    return "below_threshold"


def local_to_lon_lat(east_m: float, north_m: float, lat: float, lon: float) -> list[float]:
    return [lon + east_m / (111_320.0 * max(math.cos(math.radians(lat)), 0.01)), lat + north_m / 110_540.0]


def lower_hazard_direction(sources, request: EstimateRequest) -> tuple[str, dict[str, float]]:
    scores = {}
    for label, bearing in COMPASS:
        angle = math.radians(bearing)
        samples = [intensity_at(math.sin(angle) * r, math.cos(angle) * r, sources,
                                request.hazard_type.value, request.wind_speed_m_s,
                                request.wind_direction_deg) for r in (100.0, 200.0, 300.0)]
        scores[label] = sum(samples) / len(samples)
    return min(scores, key=scores.get), scores


def estimate(request: EstimateRequest) -> dict:
    sources = build_sources(request)
    features = []
    counts = Counter()
    half = GRID_CELL_SIZE_M / 2
    steps = int(2 * GRID_EXTENT_M / GRID_CELL_SIZE_M)
    for ix in range(steps):
        east = -GRID_EXTENT_M + half + ix * GRID_CELL_SIZE_M
        for iy in range(steps):
            north = -GRID_EXTENT_M + half + iy * GRID_CELL_SIZE_M
            value = intensity_at(east, north, sources, request.hazard_type.value,
                                 request.wind_speed_m_s, request.wind_direction_deg)
            severity = classify(value, request.hazard_type.value)
            if severity == "below_threshold":
                continue
            counts[severity] += 1
            corners = [(east-half, north-half), (east+half, north-half), (east+half, north+half),
                       (east-half, north+half), (east-half, north-half)]
            features.append({"type": "Feature", "properties": {
                "severity": severity, "hazard_type": request.hazard_type.value,
                "intensity": round(value, 4), "unit": "kW/m2" if request.hazard_type.value == "thermal" else "kPa",
                "configuration": request.configuration.value,
            }, "geometry": {"type": "Polygon", "coordinates": [[local_to_lon_lat(e, n, request.latitude, request.longitude) for e, n in corners]]}})
    approach, sector_scores = lower_hazard_direction(sources, request)
    thresholds = THERMAL_THRESHOLDS_KW_M2 if request.hazard_type.value == "thermal" else BLAST_THRESHOLDS_KPA
    zones = [{"severity": s, "threshold": thresholds[s], "cell_count": counts[s]} for s in SEVERITY_ORDER]
    return {
        "hazard_type": request.hazard_type.value, "configuration": request.configuration.value,
        "wind": {"speed_m_s": request.wind_speed_m_s, "direction_from_deg": request.wind_direction_deg,
                 "convention": "meteorological: direction FROM; 0=N, 90=E"},
        "severity_zones": zones, "geojson": {"type": "FeatureCollection", "features": features},
        "metadata": {"grid_extent_m": GRID_EXTENT_M, "grid_cell_size_m": GRID_CELL_SIZE_M,
                     "feature_count": len(features), "source_count": len(sources),
                     "sector_scores": {k: round(v, 4) for k, v in sector_scores.items()},
                     "model": "simplified educational effective-distance model"},
        "lower_hazard_approach_direction": approach,
        "disclaimer": "Educational prototype only; not certified for safety, emergency response, or regulation.",
    }
