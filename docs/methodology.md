# Threat-Zone Estimator methodology

This hackathon model is an educational screening calculation, not a certified fire, explosion, emergency-response, or regulatory model. SI units are used internally.

## Coordinates, facilities, and wind

Calculations use a local tangent plane: `east` is +x and `north` is +y. Input wind direction follows the meteorological **FROM** convention: 0 degrees is wind from north, 90 from east, 180 from south, and 270 from west. The vector is reversed to obtain the downwind direction, then each point is projected into downwind and crosswind coordinates.

Wind changes effective distance rather than source energy. Downwind distance is compressed (extending contours), upwind distance is expanded, and crosswind distance is slightly expanded. The response grows linearly to a capped value at 15 m/s. Thermal transport uses the full response; blast uses 12% of it because blast waves are much less wind-sensitive. This is an explainable visualization approximation, not dispersion or CFD.

`single` creates one tank at the origin. `dual` conserves total fuel mass and approximate plan area across two smaller tanks separated east-west. Both feed the same physics functions.

## Thermal radiation

The source is represented by an effective cylindrical flame area. A configurable representative surface emissive power of 120 kW/m2 produces radiant power. Incident flux is that power divided by `4*pi*r^2`, multiplied by atmospheric transmission `0.85*exp(-0.0015*r)`. Source distance is floored at 2 m to avoid a singularity. Contributions from multiple sources are summed.

Reference severity thresholds are 2, 5, and 10 kW/m2 for moderate, high, and critical. They are visualization reference levels, not universal safety boundaries.

## Blast overpressure

Three percent of fuel combustion energy (46 MJ/kg) is converted to equivalent TNT energy (4.184 MJ/kg). Distance is divided by the cube root of equivalent TNT mass. Peak incident overpressure is log-log interpolated from a centralized scaled-distance lookup table; values beyond it decay by inverse square. Multiple-source estimates are summed for this MVP.

Reference thresholds are 6.895, 24.132, and 55.158 kPa (approximately 1, 3.5, and 8 psi) for moderate, high, and critical.

## Spatial output

A 1 km by 1 km local grid uses 25 m square cells. Intensity is evaluated at each cell center. Cells at or above the lowest threshold become GeoJSON Polygon Features with severity, hazard type, intensity, unit, and configuration properties. Coordinates are converted to WGS84 longitude/latitude using local metres-per-degree approximations. The API wraps these in one GeoJSON FeatureCollection.

## Lower-hazard approach direction

For each of eight compass sectors, the model averages intensity at 100, 200, and 300 m from the facility. The lowest score is returned as the **model-based lower-hazard approach direction**. Sector scores are included in metadata for transparency. It is not a guaranteed safe route and does not account for access, terrain, buildings, changing weather, or secondary hazards.
