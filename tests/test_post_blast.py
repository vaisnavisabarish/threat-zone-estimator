from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.post_blast import post_blast_snapshot
from backend.app.schemas import PostBlastRequest


client = TestClient(app)
BASE = {
    "latitude": 19.076,
    "longitude": 72.878,
    "wind_speed_m_s": 8,
    "wind_direction_deg": 45,
    "configuration": "single",
    "tank_diameter_m": 20,
    "tank_height_m": 15,
    "fuel_mass_kg": 50_000,
    "time_offset_min": 30,
}


def test_valid_post_blast_request_and_endpoint():
    request = PostBlastRequest(**BASE)
    assert request.time_offset_min == 30
    response = client.post("/api/v1/post-blast", json=BASE)
    assert response.status_code == 200
    body = response.json()
    assert body["event_phase"] == "post_blast"
    assert body["time_offset_min"] == 30
    assert body["metadata"]["routing_included"] is False
    assert body["metadata"]["weather_forecast_included"] is False


def test_invalid_post_blast_request_values():
    invalid_changes = (
        {"latitude": 91}, {"latitude": -91},
        {"longitude": 181}, {"longitude": -181},
        {"wind_speed_m_s": -1}, {"wind_speed_m_s": 76},
        {"wind_direction_deg": -1}, {"wind_direction_deg": 360},
        {"time_offset_min": -1}, {"time_offset_min": 121},
    )
    for change in invalid_changes:
        response = client.post("/api/v1/post-blast", json={**BASE, **change})
        assert response.status_code == 422


def test_geojson_feature_collection_and_polygon_geometry():
    body = post_blast_snapshot(PostBlastRequest(**BASE))
    geojson = body["geojson"]
    assert geojson["type"] == "FeatureCollection"
    assert geojson["features"]
    for feature in geojson["features"]:
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Polygon"
        rings = feature["geometry"]["coordinates"]
        assert rings and len(rings[0]) >= 4
        assert rings[0][0] == rings[0][-1]
        for longitude, latitude in rings[0]:
            assert -180 <= longitude <= 180
            assert -90 <= latitude <= 90


def test_temporal_zone_order_and_no_heuristic_expansion():
    first = post_blast_snapshot(PostBlastRequest(**{**BASE, "time_offset_min": 0}))
    later = post_blast_snapshot(PostBlastRequest(**{**BASE, "time_offset_min": 120}))
    assert [zone["severity"] for zone in first["severity_zones"]] == ["critical", "high", "moderate"]
    assert first["metadata"]["zone_order"] == ["critical", "high", "moderate"]
    assert first["geojson"]["features"] != later["geojson"]["features"]
    first_geometry = [feature["geometry"] for feature in first["geojson"]["features"]]
    later_geometry = [feature["geometry"] for feature in later["geojson"]["features"]]
    assert first_geometry == later_geometry
    assert "not expanded" in later["metadata"]["temporal_model"]


def test_existing_estimate_contract_regression():
    existing = {key: value for key, value in BASE.items() if key != "time_offset_min"}
    existing["hazard_type"] = "blast"
    response = client.post("/api/v1/estimate", json=existing)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "hazard_type", "configuration", "wind", "severity_zones", "geojson", "metadata",
        "lower_hazard_approach_direction", "disclaimer",
    }
    assert body["hazard_type"] == "blast"
