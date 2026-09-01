"""Central model constants. All calculations use SI units internally."""

GRID_EXTENT_M = 500.0
GRID_CELL_SIZE_M = 25.0
MIN_SOURCE_DISTANCE_M = 2.0
AIR_ATTENUATION_PER_M = 0.0015
DEFAULT_ATMOSPHERIC_TRANSMISSIVITY = 0.85
THERMAL_THRESHOLDS_KW_M2 = {"moderate": 2.0, "high": 5.0, "critical": 10.0}
BLAST_THRESHOLDS_KPA = {"moderate": 6.895, "high": 24.132, "critical": 55.158}
TNT_ENERGY_J_PER_KG = 4.184e6
COMBUSTION_ENERGY_J_PER_KG = 46.0e6
DEFAULT_TNT_EFFICIENCY = 0.03
THERMAL_WIND_RESPONSE = 1.0
BLAST_WIND_RESPONSE = 0.12

# Approximate incident peak overpressure versus TNT scaled distance (m/kg^(1/3)).
TNT_SCALED_DISTANCE_TABLE = (
    (0.5, 700.0), (1.0, 300.0), (2.0, 100.0), (3.0, 50.0),
    (5.0, 20.0), (8.0, 8.0), (12.0, 3.5), (20.0, 1.0), (30.0, 0.4),
)
