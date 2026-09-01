import math

import pytest

from backend.app.tank_thermal import (
    STANDARD_ATMOSPHERIC_PRESSURE_PA,
    bar_to_pa,
    propane_tank_mechanical_state,
    propane_vapor_pressure_bar,
    thin_wall_hoop_stress_pa,
)


def test_thermovector_antoine_relationship_at_known_input():
    # Direct evaluation of 10 ** (4.00272 - 806.794 / (20 + 259.3)).
    assert propane_vapor_pressure_bar(20.0) == pytest.approx(13.00442892391225)
    assert propane_vapor_pressure_bar(30.0) > propane_vapor_pressure_bar(20.0)


def test_bar_to_pa_exact_conversion():
    assert bar_to_pa(1.0) == 100_000.0
    assert bar_to_pa(2.5) == 250_000.0


def test_thin_wall_hoop_stress_uses_pressure_differential():
    # Delta P=100 kPa, radius=0.5 m and thickness=0.01 m gives 5 MPa.
    stress = thin_wall_hoop_stress_pa(
        internal_pressure_pa=200_000,
        external_pressure_pa=100_000,
        tank_diameter_m=1.0,
        wall_thickness_m=0.01,
    )
    assert stress == 5_000_000.0
    assert thin_wall_hoop_stress_pa(200_000, 1.0, 0.01, 0) == 10_000_000.0


def test_composed_tank_state_is_internally_consistent():
    state = propane_tank_mechanical_state(20.0, 1.0, 0.01)
    assert state.internal_pressure_pa == pytest.approx(state.vapor_pressure_bar * 100_000)
    assert state.external_pressure_pa == STANDARD_ATMOSPHERIC_PRESSURE_PA
    assert state.pressure_differential_pa == pytest.approx(
        state.internal_pressure_pa - STANDARD_ATMOSPHERIC_PRESSURE_PA
    )
    assert state.hoop_stress_pa == pytest.approx(
        state.pressure_differential_pa * 0.5 / 0.01
    )


@pytest.mark.parametrize(
    "call",
    [
        lambda: propane_vapor_pressure_bar(float("nan")),
        lambda: propane_vapor_pressure_bar(-259.3),
        lambda: bar_to_pa(-1),
        lambda: thin_wall_hoop_stress_pa(-1, 1, 0.01),
        lambda: thin_wall_hoop_stress_pa(100_000, 0, 0.01, 0),
        lambda: thin_wall_hoop_stress_pa(100_000, 1, 0, 0),
        lambda: thin_wall_hoop_stress_pa(90_000, 1, 0.01, 100_000),
        lambda: thin_wall_hoop_stress_pa(math.inf, 1, 0.01, 0),
    ],
)
def test_invalid_physical_or_nonfinite_inputs(call):
    with pytest.raises(ValueError):
        call()
