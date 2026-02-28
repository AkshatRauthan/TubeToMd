import os
import whisper
import tempfile
from typing import Optional
from app.config import settings
from app.models.schemas import (
    TranscriptSegment,
    WhisperTranscribeResponse,
    ChunkTranscribeResponse,
)
from app.utils.audio import extract_audio, get_audio_duration


# Load model once at startup
_model = None


def get_whisper_model():
    """Lazy-load whisper model"""
    global _model
    if _model is None:
        print(f"Loading Whisper model: {settings.WHISPER_MODEL}")
        _model = whisper.load_model(settings.WHISPER_MODEL)
        print(f"Whisper model loaded successfully")
    return _model


async def transcribe_chunk(
    file_path: str,
    chunk_index: int,
    chunk_offset: float,
    language: Optional[str] = None,
) -> ChunkTranscribeResponse:
    """
    Transcribe a single audio chunk with Whisper.
    Adjusts all segment timestamps by chunk_offset so they reflect
    their position in the original full-length video.
    """
    try:
        duration = get_audio_duration(file_path)

        model = get_whisper_model()
        whisper_options = {
            "verbose": False,
            "word_timestamps": False,
        }
        if language:
            whisper_options["language"] = language

        result = model.transcribe(file_path, **whisper_options)

        # Build segments with offset-adjusted timestamps
        segments = []
        for seg in result.get("segments", []):
            seg_start = float(seg["start"]) + chunk_offset
            seg_duration = float(seg["end"]) - float(seg["start"])
            segments.append(TranscriptSegment(
                start=round(seg_start, 3),
                duration=round(seg_duration, 3),
                text=seg["text"].strip(),
            ))

        return ChunkTranscribeResponse(
            success=True,
            chunk_index=chunk_index,
            chunk_offset=chunk_offset,
            duration=duration,
            transcript=segments,
            language=result.get("language", language or "en"),
        )

    except Exception as e:
        return ChunkTranscribeResponse(
            success=False,
            chunk_index=chunk_index,
            chunk_offset=chunk_offset,
            transcript=[],
            error=str(e),
        )


async def transcribe_uploaded_file(
    file_path: str,
    filename: str,
    language: Optional[str] = None
) -> WhisperTranscribeResponse:
    """
    Transcribe an uploaded audio/video file using OpenAI Whisper.
    Supports: mp4, mp3, wav, webm, m4a, ogg, flac, avi, mkv, mov
    """
    try:
        # Check if file is video — extract audio first
        video_extensions = {".mp4", ".webm", ".avi", ".mkv", ".mov", ".flv", ".wmv"}
        ext = os.path.splitext(file_path)[1].lower()

        if ext in video_extensions:
            audio_path = extract_audio(file_path)
        else:
            audio_path = file_path

        # Get duration
        duration = get_audio_duration(audio_path)

        # Transcribe with Whisper
        model = get_whisper_model()
        whisper_options = {
            "verbose": False,
            "word_timestamps": False,
        }
        if language:
            whisper_options["language"] = language

        result = model.transcribe(audio_path, **whisper_options)

        # Build transcript segments from Whisper's segments
        segments = []
        for seg in result.get("segments", []):
            segments.append(TranscriptSegment(
                start=float(seg["start"]),
                duration=float(seg["end"]) - float(seg["start"]),
                text=seg["text"].strip()
            ))

        # Clean up temp audio file if we extracted it
        if ext in video_extensions and os.path.exists(audio_path):
            os.remove(audio_path)

        return WhisperTranscribeResponse(
            success=True,
            filename=filename,
            duration=duration,
            transcript=segments,
            language=result.get("language", language or "en")
        )

    except Exception as e:
        return WhisperTranscribeResponse(
            success=False,
            filename=filename,
            transcript=[],
            error=str(e)
        )
