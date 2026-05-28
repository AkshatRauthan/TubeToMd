import re
import os
import asyncio
import logging
import random
import time
import threading
from typing import Optional
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
from app.models.schemas import TranscriptSegment, YouTubeTranscribeResponse

logger = logging.getLogger("tubetomd.youtube")

# ---------------------------------------------------------------------------
# Proxy Rotator — fetches free public proxies as a best-effort fallback.
# NOTE: Free proxies are unreliable. If you need reliability, set the
# WEBSHARE_PROXY_USERNAME / WEBSHARE_PROXY_PASSWORD env vars instead.
# ---------------------------------------------------------------------------
class ProxyRotator:
    SOURCES = [
        "https://api.proxyscrape.com/v2/?request=getproxies&protocol=https&timeout=5000&country=all&ssl=yes&anonymity=all",
        "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
        "https://raw.githubusercontent.com/clarketm/proxy-list/master/proxy-list-raw.txt",
        "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
    ]

    def __init__(self, max_proxies: int = 30, refresh_interval: int = 300):
        self._proxies: list[str] = []
        self._blacklist: set[str] = set()
        self._lock = threading.Lock()
        self._last_refresh: float = 0
        self._max_proxies = max_proxies
        self._refresh_interval = refresh_interval

    def _fetch_source(self, url: str) -> list[str]:
        import requests
        try:
            r = requests.get(url, timeout=8)
            r.raise_for_status()
            result = []
            for line in r.text.splitlines():
                line = line.strip()
                if line and ":" in line and not line.startswith("#"):
                    parts = line.split(":")
                    if len(parts) == 2:
                        try:
                            int(parts[1])
                            result.append(f"http://{line}")
                        except ValueError:
                            pass
            return result
        except Exception as e:
            logger.debug(f"[proxy] Source failed {url}: {e}")
            return []

    def refresh(self):
        logger.info("[proxy] Refreshing proxy pool...")
        all_proxies: list[str] = []
        for source in self.SOURCES:
            fetched = self._fetch_source(source)
            all_proxies.extend(fetched)
            logger.debug(f"[proxy] {len(fetched)} proxies from {source}")
        with self._lock:
            fresh = list(set(all_proxies) - self._blacklist)
            random.shuffle(fresh)
            self._proxies = fresh[: self._max_proxies]
            self._last_refresh = time.time()
        logger.info(f"[proxy] Pool ready: {len(self._proxies)} proxies")

    def _maybe_refresh(self):
        if time.time() - self._last_refresh > self._refresh_interval or not self._proxies:
            self.refresh()

    def get(self) -> Optional[str]:
        self._maybe_refresh()
        with self._lock:
            available = [p for p in self._proxies if p not in self._blacklist]
            return random.choice(available) if available else None

    def get_dict(self) -> Optional[dict]:
        p = self.get()
        return {"http": p, "https": p} if p else None

    def blacklist(self, proxy: str):
        with self._lock:
            self._blacklist.add(proxy)
            if proxy in self._proxies:
                self._proxies.remove(proxy)
        logger.debug(f"[proxy] Blacklisted {proxy} | pool={len(self._proxies)}")


proxy_rotator = ProxyRotator()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def extract_video_id(video_url: str) -> Optional[str]:
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


def _parse_vtt(vtt_text: str) -> list:
    """Parse WebVTT subtitle text into segment dicts."""
    segments = []
    blocks = re.split(r"\n\n+", vtt_text.strip())
    time_re = re.compile(
        r"(\d{2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[.,]\d{3})"
    )

    def to_seconds(ts: str) -> float:
        ts = ts.replace(",", ".")
        h, m, s = ts.split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)

    for block in blocks:
        lines = block.strip().splitlines()
        for i, line in enumerate(lines):
            m = time_re.match(line)
            if m:
                start = to_seconds(m.group(1))
                end = to_seconds(m.group(2))
                text = " ".join(lines[i + 1:]).strip()
                text = re.sub(r"<[^>]+>", "", text).strip()
                if text:
                    segments.append({
                        "start": start,
                        "duration": round(end - start, 3),
                        "text": text,
                    })
                break
    return segments


