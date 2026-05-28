from fastapi import APIRouter
from app.config import settings
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/")
async def root_health_check():
    """Root health check for HF Spaces and load balancers."""
    return {"status": "ok", "service": "TubeToMD Transcription Service"}


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        transcription_engine="groq-whisper"
    )
