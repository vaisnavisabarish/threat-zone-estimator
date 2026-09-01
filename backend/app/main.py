from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .estimator import estimate
from .schemas import EstimateRequest, EstimateResponse

app = FastAPI(title="Threat-Zone Estimator", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/estimate", response_model=EstimateResponse)
def create_estimate(request: EstimateRequest) -> dict:
    return estimate(request)