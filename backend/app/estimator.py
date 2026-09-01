import math
from collections import Counter

from .constants import (
    BLAST_THRESHOLDS_KPA,
    GRID_CELL_SIZE_M,
    GRID_EXTENT_M,
    THERMAL_THRESHOLDS_KW_M2,
)

from .facility import build_sources
from .physics import intensity_at
from .schemas import EstimateRequest


SEVERITY_ORDER = (
    "critical",
    "high",
    "moderate",
)

COMPASS = (
    ("N", 0),
    ("NE", 45),
    ("E", 90),
    ("SE", 135),
    ("S", 180),
    ("SW", 225),
    ("W", 270),
    ("NW", 315),
)


def classify(intensity: float, hazard_type: str) -> str:

    thresholds = (
        THERMAL_THRESHOLDS_KW_M2
        if hazard_type == "thermal"
        else BLAST_THRESHOLDS_KPA
    )

    for severity in SEVERITY_ORDER:

        if intensity >= thresholds[severity]:
            return severity

    return "below_threshold"


def local_to_lon_lat(
    east_m: float,
    north_m: float,
    lat: float,
    lon: float,
) -> list[float]:

    return [
        lon + east_m /
        (
            111_320.0
            * max(math.cos(math.radians(lat)), 0.01)
        ),

        lat + north_m / 110_540.0,
    ]


def calculate_hazard_grid(
    sources,
    request: EstimateRequest,
    wind_speed: float,
    wind_direction: float,
):
    """
    Calculate the hazard field for one point in time.
    """

    features = []
    counts = Counter()

    half = GRID_CELL_SIZE_M / 2

    steps = int(
        2 * GRID_EXTENT_M /
        GRID_CELL_SIZE_M
    )

    maximum_distance = 0.0

    for ix in range(steps):

        east = (
            -GRID_EXTENT_M
            + half
            + ix * GRID_CELL_SIZE_M
        )

        for iy in range(steps):

            north = (
                -GRID_EXTENT_M
                + half
                + iy * GRID_CELL_SIZE_M
            )

            value = intensity_at(
                east,
                north,
                sources,
                request.hazard_type.value,
                wind_speed,
                wind_direction,
            )

            severity = classify(
                value,
                request.hazard_type.value,
            )

            if severity == "below_threshold":
                continue

            counts[severity] += 1

            distance = math.hypot(
                east,
                north,
            )

            maximum_distance = max(
                maximum_distance,
                distance,
            )

            corners = [
                (east - half, north - half),
                (east + half, north - half),
                (east + half, north + half),
                (east - half, north + half),
                (east - half, north - half),
            ]

            coordinates = [
                local_to_lon_lat(
                    e,
                    n,
                    request.latitude,
                    request.longitude,
                )
                for e, n in corners
            ]

            features.append({
                "type": "Feature",

                "properties": {
                    "severity": severity,

                    "hazard_type":
                        request.hazard_type.value,

                    "intensity":
                        round(value, 4),

                    "unit":
                        (
                            "kW/m2"
                            if request.hazard_type.value == "thermal"
                            else "kPa"
                        ),

                    "wind_speed_m_s":
                        wind_speed,

                    "wind_direction_deg":
                        wind_direction,

                    "configuration":
                        request.configuration.value,
                },

                "geometry": {
                    "type": "Polygon",

                    "coordinates": [
                        coordinates
                    ],
                },
            })

    return features, counts, maximum_distance


def calculate_direction_scores(
    sources,
    request: EstimateRequest,
    wind_speed: float,
    wind_direction: float,
):
    """
    Calculate hazard score for the eight compass directions.
    """

    scores = {}

    for label, bearing in COMPASS:

        angle = math.radians(bearing)

        samples = []

        for radius in (
            100.0,
            200.0,
            300.0,
        ):

            east = math.sin(angle) * radius
            north = math.cos(angle) * radius

            value = intensity_at(
                east,
                north,
                sources,
                request.hazard_type.value,
                wind_speed,
                wind_direction,
            )

            samples.append(value)

        scores[label] = sum(samples) / len(samples)

    return scores


def calculate_spread_distance(
    features,
    latitude,
    longitude,
):
    """
    Estimate maximum distance of the generated
    hazard cells from the facility.

    The current implementation derives this from
    the GeoJSON cells already generated by the model.
    """

    max_distance = 0.0

    for feature in features:

        coordinates = feature["geometry"]["coordinates"][0]

        for lon, lat in coordinates:

            north = (
                lat - latitude
            ) * 110_540.0

            east = (
                lon - longitude
            ) * (
                111_320.0
                * max(
                    math.cos(math.radians(latitude)),
                    0.01,
                )
            )

            distance = math.hypot(
                east,
                north,
            )

            max_distance = max(
                max_distance,
                distance,
            )

    return max_distance


