import os
import tempfile
from typing import Optional
from groq import Groq
from app.config import settings
from app.models.schemas import (
    TranscriptSegment,
    WhisperTranscribeResponse,
    ChunkTranscribeResponse,
)
from app.utils.audio import extract_audio, get_audio_duration


# Groq client — initialized once
_client = None


def get_groq_client() -> Groq:
    """Lazy-load Groq client"""
    global _client
    if _client is None:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set in the environment")
        _client = Groq(api_key=api_key)
        print("✅ Groq Whisper client initialized")
    return _client


async def transcribe_chunk(
    file_path: str,
    chunk_index: int,
    chunk_offset: float,
    language: Optional[str] = None,
) -> ChunkTranscribeResponse:
    """
    Transcribe a single audio chunk using Groq Whisper API.
    Adjusts all segment timestamps by chunk_offset so they reflect
    their position in the original full-length video.
    """
    try:
        duration = get_audio_duration(file_path)

        client = get_groq_client()

        # Open file and send to Groq Whisper API
        with open(file_path, "rb") as audio_file:
            kwargs = {
                "file": (os.path.basename(file_path), audio_file),
                "model": "whisper-large-v3-turbo",
                "response_format": "verbose_json",
            }
            if language:
                kwargs["language"] = language

            result = client.audio.transcriptions.create(**kwargs)

        # Build segments with offset-adjusted timestamps
        segments = []
        if hasattr(result, "segments") and result.segments:
            for seg in result.segments:
                seg_start = float(seg.get("start", 0) if isinstance(seg, dict) else seg.start) + chunk_offset
                seg_end = float(seg.get("end", 0) if isinstance(seg, dict) else seg.end)
                seg_duration = seg_end - float(seg.get("start", 0) if isinstance(seg, dict) else seg.start)
                seg_text = (seg.get("text", "") if isinstance(seg, dict) else seg.text).strip()

                segments.append(TranscriptSegment(
                    start=round(seg_start, 3),
                    duration=round(seg_duration, 3),
                    text=seg_text,
                ))
        else:
            # Fallback: if no segments, create one segment from the full text
            full_text = result.text if hasattr(result, "text") else str(result)
            if full_text.strip():
                segments.append(TranscriptSegment(
                    start=round(chunk_offset, 3),
                    duration=round(duration, 3),
                    text=full_text.strip(),
                ))

        detected_language = "en"
        if hasattr(result, "language") and result.language:
            detected_language = result.language

        return ChunkTranscribeResponse(
            success=True,
            chunk_index=chunk_index,
            chunk_offset=chunk_offset,
            duration=duration,
            transcript=segments,
            language=detected_language,
        )

    except Exception as e:
        print(f"❌ Groq Whisper chunk transcription error: {e}")
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
    language: Optional[str] = None,
) -> WhisperTranscribeResponse:
    """
    Transcribe an uploaded audio/video file using Groq Whisper API.
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

        # Transcribe with Groq Whisper API
        client = get_groq_client()

        with open(audio_path, "rb") as audio_file:
            kwargs = {
                "file": (os.path.basename(audio_path), audio_file),
                "model": "whisper-large-v3-turbo",
                "response_format": "verbose_json",
            }
            if language:
                kwargs["language"] = language

            result = client.audio.transcriptions.create(**kwargs)

        # Build transcript segments
        segments = []
        if hasattr(result, "segments") and result.segments:
            for seg in result.segments:
                seg_start = float(seg.get("start", 0) if isinstance(seg, dict) else seg.start)
                seg_end = float(seg.get("end", 0) if isinstance(seg, dict) else seg.end)
                seg_text = (seg.get("text", "") if isinstance(seg, dict) else seg.text).strip()

                segments.append(TranscriptSegment(
                    start=seg_start,
                    duration=seg_end - seg_start,
                    text=seg_text,
                ))
        else:
            # Fallback: single segment from full text
            full_text = result.text if hasattr(result, "text") else str(result)
            if full_text.strip():
                segments.append(TranscriptSegment(
                    start=0.0,
                    duration=duration,
                    text=full_text.strip(),
                ))

        detected_language = language or "en"
        if hasattr(result, "language") and result.language:
            detected_language = result.language

        # Clean up temp audio file if we extracted it
        if ext in video_extensions and os.path.exists(audio_path):
            os.remove(audio_path)

        return WhisperTranscribeResponse(
            success=True,
            filename=filename,
            duration=duration,
            transcript=segments,
            language=detected_language,
        )

    except Exception as e:
        print(f"❌ Groq Whisper transcription error: {e}")
        return WhisperTranscribeResponse(
            success=False,
            filename=filename,
            transcript=[],
            error=str(e),
        )
