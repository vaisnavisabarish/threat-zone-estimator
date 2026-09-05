# Deterministic tank calculations

This module isolates deterministic relationships found in ThermoVector's `scripts/tank.py`. It is not connected to either API and is not a tank-failure prediction system.

## Integrated calculations

### ThermoVector propane Antoine correlation

ThermoVector supplies:

`log10(P_bar) = 4.00272 - 806.794 / (T_celsius + 259.3)`

The implementation returns pressure in bar and provides an explicit bar-to-pascal conversion (`1 bar = 100,000 Pa`). The coefficient source and validated temperature interval are not documented in ThermoVector. The function therefore preserves compatibility with the teammate prototype but is explicitly unverified and must not be treated as an authoritative propane property correlation.

### Thin-wall circumferential stress

`sigma_hoop = (P_internal - P_external) * radius / wall_thickness`

Inputs use pascals and metres; output is pascals. Unlike ThermoVector, the implementation uses pressure differential rather than treating an absolute vapor pressure as gauge pressure. Atmospheric pressure defaults to 101,325 Pa but can be supplied explicitly.

Assumptions include a cylindrical thin-walled vessel, uniform static pressure and wall thickness, and no defects, corrosion, supports, thermal gradients, dynamic loading or material-strength calculation. The function is not a pressure-vessel code check.

## Deliberately excluded

- Random-forest time-to-failure training and prediction
- `tank_snapshots.csv` and all hard-coded paths
- Import-time or startup-time model training
- ThermoVector's 10% TNT conversion and fixed lethal/injury radii
- Any changes to the existing 3% TNT-efficiency blast-pressure model
- API integration

ThermoVector's TNT yield conflicts with the existing `DEFAULT_TNT_EFFICIENCY = 0.03`; the established project convention remains unchanged. Dataset provenance and failure-time label derivation are absent, so the ML component is not integrated.
