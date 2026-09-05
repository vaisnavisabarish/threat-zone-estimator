from dataclasses import dataclass

from .schemas import EstimateRequest


@dataclass(frozen=True)
class Source:
    east_m: float
    north_m: float
    diameter_m: float
    height_m: float
    fuel_mass_kg: float


def build_sources(request: EstimateRequest) -> list[Source]:
    """Create sources without duplicating the physics engine."""
    if request.configuration.value == "single":
        return [Source(0.0, 0.0, request.tank_diameter_m, request.tank_height_m, request.fuel_mass_kg)]
    diameter = request.tank_diameter_m / 2**0.5
    separation = max(request.tank_diameter_m * 1.5, diameter * 2.0)
    return [
        Source(-separation / 2, 0.0, diameter, request.tank_height_m, request.fuel_mass_kg / 2),
        Source(separation / 2, 0.0, diameter, request.tank_height_m, request.fuel_mass_kg / 2),
    ]
