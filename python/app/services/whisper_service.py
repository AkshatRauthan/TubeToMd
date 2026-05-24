import os
import tempfile
from typing import Optional
from app.config import settings
from app.models.schemas import (
    TranscriptSegment,
    WhisperTranscribeResponse,
    ChunkTranscribeResponse,
)
from app.utils.audio import extract_audio, get_audio_duration


from app.services.groq_key_manager import groq_key_manager


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

        max_retries = max(1, groq_key_manager.get_total_keys())
        result = None
        last_error = None
        
        for attempt in range(max_retries):
            try:
                client, key = groq_key_manager.get_client()

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
                    break # Success!

            except Exception as e:
                error_str = str(e).lower()
                last_error = e
                if "429" in error_str or "rate limit" in error_str or "too many requests" in error_str:
                    # Try to extract retry-after if present, default to 65s
                    groq_key_manager.mark_exhausted(key, retry_after=65)
                    if attempt == max_retries - 1:
                        raise RuntimeError("All Groq API keys exhausted.") from e
                    continue # Try next key
                else:
                    raise e
                    
        if result is None and last_error is not None:
            raise last_error

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
        max_retries = max(1, groq_key_manager.get_total_keys())
        result = None
        last_error = None
        
        for attempt in range(max_retries):
            try:
                client, key = groq_key_manager.get_client()

                with open(audio_path, "rb") as audio_file:
                    kwargs = {
                        "file": (os.path.basename(audio_path), audio_file),
                        "model": "whisper-large-v3-turbo",
                        "response_format": "verbose_json",
                    }
                    if language:
                        kwargs["language"] = language

                    result = client.audio.transcriptions.create(**kwargs)
                    break # Success!

            except Exception as e:
                error_str = str(e).lower()
                last_error = e
                if "429" in error_str or "rate limit" in error_str or "too many requests" in error_str:
                    groq_key_manager.mark_exhausted(key, retry_after=65)
                    if attempt == max_retries - 1:
                        raise RuntimeError("All Groq API keys exhausted.") from e
                    continue # Try next key
                else:
                    raise e
                    
        if result is None and last_error is not None:
            raise last_error

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
