from fastapi import FastAPI

from .estimator import estimate
from .schemas import EstimateRequest, EstimateResponse

app = FastAPI(title="Threat-Zone Estimator", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/estimate", response_model=EstimateResponse)
def create_estimate(request: EstimateRequest) -> dict:
    return estimate(request)
