# Post-blast foundation

`POST /api/v1/post-blast` provides a deterministic blast-hazard snapshot for a requested time offset from 0 to 120 minutes. It reuses the existing TNT-equivalence overpressure lookup, severity thresholds, grid, coordinate conversion, and meteorological wind-direction convention.

The current implementation is deliberately **quasi-steady**. The time offset is included in response and GeoJSON metadata, but it does not expand or advect the geometry. ThermoVector's temporal radius multiplier and minute-based displacement were not adopted because they conflict with the existing pressure-threshold calculation and have no documented physical validation.

The returned staging point is the upwind edge of the modeled grid. It is visualization metadata only, not routing advice or a validated safe location. Rescue routing and weather-model integration are not included in this foundation.

This educational prototype is not certified for emergency response, evacuation, industrial safety, or regulatory use.
