import axios from 'axios';
import serverConfig from '@config/server.config';
import {
    PythonTranscribeResponse,
    PythonChunkTranscribeResponse,
    PythonMergeResponse,
} from '@types';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';
import fs from 'fs';
import FormData from 'form-data';

const PYTHON_URL = serverConfig.PYTHON_SERVICE_URL;

class TranscriptionService {
    /**
     * Fetch YouTube transcript via Python service
     */
    async getYouTubeTranscript(
        videoUrl: string,
        language?: string
    ): Promise<PythonTranscribeResponse> {
        try {
            const response = await axios.post<PythonTranscribeResponse>(
                `${PYTHON_URL}/transcribe/youtube`,
                {
                    video_url: videoUrl,
                    language: language || null,
                },
                { timeout: 60000 }
            );

            return response.data;
        } catch (error: any) {
            const detail = error.response?.data?.detail || error.message;
            throw new CustomError(
                `Transcription failed: ${detail}`,
                StatusCodes.BAD_GATEWAY
            );
        }
    }

    /**
     * Transcribe a single audio chunk via Python Whisper service.
     * The chunk file is on disk (saved by multer).
     * Returns timestamped segments with offsets already applied.
     */
    async transcribeChunk(
        filePath: string,
        chunkIndex: number,
        chunkOffset: number,
        language?: string
    ): Promise<PythonChunkTranscribeResponse> {
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath));
            formData.append('chunk_index', String(chunkIndex));
            formData.append('chunk_offset', String(chunkOffset));
            if (language) {
                formData.append('language', language);
            }

            const response = await axios.post<PythonChunkTranscribeResponse>(
                `${PYTHON_URL}/transcribe/chunk`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 300000, // 5 min per chunk
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                }
            );

            return response.data;
        } catch (error: any) {
            const detail = error.response?.data?.detail || error.message;
            throw new CustomError(
                `Chunk transcription failed: ${detail}`,
                StatusCodes.BAD_GATEWAY
            );
        } finally {
            // Clean up chunk file after sending to Python
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }

    /**
     * Merge multiple chunk transcription results into a single transcript.
     * Calls the Python /transcribe/merge endpoint for deduplication/ordering.
     */
    async mergeChunkTranscriptions(
        sessionId: string,
        chunks: PythonChunkTranscribeResponse[],
        filename: string
    ): Promise<PythonMergeResponse> {
        try {
            const response = await axios.post<PythonMergeResponse>(
                `${PYTHON_URL}/transcribe/merge`,
                {
                    session_id: sessionId,
                    chunks,
                    filename,
                },
                { timeout: 30000 }
            );

            return response.data;
        } catch (error: any) {
            const detail = error.response?.data?.detail || error.message;
            throw new CustomError(
                `Merge failed: ${detail}`,
                StatusCodes.BAD_GATEWAY
            );
        }
    }

    /**
     * Legacy: Transcribe uploaded file via Python service (Whisper)
     * Kept for backward compatibility; prefer chunk-based flow.
     */
    async transcribeUploadedFile(
        filePath: string,
        filename: string,
        language?: string
    ): Promise<PythonTranscribeResponse> {
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(filePath), filename);
            if (language) {
                formData.append('language', language);
            }

            const response = await axios.post<PythonTranscribeResponse>(
                `${PYTHON_URL}/transcribe/upload`,
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 600000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                }
            );

            return response.data;
        } catch (error: any) {
            const detail = error.response?.data?.detail || error.message;
            throw new CustomError(
                `Transcription failed: ${detail}`,
                StatusCodes.BAD_GATEWAY
            );
        }
    }
}

export default new TranscriptionService();
