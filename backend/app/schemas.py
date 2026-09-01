from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class HazardType(str, Enum):
    thermal = "thermal"
    blast = "blast"


class FacilityConfiguration(str, Enum):
    single = "single"
    dual = "dual"


class WeatherForecast(BaseModel):
    """
    Predicted environmental conditions for one future timestep.
    """

    time_min: float = Field(ge=0)
    wind_speed_m_s: float = Field(ge=0, le=75)
    wind_direction_deg: float = Field(ge=0, lt=360)
    temperature_c: float


class EstimateRequest(BaseModel):
    # Facility location
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)

    # Facility configuration
    configuration: FacilityConfiguration = FacilityConfiguration.single
    hazard_type: HazardType

    # Tank geometry
    tank_diameter_m: float = Field(default=20, gt=0, le=200)
    tank_height_m: float = Field(default=15, gt=0, le=200)

    # Explosion/source information
    fuel_mass_kg: float = Field(
        default=50_000,
        gt=0,
        le=10_000_000
    )

    # Current environmental conditions
    current_wind_speed_m_s: float = Field(
        ge=0,
        le=75
    )

    current_wind_direction_deg: float = Field(
        ge=0,
        lt=360
    )

    current_temperature_c: float

    # Predicted future weather
    weather_forecast: list[WeatherForecast] = Field(
        min_length=1
    )


class EstimateResponse(BaseModel):
    hazard_type: HazardType
    configuration: FacilityConfiguration

    severity_zones: list[dict[str, Any]]

    # Hazard maps for each timestep
    timeline: list[dict[str, Any]]

    # Overall propagation information
    propagation: dict[str, Any]

    # Directional response information
    lower_hazard_approach_direction: str

    metadata: dict[str, Any]

    disclaimer: str