def _free_proxies_enabled() -> bool:
    """Free public proxies are unstable; keep disabled unless explicitly enabled."""
    return os.environ.get("ENABLE_FREE_PROXIES", "").lower() in {"1", "true", "yes"}


# ---------------------------------------------------------------------------
# Shared mock classes
# ---------------------------------------------------------------------------
class _Segment:
    def __init__(self, start, duration, text):
        self.start = start
        self.duration = duration
        self.text = text


class _Transcript:
    def __init__(self, segments, language, is_generated):
        self.segments = segments
        self.language = language
        self.is_generated = is_generated

    def __iter__(self):
        return iter(self.segments)

    def __len__(self):
        return len(self.segments)


# ---------------------------------------------------------------------------
# Level 1: youtube-transcript-api with GenericProxyConfig (v1.x API)
#
# KEY FIX: The old `YouTubeTranscriptApi(proxies=...)` constructor arg was
# removed in v1.x. The correct API is now:
#   GenericProxyConfig(http_url=..., https_url=...)
# Passing `proxies=` causes a TypeError that was silently swallowed,
# resulting in a no-proxy instance that is immediately IP-banned on HF.
# ---------------------------------------------------------------------------
def _fetch_level1(video_id: str, language: Optional[str] = None):
    # Prefer Webshare rotating residential proxies if configured (most reliable).
    # Set WEBSHARE_PROXY_USERNAME and WEBSHARE_PROXY_PASSWORD as HF Space secrets.
    webshare_user = os.environ.get("WEBSHARE_PROXY_USERNAME", "").strip()
    webshare_pass = os.environ.get("WEBSHARE_PROXY_PASSWORD", "").strip()

    proxy_config = None

    if webshare_user and webshare_pass:
        try:
            from youtube_transcript_api.proxies import WebshareProxyConfig
            proxy_config = WebshareProxyConfig(
                proxy_username=webshare_user,
                proxy_password=webshare_pass,
                retries_when_blocked=5,
            )
            logger.info("[L1] Using Webshare rotating proxy")
        except ImportError:
            logger.warning("[L1] WebshareProxyConfig not available in this version")

    if proxy_config is None and _free_proxies_enabled():
        # Fall back to free scraped proxies via GenericProxyConfig
        proxy_url = proxy_rotator.get()
        if proxy_url:
            proxy_config = GenericProxyConfig(
                http_url=proxy_url,
                https_url=proxy_url,
            )
            logger.info(f"[L1] youtube-transcript-api | proxy={proxy_url}")
        else:
            logger.warning("[L1] No proxy available — HF IP will likely be blocked")
    elif proxy_config is None:
        logger.info("[L1] Free proxies disabled; running without proxy")

    try:
        ytt_api = YouTubeTranscriptApi(proxy_config=proxy_config)

        if language:
            result = ytt_api.fetch(video_id, languages=(language,))
            raw = result.to_raw_data() if hasattr(result, "to_raw_data") else list(result)
            segments = [_Segment(s["start"], s.get("duration", 0), s["text"]) for s in raw]
            return _Transcript(segments, language, False)

        transcript_list = ytt_api.list(video_id)
        manual, generated = [], []
        for t in transcript_list:
            (generated if t.is_generated else manual).append(t)

        chosen = (manual or generated or [None])[0]
        if not chosen:
            raise Exception("No transcripts available")

        logger.info(f"[L1] Chose {'manual' if not chosen.is_generated else 'auto'}: {chosen.language}")
        fetched = chosen.fetch()
        raw = fetched.to_raw_data() if hasattr(fetched, "to_raw_data") else list(fetched)
        segments = [_Segment(s["start"], s.get("duration", 0), s["text"]) for s in raw]
        return _Transcript(segments, chosen.language, chosen.is_generated)

    except Exception as e:
        if proxy_config is not None and hasattr(proxy_config, "http_url"):
            proxy_rotator.blacklist(proxy_config.http_url)
        raise


