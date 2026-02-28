import re
import asyncio
import logging
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi
from app.models.schemas import TranscriptSegment, YouTubeTranscribeResponse

logger = logging.getLogger("tubetomd.youtube")


def extract_video_id(video_url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"(?:youtu\.be\/)([0-9A-Za-z_-]{11})",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"(?:shorts\/)([0-9A-Za-z_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, video_url)
        if match:
            return match.group(1)
    return None


def _fetch_transcript_sync(video_id: str, language: Optional[str] = None):
    """Synchronous wrapper for youtube-transcript-api fetch.
    Returns the FetchedTranscript object (has .snippets, .language, .is_generated, etc.)
    When no language is specified, discovers all available transcripts and fetches the best one
    (prefers manually created over auto-generated)."""
    ytt_api = YouTubeTranscriptApi()

    if language:
        logger.info(f"[youtube] Fetching transcript for video_id={video_id}, language={language}")
        transcript = ytt_api.fetch(video_id, languages=(language,))
        logger.info(f"[youtube] Got {len(transcript)} segments, language={transcript.language}, auto={transcript.is_generated}")
        return transcript

    # No language specified — discover what's available via list()
    logger.info(f"[youtube] Listing available transcripts for video_id={video_id}")
    transcript_list = ytt_api.list(video_id)

    manual_transcripts = []
    generated_transcripts = []

    for t in transcript_list:
        logger.info(f"[youtube]   Available: language={t.language} ({t.language_code}), auto={t.is_generated}, translatable={t.is_translatable}")
        if t.is_generated:
            generated_transcripts.append(t)
        else:
            manual_transcripts.append(t)

    # Prefer manual transcripts over auto-generated
    chosen = None
    if manual_transcripts:
        chosen = manual_transcripts[0]
        logger.info(f"[youtube] Chose manual transcript: {chosen.language} ({chosen.language_code})")
    elif generated_transcripts:
        chosen = generated_transcripts[0]
        logger.info(f"[youtube] Chose auto-generated transcript: {chosen.language} ({chosen.language_code})")
    else:
        raise Exception(f"No transcripts available for video {video_id}")

    transcript = chosen.fetch()
    logger.info(f"[youtube] Got {len(transcript)} segments, language={transcript.language}, auto={transcript.is_generated}")
    return transcript


def _fetch_video_metadata_sync(video_url: str) -> dict:
    """Fetch video title/duration using yt-dlp (no download)"""
    try:
        import yt_dlp
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "socket_timeout": 10,
            "extract_flat": False,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return {
                "title": info.get("title"),
                "duration": info.get("duration"),
                "channel": info.get("channel") or info.get("uploader"),
            }
    except Exception as e:
        logger.warning(f"[youtube] yt-dlp metadata fetch failed: {e}")
        return {}


async def get_youtube_transcript(
    video_url: str,
    language: Optional[str] = None
) -> YouTubeTranscribeResponse:
    """
    Fetch transcript from a YouTube video using youtube-transcript-api.
    Prioritizes manual transcripts over auto-generated ones.
    """
    video_id = extract_video_id(video_url)
    if not video_id:
        logger.error(f"[youtube] Could not extract video ID from URL: {video_url}")
        return YouTubeTranscribeResponse(
            success=False,
            video_id="",
            transcript=[],
            error="Could not extract video ID from URL"
        )

    logger.info(f"[youtube] Processing video: {video_url} (id={video_id})")

    try:
        loop = asyncio.get_event_loop()

        # Fetch transcript and metadata in parallel (both in executor to avoid blocking)
        transcript_task = asyncio.wait_for(
            loop.run_in_executor(None, _fetch_transcript_sync, video_id, language),
            timeout=30.0
        )
        metadata_task = asyncio.wait_for(
            loop.run_in_executor(None, _fetch_video_metadata_sync, video_url),
            timeout=15.0
        )

        # Run both concurrently; metadata failure shouldn't block transcript
        transcript_result, metadata = await asyncio.gather(
            transcript_task,
            metadata_task,
            return_exceptions=True,
        )

        # Handle metadata errors gracefully
        if isinstance(metadata, Exception):
            logger.warning(f"[youtube] Metadata fetch failed (non-fatal): {metadata}")
            metadata = {}

        # Handle transcript errors
        if isinstance(transcript_result, Exception):
            raise transcript_result

        # Build segments from FetchedTranscript
        segments = []
        for item in transcript_result:
            segments.append(TranscriptSegment(
                start=float(item.start),
                duration=float(item.duration),
                text=str(item.text).strip()
            ))

        # Calculate total duration from segments if not in metadata
        total_duration = metadata.get("duration")
        if not total_duration and segments:
            last = segments[-1]
            total_duration = round(last.start + last.duration, 3)

        logger.info(f"[youtube] ✅ Transcript fetched: {len(segments)} segments, duration={total_duration}s, title={metadata.get('title', 'N/A')}")

        return YouTubeTranscribeResponse(
            success=True,
            video_id=video_id,
            title=metadata.get("title"),
            duration=total_duration,
            transcript=segments,
            language=transcript_result.language if hasattr(transcript_result, 'language') else (language or "en"),
            is_auto_generated=transcript_result.is_generated if hasattr(transcript_result, 'is_generated') else False,
        )

    except asyncio.TimeoutError:
        logger.error(f"[youtube] ❌ Transcript fetch timed out for video_id={video_id}")
        return YouTubeTranscribeResponse(
            success=False,
            video_id=video_id or "",
            transcript=[],
            error="YouTube transcript fetch timed out. The video may not have captions or the service is unreachable."
        )

    except Exception as e:
        logger.error(f"[youtube] ❌ Transcript fetch failed for video_id={video_id}: {type(e).__name__}: {e}")
        return YouTubeTranscribeResponse(
            success=False,
            video_id=video_id or "",
            transcript=[],
            error=str(e)
        )
