"""Isolated deterministic tank-state calculations adapted from ThermoVector.

These helpers are not connected to either API. The Antoine coefficients are
preserved for compatibility with the teammate prototype, but their source and
validated temperature range were not supplied and the result is not suitable
for safety decisions without independent domain validation.
"""

import math
from dataclasses import dataclass

BAR_TO_PA = 100_000.0
STANDARD_ATMOSPHERIC_PRESSURE_PA = 101_325.0

# ThermoVector labels these as propane Antoine coefficients with temperature in
# degrees Celsius and pressure in bar. Their provenance is currently unknown.
THERMOVECTOR_PROPANE_ANTOINE_A = 4.00272
THERMOVECTOR_PROPANE_ANTOINE_B = 806.794
THERMOVECTOR_PROPANE_ANTOINE_C = 259.3


@dataclass(frozen=True)
class TankMechanicalState:
    vapor_pressure_bar: float
    internal_pressure_pa: float
    external_pressure_pa: float
    pressure_differential_pa: float
    hoop_stress_pa: float


def _finite(name: str, value: float) -> float:
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite")
    return value


def propane_vapor_pressure_bar(temperature_c: float) -> float:
    """Return ThermoVector's unverified propane Antoine correlation in bar.

    Formula: log10(P_bar) = A - B / (T_celsius + C). Values at or below
    ``-C`` are rejected because this coefficient form is undefined/nonphysical
    there. This validation is mathematical, not a claim of a validated range.
    """
    temperature_c = _finite("temperature_c", temperature_c)
    denominator = temperature_c + THERMOVECTOR_PROPANE_ANTOINE_C
    if denominator <= 0:
        raise ValueError(
            f"temperature_c must be greater than {-THERMOVECTOR_PROPANE_ANTOINE_C} "
            "for this Antoine coefficient form"
        )
    return 10.0 ** (
        THERMOVECTOR_PROPANE_ANTOINE_A
        - THERMOVECTOR_PROPANE_ANTOINE_B / denominator
    )


def bar_to_pa(pressure_bar: float) -> float:
    """Convert a non-negative pressure from bar to pascals."""
    pressure_bar = _finite("pressure_bar", pressure_bar)
    if pressure_bar < 0:
        raise ValueError("pressure_bar must be non-negative")
    return pressure_bar * BAR_TO_PA


def thin_wall_hoop_stress_pa(
    internal_pressure_pa: float,
    tank_diameter_m: float,
    wall_thickness_m: float,
    external_pressure_pa: float = STANDARD_ATMOSPHERIC_PRESSURE_PA,
) -> float:
    """Return tensile circumferential stress using ``(Pi-Po)*r/t`` in Pa.

    Assumes a closed, thin-walled cylindrical vessel, uniform wall thickness,
    static pressure and no defects, corrosion, thermal gradients or supports.
    It is not a code-compliance or failure calculation.
    """
    internal_pressure_pa = _finite("internal_pressure_pa", internal_pressure_pa)
    external_pressure_pa = _finite("external_pressure_pa", external_pressure_pa)
    tank_diameter_m = _finite("tank_diameter_m", tank_diameter_m)
    wall_thickness_m = _finite("wall_thickness_m", wall_thickness_m)
    if internal_pressure_pa < 0 or external_pressure_pa < 0:
        raise ValueError("pressures must be non-negative")
    if internal_pressure_pa < external_pressure_pa:
        raise ValueError("internal pressure must be at least external pressure for tensile hoop stress")
    if tank_diameter_m <= 0 or wall_thickness_m <= 0:
        raise ValueError("tank diameter and wall thickness must be positive")
    radius_m = tank_diameter_m / 2.0
    return (internal_pressure_pa - external_pressure_pa) * radius_m / wall_thickness_m


def propane_tank_mechanical_state(
    temperature_c: float,
    tank_diameter_m: float,
    wall_thickness_m: float,
    external_pressure_pa: float = STANDARD_ATMOSPHERIC_PRESSURE_PA,
) -> TankMechanicalState:
    """Compose the isolated correlation and thin-wall stress calculation."""
    vapor_pressure_bar = propane_vapor_pressure_bar(temperature_c)
    internal_pressure_pa = bar_to_pa(vapor_pressure_bar)
    hoop_stress_pa = thin_wall_hoop_stress_pa(
        internal_pressure_pa,
        tank_diameter_m,
        wall_thickness_m,
        external_pressure_pa,
    )
    return TankMechanicalState(
        vapor_pressure_bar=vapor_pressure_bar,
        internal_pressure_pa=internal_pressure_pa,
        external_pressure_pa=float(external_pressure_pa),
        pressure_differential_pa=internal_pressure_pa - float(external_pressure_pa),
        hoop_stress_pa=hoop_stress_pa,
    )