# ---------------------------------------------------------------------------
# Level 2: yt-dlp with mobile/TV player clients
#
# WHY THIS WORKS: YouTube blocks datacenter IPs most aggressively on its
# `web` InnerTube client. The `ios`, `android`, and `tv_embedded` clients
# use completely different API keys and endpoints — YouTube applies much
# weaker geo/IP restrictions to them. This is the best free bypass.
#
# Tried in order: ios → android → tv_embedded → mweb
# ---------------------------------------------------------------------------
def _fetch_level2(video_id: str, language: Optional[str] = None):
    import yt_dlp
    import requests

    proxy = proxy_rotator.get() if _free_proxies_enabled() else None
    url = f"https://www.youtube.com/watch?v={video_id}"
    lang_list = [language] if language else ["en", "en-US"]

    # Try mobile/TV clients first — much less blocked on HF datacenter IPs.
    # Fall back to web only as last resort within this level.
    # Avoid `web` client by default on hosted environments; it's the easiest
    # for YouTube to IP-ban on datacenter egress (e.g., HF Spaces).
    include_web_client = os.environ.get("YTDLP_ENABLE_WEB_CLIENT", "").lower() in {"1", "true", "yes"}
    CLIENTS_TO_TRY = ["ios", "android", "tv_embedded", "mweb"]
    if include_web_client:
        CLIENTS_TO_TRY.append("web")

    last_error = None
    for client in CLIENTS_TO_TRY:
        try:
            logger.info(f"[L2] yt-dlp | client={client} | proxy={proxy}")
            ydl_opts = {
                "quiet": True,
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": lang_list,
                "no_warnings": True,
                "socket_timeout": 10,
                "extractor_args": {
                    "youtube": {
                        "player_client": [client],
                    }
                },
            }
            if proxy:
                ydl_opts["proxy"] = proxy

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                subs = info.get("requested_subtitles") or {}

                lang = language if language and language in subs else None
                if not lang and subs:
                    lang = "en" if "en" in subs else list(subs.keys())[0]
                if not lang:
                    raise Exception(f"No subtitles from {client} client")

                sub_url = subs[lang].get("url", "").replace("fmt=vtt", "fmt=json3")
                if not sub_url:
                    raise Exception(f"No subtitle URL from {client} client")

                session = requests.Session()
                if proxy:
                    session.proxies = {"http": proxy, "https": proxy}

                r = session.get(sub_url, timeout=10)
                r.raise_for_status()

                data = r.json()
                segments = []
                for ev in data.get("events", []):
                    if "segs" in ev:
                        text = "".join(s.get("utf8", "") for s in ev["segs"]).replace("\n", " ").strip()
                        if text:
                            segments.append(_Segment(
                                start=ev.get("tStartMs", 0) / 1000.0,
                                duration=ev.get("dDurationMs", 0) / 1000.0,
                                text=text,
                            ))

                if not segments:
                    raise Exception(f"No segments parsed from {client} client")

                is_generated = "kind=asr" in sub_url.lower()
                logger.info(f"[L2] ✅ {len(segments)} segments, client={client}, lang={lang}, auto={is_generated}")
                return _Transcript(segments, lang, is_generated)

        except Exception as e:
            last_error = e
            logger.warning(f"[L2] {client} client failed: {e}")
            continue

    if proxy:
        proxy_rotator.blacklist(proxy)
    raise Exception(f"All yt-dlp clients failed. Last: {last_error}")


# ---------------------------------------------------------------------------
# Metadata — yt-dlp only
# ---------------------------------------------------------------------------
def _fetch_video_metadata_sync(video_url: str) -> dict:
    import yt_dlp
    try:
        proxy = proxy_rotator.get() if _free_proxies_enabled() else None
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "socket_timeout": 8,
        }
        if proxy:
            ydl_opts["proxy"] = proxy

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            return {
                "title": info.get("title"),
                "duration": info.get("duration"),
                "channel": info.get("channel") or info.get("uploader"),
            }
    except Exception as e:
        logger.warning(f"[youtube] Metadata fetch failed: {e}")
        return {}


