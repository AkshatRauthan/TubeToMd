import os
import shutil
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from typing import Optional

from app.config import settings
from app.models.schemas import (
    YouTubeTranscribeRequest,
    YouTubeTranscribeResponse,
    WhisperTranscribeResponse,
    ChunkTranscribeResponse,
    MergeChunksRequest,
    MergeChunksResponse,
    TranscriptSegment,
    ErrorResponse,
)
from app.services.youtube_service import get_youtube_transcript
from app.services.whisper_service import transcribe_uploaded_file, transcribe_chunk

router = APIRouter(prefix="/transcribe", tags=["Transcription"])


@router.post(
    "/youtube",
    response_model=YouTubeTranscribeResponse,
    responses={400: {"model": ErrorResponse}},
)
async def transcribe_youtube(request: YouTubeTranscribeRequest):
    """
    Fetch timestamped transcript from a YouTube video.
    Uses youtube-transcript-api to get existing transcripts.
    """
    result = await get_youtube_transcript(
        video_url=request.video_url,
        language=request.language,
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result


ALLOWED_AUDIO_EXTENSIONS = {
    ".wav", ".mp3", ".webm", ".m4a", ".ogg", ".flac",
}

ALLOWED_EXTENSIONS = {
    ".mp4", ".mp3", ".wav", ".webm", ".m4a", ".ogg",
    ".flac", ".avi", ".mkv", ".mov", ".flv", ".wmv",
}


@router.post(
    "/chunk",
    response_model=ChunkTranscribeResponse,
    responses={400: {"model": ErrorResponse}},
)
async def transcribe_audio_chunk(
    file: UploadFile = File(...),
    chunk_index: int = Form(...),
    chunk_offset: float = Form(..., description="Offset in seconds for timestamp adjustment"),
    language: Optional[str] = Form(None),
):
    """
    Transcribe a single audio chunk using Whisper.
    The frontend extracts audio via FFmpeg.wasm and splits it into ~5 min chunks.
    Each chunk is sent here with its index and time offset.
    Timestamps in the response are adjusted by chunk_offset.
    """
    # Validate extension
    ext = os.path.splitext(file.filename or "chunk.wav")[1].lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {ext}. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}",
        )

    # Read file content
    contents = await file.read()
    max_chunk_bytes = 100 * 1024 * 1024  # 100MB per chunk
    if len(contents) > max_chunk_bytes:
        raise HTTPException(status_code=400, detail="Chunk exceeds 100MB limit")

    # Save temporarily
    unique_name = f"chunk_{chunk_index}_{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        result = await transcribe_chunk(
            file_path=file_path,
            chunk_index=chunk_index,
            chunk_offset=chunk_offset,
            language=language,
        )

        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)

        return result

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post(
    "/merge",
    response_model=MergeChunksResponse,
    responses={400: {"model": ErrorResponse}},
)
async def merge_chunk_transcripts(request: MergeChunksRequest):
    """
    Merge pre-transcribed chunk results into a single ordered transcript.
    Called by the backend after all chunks have been individually transcribed.
    Sorts segments by start time and deduplicates overlapping edges.
    """
    try:
        # Sort chunks by index
        sorted_chunks = sorted(request.chunks, key=lambda c: c.chunk_index)

        all_segments: list[TranscriptSegment] = []
        total_duration = 0.0
        detected_language = None

        for chunk in sorted_chunks:
            if not chunk.success:
                return MergeChunksResponse(
                    success=False,
                    session_id=request.session_id,
                    filename=request.filename,
                    error=f"Chunk {chunk.chunk_index} failed: {chunk.error}",
                )

            all_segments.extend(chunk.transcript)

            if chunk.duration:
                chunk_end = chunk.chunk_offset + chunk.duration
                total_duration = max(total_duration, chunk_end)

            if not detected_language and chunk.language:
                detected_language = chunk.language

        # Sort all segments by start time
        all_segments.sort(key=lambda s: s.start)

        # Deduplicate overlapping segments at chunk boundaries
        deduped: list[TranscriptSegment] = []
        for seg in all_segments:
            if deduped:
                prev = deduped[-1]
                prev_end = prev.start + prev.duration
                # Skip segments that are mostly overlapping with previous
                if seg.start < prev_end - 0.5 and seg.text.strip() == prev.text.strip():
                    continue
            deduped.append(seg)

        return MergeChunksResponse(
            success=True,
            session_id=request.session_id,
            filename=request.filename,
            total_duration=round(total_duration, 3) if total_duration > 0 else None,
            transcript=deduped,
            language=detected_language,
            chunk_count=len(sorted_chunks),
        )

    except Exception as e:
        return MergeChunksResponse(
            success=False,
            session_id=request.session_id,
            filename=request.filename,
            error=str(e),
        )


@router.post(
    "/upload",
    response_model=WhisperTranscribeResponse,
    responses={400: {"model": ErrorResponse}},
)
async def transcribe_upload(
    file: UploadFile = File(...),
    language: Optional[str] = None,
):
    """
    Transcribe an uploaded audio/video file using OpenAI Whisper.
    Legacy endpoint — kept for backward compatibility.
    Prefer using /chunk + /merge for large files.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate file size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
        )

    # Save file temporarily
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    try:
        with open(file_path, "wb") as f:
            f.write(contents)

        result = await transcribe_uploaded_file(
            file_path=file_path,
            filename=file.filename or unique_name,
            language=language,
        )

        if not result.success:
            raise HTTPException(status_code=400, detail=result.error)

        return result

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
