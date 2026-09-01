from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .estimator import estimate
from .post_blast import post_blast_snapshot
from .schemas import EstimateRequest, EstimateResponse, PostBlastRequest, PostBlastResponse

app = FastAPI(title="Threat-Zone Estimator", version="0.1.0")

# Add CORS middleware for development - allows frontend to communicate with backend
# regardless of whether it's accessed via localhost or network IP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development only; restrict in production
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


@app.post("/api/v1/post-blast", response_model=PostBlastResponse)
def create_post_blast_snapshot(request: PostBlastRequest) -> dict:
    return post_blast_snapshot(request)
