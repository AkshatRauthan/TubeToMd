from fastapi import APIRouter
from app.config import settings
from app.models.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        whisper_model=settings.WHISPER_MODEL
    )