# ---------------------------------------------------------------------------
# Master fetch — yt-dlp first, then optional youtube-transcript-api fallback
# ---------------------------------------------------------------------------
def _fetch_with_timeout(fn, video_id, language, seconds) -> object:
    """Run fn in a thread with a hard timeout."""
    import concurrent.futures
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        future = ex.submit(fn, video_id, language)
        return future.result(timeout=seconds)


def _fetch_transcript_sync(video_id: str, language: Optional[str] = None):
    is_hf_space = bool(os.environ.get("SPACE_ID") or os.environ.get("HF_SPACE_ID"))

    levels = [
        ("yt-dlp (mobile clients)", _fetch_level2, 60),  # ios→android→tv_embedded→mweb
    ]
    # Direct YouTube transcript API calls are usually blocked from HF datacenter IPs.
    if not is_hf_space:
        levels.append(("youtube-transcript-api", _fetch_level1, 20))
    errors = []
    for label, fn, timeout in levels:
        try:
            result = _fetch_with_timeout(fn, video_id, language, timeout)
            logger.info(f"[youtube] ✅ Success via {label}")
            return result
        except Exception as e:
            logger.warning(f"[youtube] ❌ {label} failed: {e}")
            errors.append(f"{label}: {e}")

    raise Exception("All transcript methods failed:\n" + "\n".join(errors))


# ---------------------------------------------------------------------------
# Public async entry point
# ---------------------------------------------------------------------------
async def get_youtube_transcript(
    video_url: str,
    language: Optional[str] = None,
) -> YouTubeTranscribeResponse:
    video_id = extract_video_id(video_url)
    if not video_id:
        return YouTubeTranscribeResponse(
            success=False, video_id="", transcript=[],
            error="Could not extract video ID from URL",
        )

    logger.info(f"[youtube] Processing: {video_url} (id={video_id})")

    try:
        loop = asyncio.get_event_loop()

        # Total budget: 20+25+30+30=105s — outer timeout is 110s
        transcript_task = asyncio.wait_for(
            loop.run_in_executor(None, _fetch_transcript_sync, video_id, language),
            timeout=110.0,
        )
        metadata_task = asyncio.wait_for(
            loop.run_in_executor(None, _fetch_video_metadata_sync, video_url),
            timeout=15.0,
        )

        transcript_result, metadata = await asyncio.gather(
            transcript_task, metadata_task, return_exceptions=True,
        )

        if isinstance(metadata, Exception):
            logger.warning(f"[youtube] Metadata failed (non-fatal): {metadata}")
            metadata = {}

        if isinstance(transcript_result, Exception):
            raise transcript_result

        segments = [
            TranscriptSegment(
                start=float(item.start),
                duration=float(item.duration),
                text=str(item.text).strip(),
            )
            for item in transcript_result
        ]

        total_duration = metadata.get("duration")
        if not total_duration and segments:
            last = segments[-1]
            total_duration = round(last.start + last.duration, 3)

        logger.info(
            f"[youtube] ✅ {len(segments)} segments | "
            f"duration={total_duration}s | title={metadata.get('title', 'N/A')}"
        )

        return YouTubeTranscribeResponse(
            success=True,
            video_id=video_id,
            title=metadata.get("title"),
            duration=total_duration,
            transcript=segments,
            language=getattr(transcript_result, "language", language or "en"),
            is_auto_generated=getattr(transcript_result, "is_generated", False),
        )

    except asyncio.TimeoutError:
        logger.error(f"[youtube] ❌ Timed out for {video_id}")
        return YouTubeTranscribeResponse(
            success=False, video_id=video_id, transcript=[],
            error="Transcript fetch timed out. The video may not have captions.",
        )

    except Exception as e:
        logger.error(f"[youtube] ❌ Failed for {video_id}: {type(e).__name__}: {e}")
        return YouTubeTranscribeResponse(
            success=False, video_id=video_id, transcript=[],
            error=str(e),
        )
