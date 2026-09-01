import bisect
import math

from .constants import (AIR_ATTENUATION_PER_M, BLAST_WIND_RESPONSE, COMBUSTION_ENERGY_J_PER_KG,
                        DEFAULT_ATMOSPHERIC_TRANSMISSIVITY, DEFAULT_TNT_EFFICIENCY,
                        MIN_SOURCE_DISTANCE_M, THERMAL_WIND_RESPONSE, TNT_ENERGY_J_PER_KG,
                        TNT_SCALED_DISTANCE_TABLE)
from .facility import Source
from .wind import effective_distance


def thermal_flux_kw_m2(distance_m: float, diameter_m: float, height_m: float) -> float:
    """Effective flame emissive power with spherical spreading and air attenuation."""
    distance = max(distance_m, MIN_SOURCE_DISTANCE_M)
    flame_area_m2 = math.pi * diameter_m * (height_m + diameter_m / 2)
    emissive_power_kw_m2 = 120.0
    radiant_power_kw = emissive_power_kw_m2 * flame_area_m2
    transmission = DEFAULT_ATMOSPHERIC_TRANSMISSIVITY * math.exp(-AIR_ATTENUATION_PER_M * distance)
    return radiant_power_kw * transmission / (4.0 * math.pi * distance**2)


def blast_overpressure_kpa(distance_m: float, fuel_mass_kg: float) -> float:
    equivalent_tnt_kg = fuel_mass_kg * COMBUSTION_ENERGY_J_PER_KG * DEFAULT_TNT_EFFICIENCY / TNT_ENERGY_J_PER_KG
    scaled = max(distance_m, MIN_SOURCE_DISTANCE_M) / equivalent_tnt_kg ** (1.0 / 3.0)
    distances = [row[0] for row in TNT_SCALED_DISTANCE_TABLE]
    if scaled <= distances[0]:
        return TNT_SCALED_DISTANCE_TABLE[0][1]
    if scaled >= distances[-1]:
        z, pressure = TNT_SCALED_DISTANCE_TABLE[-1]
        return pressure * (z / scaled) ** 2
    index = bisect.bisect_right(distances, scaled)
    z1, p1 = TNT_SCALED_DISTANCE_TABLE[index - 1]
    z2, p2 = TNT_SCALED_DISTANCE_TABLE[index]
    fraction = (math.log(scaled) - math.log(z1)) / (math.log(z2) - math.log(z1))
    return math.exp(math.log(p1) + fraction * (math.log(p2) - math.log(p1)))


def intensity_at(east_m: float, north_m: float, sources: list[Source], hazard_type: str,
                 wind_speed_m_s: float, wind_direction_deg: float) -> float:
    total = 0.0
    response = THERMAL_WIND_RESPONSE if hazard_type == "thermal" else BLAST_WIND_RESPONSE
    for source in sources:
        distance = effective_distance(east_m - source.east_m, north_m - source.north_m,
                                      wind_direction_deg, wind_speed_m_s, response)
        if hazard_type == "thermal":
            total += thermal_flux_kw_m2(distance, source.diameter_m, source.height_m)
        else:
            total += blast_overpressure_kpa(distance, source.fuel_mass_kg)
    return total
