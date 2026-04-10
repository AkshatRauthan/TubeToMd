from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class TranscriptSegment(BaseModel):
    """A single segment of a transcript with timestamp"""
    start: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Duration in seconds")
    text: str = Field(..., description="Transcript text")


class YouTubeTranscribeRequest(BaseModel):
    """Request to transcribe a YouTube video"""
    video_url: str = Field(..., description="YouTube video URL")
    language: Optional[str] = Field(None, description="Preferred language code (e.g., 'en')")


class YouTubeTranscribeResponse(BaseModel):
    """Response with YouTube transcript"""
    success: bool
    video_id: str
    title: Optional[str] = None
    duration: Optional[float] = None
    transcript: List[TranscriptSegment]
    language: Optional[str] = None
    is_auto_generated: bool = False
    error: Optional[str] = None


class WhisperTranscribeResponse(BaseModel):
    """Response with Whisper transcription"""
    success: bool
    filename: str
    duration: Optional[float] = None
    transcript: List[TranscriptSegment]
    language: Optional[str] = None
    error: Optional[str] = None


class ChunkTranscribeResponse(BaseModel):
    """Response with transcription for a single audio chunk"""
    success: bool
    chunk_index: int
    chunk_offset: float = Field(..., description="Offset in seconds applied to timestamps")
    duration: Optional[float] = None
    transcript: List[TranscriptSegment] = Field(
        default_factory=list,
        description="Segments with timestamps adjusted by chunk_offset"
    )
    language: Optional[str] = None
    error: Optional[str] = None


class MergeChunksRequest(BaseModel):
    """Request to merge pre-transcribed chunk results"""
    session_id: str = Field(..., description="Session ID for tracking")
    chunks: List[ChunkTranscribeResponse] = Field(
        ..., description="Ordered list of chunk transcription results"
    )
    filename: str = Field(default="uploaded_video")


class MergeChunksResponse(BaseModel):
    """Response with merged transcription from all chunks"""
    success: bool
    session_id: str
    filename: str
    total_duration: Optional[float] = None
    transcript: List[TranscriptSegment] = Field(default_factory=list)
    language: Optional[str] = None
    chunk_count: int = 0
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    transcription_engine: str
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    """Error response"""
    success: bool = False
    error: str
    detail: Optional[str] = None
