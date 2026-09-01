import math


def wind_toward_unit_vector(direction_from_deg: float) -> tuple[float, float]:
    """Return (east, north) direction toward which meteorological wind travels."""
    toward = math.radians((direction_from_deg + 180.0) % 360.0)
    return math.sin(toward), math.cos(toward)


def wind_relative(east_m: float, north_m: float, direction_from_deg: float) -> tuple[float, float]:
    """Return (downwind, crosswind) coordinates."""
    ue, un = wind_toward_unit_vector(direction_from_deg)
    return east_m * ue + north_m * un, east_m * un - north_m * ue


def effective_distance(
    east_m: float,
    north_m: float,
    direction_from_deg: float,
    wind_speed_m_s: float,
    response: float,
) -> float:
    downwind, crosswind = wind_relative(east_m, north_m, direction_from_deg)

    # Smooth wind response: higher wind progressively elongates the downwind
    # field instead of abruptly saturating at 15 m/s.
    wind_factor = 2.5 * (1.0 - math.exp(-wind_speed_m_s / 18.0))
    influence = response * wind_factor

    along_scale = 1.0 + influence if downwind >= 0 else 1.0 / (1.0 + 0.35 * influence)
    cross_scale = 1.0 / (1.0 + 0.15 * influence)

    return math.hypot(
        downwind / along_scale,
        crosswind / cross_scale,
    )
