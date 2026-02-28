import os
import subprocess
import tempfile


def extract_audio(video_path: str, output_dir: str = None) -> str:
    """
    Extract audio from video file using ffmpeg.
    Returns path to the extracted .wav audio file.
    """
    if output_dir is None:
        output_dir = tempfile.mkdtemp()

    base_name = os.path.splitext(os.path.basename(video_path))[0]
    audio_path = os.path.join(output_dir, f"{base_name}.wav")

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vn",             # no video
        "-acodec", "pcm_s16le",  # PCM 16-bit
        "-ar", "16000",    # 16kHz (Whisper optimal)
        "-ac", "1",        # mono
        "-y",              # overwrite
        audio_path
    ]

    try:
        subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"ffmpeg audio extraction failed: {e.stderr}")

    return audio_path


def get_audio_duration(file_path: str) -> float:
    """Get duration of an audio/video file in seconds using ffprobe"""
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        file_path
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )
        return float(result.stdout.strip())
    except (subprocess.CalledProcessError, ValueError):
        return 0.0