def estimate(request: EstimateRequest) -> dict:

    sources = build_sources(request)

    timeline = []

    overall_counts = Counter()

    maximum_spread = 0.0

    lowest_direction = None
    lowest_score = float("inf")

    # --------------------------------------------------
    # Current + predicted weather states
    # --------------------------------------------------

    weather_states = [
        {
            "time_min": 0.0,
            "wind_speed_m_s":
                request.current_wind_speed_m_s,

            "wind_direction_deg":
                request.current_wind_direction_deg,

            "temperature_c":
                request.current_temperature_c,
        }
    ]

    weather_states.extend([
        {
            "time_min": forecast.time_min,

            "wind_speed_m_s":
                forecast.wind_speed_m_s,

            "wind_direction_deg":
                forecast.wind_direction_deg,

            "temperature_c":
                forecast.temperature_c,
        }

        for forecast in request.weather_forecast
    ])

    # --------------------------------------------------
    # Run physics simulation for every timestep
    # --------------------------------------------------

    for weather in weather_states:

        features, counts, grid_spread = (
            calculate_hazard_grid(
                sources,
                request,
                weather["wind_speed_m_s"],
                weather["wind_direction_deg"],
            )
        )

        # Accumulate severity counts
        overall_counts.update(counts)

        # Calculate geographic spread
        spread_distance = calculate_spread_distance(
            features,
            request.latitude,
            request.longitude,
        )

        maximum_spread = max(
            maximum_spread,
            spread_distance,
            grid_spread,
        )

        # Directional scores
        sector_scores = calculate_direction_scores(
            sources,
            request,
            weather["wind_speed_m_s"],
            weather["wind_direction_deg"],
        )

        approach = min(
            sector_scores,
            key=sector_scores.get,
        )

        if sector_scores[approach] < lowest_score:

            lowest_score = (
                sector_scores[approach]
            )

            lowest_direction = approach

        thresholds = (
            THERMAL_THRESHOLDS_KW_M2
            if request.hazard_type.value == "thermal"
            else BLAST_THRESHOLDS_KPA
        )

        zones = [
            {
                "severity": severity,

                "threshold": thresholds[severity],

                "cell_count":
                    counts.get(severity, 0),
            }

            for severity in SEVERITY_ORDER
        ]

        timeline.append({
            "time_min":
                weather["time_min"],

            "weather": {
                "wind_speed_m_s":
                    weather["wind_speed_m_s"],

                "wind_direction_deg":
                    weather["wind_direction_deg"],

                "temperature_c":
                    weather["temperature_c"],
            },

            "severity_zones": zones,

            "spread_distance_m":
                round(spread_distance, 2),

            "lower_hazard_direction":
                approach,

            "sector_scores": {
                key: round(value, 4)
                for key, value
                in sector_scores.items()
            },

            "geojson": {
                "type": "FeatureCollection",
                "features": features,
            },
        })

    # --------------------------------------------------
    # Overall severity summary
    # --------------------------------------------------

    thresholds = (
        THERMAL_THRESHOLDS_KW_M2
        if request.hazard_type.value == "thermal"
        else BLAST_THRESHOLDS_KPA
    )

    severity_zones = [
        {
            "severity": severity,

            "threshold": thresholds[severity],

            "total_cell_count":
                overall_counts.get(
                    severity,
                    0,
                ),
        }

        for severity in SEVERITY_ORDER
    ]

    # --------------------------------------------------
    # Return result
    # --------------------------------------------------

    return {

        "hazard_type":
            request.hazard_type.value,

        "configuration":
            request.configuration.value,

        "severity_zones":
            severity_zones,

        "timeline":
            timeline,

        "propagation": {

            "maximum_spread_distance_m":
                round(
                    maximum_spread,
                    2,
                ),

            "simulation_start_min":
                weather_states[0]["time_min"],

            "simulation_end_min":
                weather_states[-1]["time_min"],

            "timesteps":
                len(weather_states),
        },

        "lower_hazard_approach_direction":
            lowest_direction,

        "metadata": {

            "grid_extent_m":
                GRID_EXTENT_M,

            "grid_cell_size_m":
                GRID_CELL_SIZE_M,

            "source_count":
                len(sources),

            "model":
                "physics-based spatial hazard simulation",

            "wind_model":
                "external predicted wind input",

            "temperature_model":
                "external predicted temperature input",
        },

        "disclaimer":
            "Educational prototype only; not certified for safety, emergency response, or regulation.",
    }
