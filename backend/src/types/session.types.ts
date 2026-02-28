export interface CreateYouTubeSessionRequest {
    videoUrl: string;
    title?: string;
    startTime?: number;
    endTime?: number;
}

export interface CreateUploadSessionRequest {
    title?: string;
    filename: string;
    totalChunks: number;
    duration?: number;
}

export interface TranscriptSegmentResponse {
    start: number;
    duration: number;
    text: string;
}

export interface PythonTranscribeResponse {
    success: boolean;
    video_id?: string;
    title?: string;
    duration?: number;
    transcript: TranscriptSegmentResponse[];
    language?: string;
    is_auto_generated?: boolean;
    error?: string;
    filename?: string;
}

export interface PythonChunkTranscribeResponse {
    success: boolean;
    chunk_index: number;
    chunk_offset: number;
    duration?: number;
    transcript: TranscriptSegmentResponse[];
    language?: string;
    error?: string;
}

export interface PythonMergeResponse {
    success: boolean;
    session_id: string;
    filename: string;
    total_duration?: number;
    transcript: TranscriptSegmentResponse[];
    language?: string;
    chunk_count: number;
    error?: string;
}

export interface ChunkUploadResult {
    chunkIndex: number;
    success: boolean;
    transcription?: PythonChunkTranscribeResponse;
    error?: string;
}
