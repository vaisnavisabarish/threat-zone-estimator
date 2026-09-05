"""Deterministic post-blast snapshot built on the existing blast estimator.

The requested time offset labels a quasi-steady snapshot. It does not inflate or
advect zones over time: ThermoVector's time-scaling formula is an undocumented
visual heuristic and conflicts with this project's pressure-threshold model.
"""

from .constants import GRID_EXTENT_M
from .estimator import estimate, local_to_lon_lat
from .schemas import EstimateRequest, HazardType, PostBlastRequest
from .wind import wind_toward_unit_vector


def _upwind_staging_reference(request: PostBlastRequest) -> dict:
    downwind_east, downwind_north = wind_toward_unit_vector(request.wind_direction_deg)
    east_m = -downwind_east * GRID_EXTENT_M
    north_m = -downwind_north * GRID_EXTENT_M
    coordinates = local_to_lon_lat(east_m, north_m, request.latitude, request.longitude)
    return {
        "type": "Point",
        "coordinates": coordinates,
        "basis": "upwind edge of modeled grid",
        "distance_from_incident_m": GRID_EXTENT_M,
        "note": "Visualization reference only; not a validated safe staging location.",
    }


def post_blast_snapshot(request: PostBlastRequest) -> dict:
    """Return a blast-only GeoJSON snapshot without inventing temporal expansion."""
    estimate_request = EstimateRequest(
        latitude=request.latitude,
        longitude=request.longitude,
        configuration=request.configuration,
        hazard_type=HazardType.blast,
        wind_speed_m_s=request.wind_speed_m_s,
        wind_direction_deg=request.wind_direction_deg,
        tank_diameter_m=request.tank_diameter_m,
        tank_height_m=request.tank_height_m,
        fuel_mass_kg=request.fuel_mass_kg,
    )
    base = estimate(estimate_request)
    features = []
    for feature in base["geojson"]["features"]:
        enriched = {**feature, "properties": {
            **feature["properties"],
            "event_phase": "post_blast",
            "time_offset_min": request.time_offset_min,
        }}
        features.append(enriched)

    return {
        "event_phase": "post_blast",
        "time_offset_min": request.time_offset_min,
        "incident": {"latitude": request.latitude, "longitude": request.longitude},
        "wind": base["wind"],
        "facility": {
            "configuration": request.configuration.value,
            "tank_diameter_m": request.tank_diameter_m,
            "tank_height_m": request.tank_height_m,
            "fuel_mass_kg": request.fuel_mass_kg,
        },
        "severity_zones": base["severity_zones"],
        "geojson": {"type": "FeatureCollection", "features": features},
        "staging_point": _upwind_staging_reference(request),
        "metadata": {
            **base["metadata"],
            "zone_order": ["critical", "high", "moderate"],
            "temporal_model": "quasi-steady snapshot; geometry is not expanded by time offset",
            "routing_included": False,
            "weather_forecast_included": False,
        },
        "disclaimer": (
            "Educational prototype only. Time offset labels a quasi-steady snapshot; it does not model "
            "blast-wave travel, fire evolution, dispersion, or validated temporal zone expansion."
        ),
    }
