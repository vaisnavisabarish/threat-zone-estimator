# Threat-Zone Estimator

A computational threat-zone estimation system for industrial fire and explosion response.

## Overview

The system estimates wind-dependent thermal radiation and blast overpressure hazard zones based on facility configuration and prevailing wind conditions.

## Features

- Thermal radiation estimation
- Blast overpressure estimation
- Wind-dependent hazard geometry
- Multiple graded severity zones
- Geographic map visualization
- Multiple facility configurations
- Model-based lower-hazard approach direction

## Technology

- React
- Leaflet
- Python
- FastAPI
- NumPy
- Shapely
- GeoJSON

## Run the backend

Python 3.10+ is recommended.

```bash
python -m venv .venv
.venv/Scripts/pip install -r backend/requirements.txt
.venv/Scripts/uvicorn backend.app.main:app --reload
```

OpenAPI documentation is available at `http://127.0.0.1:8000/docs`. Health is `GET /health`; estimation is `POST /api/v1/estimate`.

```json
{
  "latitude": 19.076,
  "longitude": 72.878,
  "configuration": "dual",
  "hazard_type": "thermal",
  "wind_speed_m_s": 8,
  "wind_direction_deg": 45,
  "tank_diameter_m": 20,
  "tank_height_m": 15,
  "fuel_mass_kg": 50000
}
```

Wind direction is meteorological direction **from** (0=N, 90=E). The response contains `severity_zones`, a GeoJSON `FeatureCollection`, metadata, wind details, and `lower_hazard_approach_direction`.

## Tests

```bash
.venv/Scripts/pytest
```

See [methodology](docs/methodology.md) and [assumptions](docs/assumptions.md) before using results. This is an educational prototype, not a certified safety system.
