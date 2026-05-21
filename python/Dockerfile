# ──────────────────────────────────────────────────────────────
# TubeToMD Python Service — Production Dockerfile
# ──────────────────────────────────────────────────────────────
# Used by: docker-compose.prod.yml, HuggingFace Spaces
# Features: Slim image, ffmpeg installed, dynamic PORT
#
# Supports dynamic PORT via environment variable:
#   - docker-compose.prod.yml → PORT=8000
#   - HuggingFace Spaces      → PORT=7860
# ──────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg for audio processing)
# Works on both Linux and Windows Docker (Linux containers)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Create uploads directory
RUN mkdir -p /app/uploads

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    rm -rf /root/.cache/pip

# Copy source code
COPY . .

# Default port (overridden by env in compose/HF)
ENV PORT=8000

# Expose both possible ports
EXPOSE 8000 7860

# Use shell form so $PORT is evaluated at runtime
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
