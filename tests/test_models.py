import math

import pytest

from backend.app.estimator import classify, estimate, lower_hazard_direction
from backend.app.facility import build_sources
from backend.app.physics import blast_overpressure_kpa, intensity_at, thermal_flux_kw_m2
from backend.app.schemas import EstimateRequest
from backend.app.wind import effective_distance, wind_relative, wind_toward_unit_vector


def request(**changes):
    values = dict(latitude=19.076, longitude=72.878, configuration="single", hazard_type="thermal",
                  wind_speed_m_s=8, wind_direction_deg=0, tank_diameter_m=20, tank_height_m=15,
                  fuel_mass_kg=50_000)
    values.update(changes)
    return EstimateRequest(**values)


def test_thermal_valid_decay_and_classification():
    assert thermal_flux_kw_m2(20, 20, 15) > thermal_flux_kw_m2(100, 20, 15) > 0
    assert classify(11, "thermal") == "critical"
    assert classify(6, "thermal") == "high"
    assert classify(3, "thermal") == "moderate"


def test_blast_valid_decay_and_classification():
    assert blast_overpressure_kpa(20, 50_000) > blast_overpressure_kpa(200, 50_000) > 0
    assert classify(60, "blast") == "critical"
    assert classify(30, "blast") == "high"
    assert classify(8, "blast") == "moderate"


@pytest.mark.parametrize("direction,expected", [(0, (0, -1)), (90, (-1, 0)), (180, (0, 1)), (270, (1, 0))])
def test_cardinal_wind_vectors(direction, expected):
    actual = wind_toward_unit_vector(direction)
    assert actual == pytest.approx(expected, abs=1e-12)


def test_wind_relative_transform_and_speed_variation():
    assert wind_relative(0, -100, 0) == pytest.approx((100, 0))
    assert effective_distance(0, -100, 0, 10, 1) < effective_distance(0, -100, 0, 0, 1)
    assert effective_distance(0, 100, 0, 10, 1) > effective_distance(0, 100, 0, 0, 1)


def test_facility_configurations_differ():
    single, dual = request(), request(configuration="dual")
    one, two = build_sources(single), build_sources(dual)
    assert len(one) == 1 and len(two) == 2
    a = intensity_at(20, 0, one, "thermal", 8, 0)
    b = intensity_at(20, 0, two, "thermal", 8, 0)
    assert a != b


def test_geojson_and_wind_change():
    north = estimate(request(wind_direction_deg=0))
    east = estimate(request(wind_direction_deg=90))
    assert north["geojson"]["type"] == "FeatureCollection"
    feature = north["geojson"]["features"][0]
    assert feature["geometry"]["type"] == "Polygon"
    assert {"severity", "hazard_type", "intensity", "configuration"} <= feature["properties"].keys()
    assert north["geojson"] != east["geojson"]


def test_approach_is_deterministic_and_has_all_sectors():
    req = request()
    sources = build_sources(req)
    first = lower_hazard_direction(sources, req)
    second = lower_hazard_direction(sources, req)
    assert first == second
    assert len(first[1]) == 8
