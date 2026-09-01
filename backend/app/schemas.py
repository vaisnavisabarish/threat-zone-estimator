from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class HazardType(str, Enum):
    thermal = "thermal"
    blast = "blast"


class FacilityConfiguration(str, Enum):
    single = "single"
    dual = "dual"


class EstimateRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    configuration: FacilityConfiguration = FacilityConfiguration.single
    hazard_type: HazardType
    wind_speed_m_s: float = Field(ge=0, le=75)
    wind_direction_deg: float = Field(ge=0, lt=360)
    tank_diameter_m: float = Field(default=20, gt=0, le=200)
    tank_height_m: float = Field(default=15, gt=0, le=200)
    fuel_mass_kg: float = Field(default=50_000, gt=0, le=10_000_000)


class EstimateResponse(BaseModel):
    hazard_type: HazardType
    configuration: FacilityConfiguration
    wind: dict[str, Any]
    severity_zones: list[dict[str, Any]]
    geojson: dict[str, Any]
    metadata: dict[str, Any]
    lower_hazard_approach_direction: str
    disclaimer: str
