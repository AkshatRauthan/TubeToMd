import time
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes.health import router as health_router
from app.routes.transcription import router as transcription_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("tubetomd")

app = FastAPI(
    title="TubeToMD Transcription Service",
    description="Transcription microservice using OpenAI Whisper and youtube-transcript-api",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Skip health checks
    if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
        return await call_next(request)

    start = time.time()
    method = request.method
    path = request.url.path

    logger.info(f"🚀 {method} {path}")

    response = await call_next(request)

    duration_ms = round((time.time() - start) * 1000)
    status = response.status_code
    icon = "❌" if status >= 500 else "⚠️" if status >= 400 else "✅"
    logger.info(f"{icon} {method} {path} [{status}] {duration_ms}ms")

    return response


# Routes
app.include_router(health_router)
app.include_router(transcription_router)


@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 TubeToMD Transcription Service starting on port {settings.PORT}")
    logger.info(f"📝 Whisper model: {settings.WHISPER_MODEL}")
    logger.info(f"📂 Upload directory: {settings.UPLOAD_DIR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
    )
