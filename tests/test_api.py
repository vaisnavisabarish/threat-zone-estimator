from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)
BASE = {"latitude": 19.076, "longitude": 72.878, "configuration": "single",
        "wind_speed_m_s": 8, "wind_direction_deg": 45, "tank_diameter_m": 20,
        "tank_height_m": 15, "fuel_mass_kg": 50000}


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_valid_thermal_and_blast_requests():
    for hazard in ("thermal", "blast"):
        response = client.post("/api/v1/estimate", json={**BASE, "hazard_type": hazard})
        assert response.status_code == 200
        body = response.json()
        assert body["hazard_type"] == hazard
        assert body["geojson"]["features"]
        assert body["lower_hazard_approach_direction"] in {"N", "NE", "E", "SE", "S", "SW", "W", "NW"}


def test_invalid_requests():
    for change in ({"latitude": 91}, {"hazard_type": "chemical"}, {"configuration": "triple"},
                   {"wind_speed_m_s": -1}, {"wind_direction_deg": 360}, {"tank_diameter_m": 0}):
        response = client.post("/api/v1/estimate", json={**BASE, "hazard_type": "thermal", **change})
        assert response.status_code == 422


def test_configuration_and_wind_speed_change_results():
    def run(**values):
        return client.post("/api/v1/estimate", json={**BASE, "hazard_type": "thermal", **values}).json()
    single, dual = run(), run(configuration="dual")
    calm, windy = run(wind_speed_m_s=0), run(wind_speed_m_s=15)
    assert single["geojson"] != dual["geojson"]
    assert calm["geojson"] != windy["geojson"]
