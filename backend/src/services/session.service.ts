import Session, { ISession } from '@models/session.model';
import transcriptionService from '@services/transcription.service';
import embeddingService from '@services/embedding.service';
import groqService from '@services/groq.service';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';
import {
    CreateYouTubeSessionRequest,
    PythonChunkTranscribeResponse,
} from '@types';

/**
 * In-memory store for chunk transcription results per session.
 * Maps sessionId → { totalChunks, results[], filename }
 */
interface ChunkTracker {
    totalChunks: number;
    filename: string;
    results: (PythonChunkTranscribeResponse | null)[];
}

const chunkTrackers = new Map<string, ChunkTracker>();

class SessionService {
    /**
     * Create a session from a YouTube URL
     */
    async createYouTubeSession(
        userId: string,
        data: CreateYouTubeSessionRequest
    ): Promise<ISession> {
        const session = await Session.create({
            userId,
            title: data.title || 'YouTube Video',
            videoType: 'youtube',
            videoUrl: data.videoUrl,
            status: 'processing',
            timeRange:
                data.startTime !== undefined || data.endTime !== undefined
                    ? { start: data.startTime || 0, end: data.endTime || Infinity }
                    : undefined,
        });

        // Fetch transcript asynchronously
        this.processYouTubeTranscription(String(session._id), data.videoUrl).catch(
            (error) => {
                console.error(`Transcription failed for session ${session._id}:`, error);
            }
        );

        return session;
    }

    /**
     * Process YouTube transcription in background
     */
    private async processYouTubeTranscription(
        sessionId: string,
        videoUrl: string
    ): Promise<void> {
        try {
            await Session.findByIdAndUpdate(sessionId, { status: 'transcribing' });

            const result = await transcriptionService.getYouTubeTranscript(videoUrl);

            if (!result.success) {
                await Session.findByIdAndUpdate(sessionId, {
                    status: 'failed',
                    errorMessage: result.error,
                });
                return;
            }

            await Session.findByIdAndUpdate(sessionId, {
                transcription: result.transcript,
                status: 'transcribed',
                duration: result.duration,
                metadata: {
                    language: result.language,
                },
            });

            await embeddingService.generateSessionEmbeddings(sessionId);
            await Session.findByIdAndUpdate(sessionId, { status: 'ready' });
        } catch (error: any) {
            await Session.findByIdAndUpdate(sessionId, {
                status: 'failed',
                errorMessage: error.message,
            });
        }
    }

    // ──────────────────────────────────────────────
    // Chunk-based upload flow (browser-side FFmpeg.wasm)
    // ──────────────────────────────────────────────

    /**
     * Step 1: Initialize an upload session.
     * Frontend tells us how many chunks to expect.
     * Returns the session ID so chunks can be correlated.
     */
    async initUploadSession(
        userId: string,
        filename: string,
        totalChunks: number,
        title?: string,
        duration?: number
    ): Promise<ISession> {
        if (totalChunks < 1 || totalChunks > 120) {
            throw new CustomError(
                'totalChunks must be between 1 and 120',
                StatusCodes.BAD_REQUEST
            );
        }

        const session = await Session.create({
            userId,
            title: title || filename,
            videoType: 'uploaded',
            status: 'processing',
            duration: duration || undefined,
        });

        // Initialize chunk tracker
        chunkTrackers.set(String(session._id), {
            totalChunks,
            filename,
            results: new Array(totalChunks).fill(null),
        });

        return session;
    }

    /**
     * Step 2: Receive and transcribe a single audio chunk.
     * Multer saves the chunk to disk; we forward it to Python Whisper.
     * Returns success/ack so frontend can free the chunk from memory (GC).
     */
    async processChunk(
        sessionId: string,
        userId: string,
        chunkIndex: number,
        chunkOffset: number,
        filePath: string,
        language?: string
    ): Promise<PythonChunkTranscribeResponse> {
        // Verify session ownership
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        const tracker = chunkTrackers.get(sessionId);
        if (!tracker) {
            throw new CustomError(
                'No upload session initialized. Call /upload/init first.',
                StatusCodes.BAD_REQUEST
            );
        }

        if (chunkIndex < 0 || chunkIndex >= tracker.totalChunks) {
            throw new CustomError(
                `Invalid chunk_index ${chunkIndex}. Expected 0-${tracker.totalChunks - 1}`,
                StatusCodes.BAD_REQUEST
            );
        }

        // Update status on first chunk
        if (session.status === 'processing') {
            await Session.findByIdAndUpdate(sessionId, { status: 'transcribing' });
        }

        // Transcribe chunk (also cleans up the file)
        const result = await transcriptionService.transcribeChunk(
            filePath,
            chunkIndex,
            chunkOffset,
            language
        );

        // Store result
        tracker.results[chunkIndex] = result;

        return result;
    }

    /**
     * Step 3: Complete the upload session.
     * Merges all chunk transcriptions, generates embeddings, marks session ready.
     */
    async completeUploadSession(
        sessionId: string,
        userId: string
    ): Promise<ISession> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        const tracker = chunkTrackers.get(sessionId);
        if (!tracker) {
            throw new CustomError(
                'No upload session initialized.',
                StatusCodes.BAD_REQUEST
            );
        }

        // Check all chunks are present
        const missing = tracker.results
            .map((r, i) => (r === null ? i : -1))
            .filter((i) => i >= 0);

        if (missing.length > 0) {
            throw new CustomError(
                `Missing chunks: ${missing.join(', ')}. Upload them before completing.`,
                StatusCodes.BAD_REQUEST
            );
        }

        try {
            // Merge transcriptions via Python service
            const mergeResult = await transcriptionService.mergeChunkTranscriptions(
                sessionId,
                tracker.results as PythonChunkTranscribeResponse[],
                tracker.filename
            );

            if (!mergeResult.success) {
                await Session.findByIdAndUpdate(sessionId, {
                    status: 'failed',
                    errorMessage: mergeResult.error,
                });
                chunkTrackers.delete(sessionId);
                throw new CustomError(
                    `Merge failed: ${mergeResult.error}`,
                    StatusCodes.INTERNAL_SERVER_ERROR
                );
            }

            // Update session with merged transcript
            await Session.findByIdAndUpdate(sessionId, {
                transcription: mergeResult.transcript,
                status: 'transcribed',
                duration: mergeResult.total_duration || session.duration,
                metadata: {
                    language: mergeResult.language,
                },
            });

            // Generate embeddings for RAG
            await embeddingService.generateSessionEmbeddings(sessionId);

            const updated = await Session.findByIdAndUpdate(
                sessionId,
                { status: 'ready' },
                { new: true }
            );

            // Cleanup tracker
            chunkTrackers.delete(sessionId);

            return updated!;
        } catch (error: any) {
            chunkTrackers.delete(sessionId);
            if (error instanceof CustomError) throw error;

            await Session.findByIdAndUpdate(sessionId, {
                status: 'failed',
                errorMessage: error.message,
            });
            throw error;
        }
    }

    /**
     * Get upload progress for a session (how many chunks received)
     */
    getUploadProgress(sessionId: string): {
        totalChunks: number;
        receivedChunks: number;
        missingIndices: number[];
    } | null {
        const tracker = chunkTrackers.get(sessionId);
        if (!tracker) return null;

        const received = tracker.results.filter((r) => r !== null).length;
        const missing = tracker.results
            .map((r, i) => (r === null ? i : -1))
            .filter((i) => i >= 0);

        return {
            totalChunks: tracker.totalChunks,
            receivedChunks: received,
            missingIndices: missing,
        };
    }

    // ──────────────────────────────────────────────
    // Session CRUD
    // ──────────────────────────────────────────────

    /**
     * Get all sessions for a user
     */
    async getUserSessions(userId: string): Promise<ISession[]> {
        return Session.find({ userId })
            .select('-transcription')
            .sort({ createdAt: -1 });
    }

    /**
     * Get session by ID (with ownership check)
     */
    async getSession(sessionId: string, userId: string): Promise<ISession> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }
        return session;
    }

    /**
     * Delete a session and all related data
     */
    async deleteSession(sessionId: string, userId: string): Promise<void> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        // Clean up any in-progress chunk tracker
        chunkTrackers.delete(sessionId);

        const { Note, ChatMessage, Embedding, Annotation } = await import('@models');

        await Promise.all([
            Note.deleteMany({ sessionId }),
            ChatMessage.deleteMany({ sessionId }),
            Embedding.deleteMany({ sessionId }),
            Annotation.deleteMany({ sessionId }),
            Session.findByIdAndDelete(sessionId),
        ]);
    }

    /**
     * Get transcript with optional time range filtering
     */
    async getTranscript(
        sessionId: string,
        userId: string,
        start?: number,
        end?: number
    ) {
        const session = await this.getSession(sessionId, userId);

        let transcript = session.transcription;
        if (start !== undefined || end !== undefined) {
            transcript = transcript.filter((seg) => {
                const segStart = seg.start;
                return segStart >= (start || 0) && segStart <= (end || Infinity);
            });
        }

        return transcript;
    }

    /**
     * Translate transcript to a target language using Groq AI.
     * Stores the original transcription as a backup before overwriting.
     */
    async translateSession(
        sessionId: string,
        userId: string,
        targetLanguage: string
    ): Promise<ISession> {
        const session = await this.getSession(sessionId, userId);

        if (session.status !== 'ready' && session.status !== 'transcribed') {
            throw new CustomError(
                'Transcription must be complete before translating',
                StatusCodes.BAD_REQUEST
            );
        }

        if (!session.transcription || session.transcription.length === 0) {
            throw new CustomError(
                'No transcription available to translate',
                StatusCodes.BAD_REQUEST
            );
        }

        console.log(
            `🌐 [translate] Translating session ${sessionId} to ${targetLanguage} (${session.transcription.length} segments)`
        );

        // Save original transcription on first translation
        const metadata = session.metadata || {};
        if (!metadata.originalLanguage) {
            metadata.originalLanguage = metadata.language || 'auto';
            metadata.originalTranscription = JSON.stringify(session.transcription);
        }

        const translated = await groqService.translateTranscription(
            session.transcription,
            targetLanguage
        );

        const updated = await Session.findByIdAndUpdate(
            sessionId,
            {
                transcription: translated,
                'metadata.language': targetLanguage,
                'metadata.translatedTo': targetLanguage,
                'metadata.originalLanguage': metadata.originalLanguage,
                'metadata.originalTranscription': metadata.originalTranscription,
            },
            { new: true }
        );

        console.log(
            `✅ [translate] Translation complete for session ${sessionId}`
        );

        return updated!;
    }

    /**
     * Update session (rename title, etc.)
     */
    async updateSession(
        sessionId: string,
        userId: string,
        updates: { title?: string }
    ): Promise<ISession> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        const updated = await Session.findByIdAndUpdate(
            sessionId,
            { $set: updates },
            { new: true }
        );

        return updated!;
    }

    /**
     * Find existing session by video URL (for deduplication)
     */
    async findByVideoUrl(userId: string, videoUrl: string): Promise<ISession | null> {
        return Session.findOne({ userId, videoUrl });
    }

    /**
     * Restore original (untranslated) transcription
     */
    async restoreOriginalTranscription(
        sessionId: string,
        userId: string
    ): Promise<ISession> {
        const session = await this.getSession(sessionId, userId);
        const originalJson = (session.metadata as any)?.originalTranscription;

        if (!originalJson) {
            throw new CustomError(
                'No original transcription to restore',
                StatusCodes.BAD_REQUEST
            );
        }

        const originalTranscription = JSON.parse(originalJson);
        const originalLanguage = (session.metadata as any)?.originalLanguage || 'auto';

        const updated = await Session.findByIdAndUpdate(
            sessionId,
            {
                transcription: originalTranscription,
                'metadata.language': originalLanguage,
                $unset: { 'metadata.translatedTo': 1 },
            },
            { new: true }
        );

        return updated!;
    }

    // ──────────────────────────────────────────────
    // Public Sharing
    // ──────────────────────────────────────────────

    /**
     * Generate (or return existing) a share token for a session.
     * Makes the session publicly accessible via /public/:shareToken.
     */
    async generateShareToken(sessionId: string, userId: string): Promise<{ shareToken: string; shareUrl: string }> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        // Return existing token if already shared
        if (session.shareToken && session.isPublic) {
            const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${session.shareToken}`;
            return { shareToken: session.shareToken, shareUrl };
        }

        // Generate a new UUID-style token
        const { randomUUID } = await import('crypto');
        const shareToken = randomUUID().replace(/-/g, '');

        await Session.findByIdAndUpdate(sessionId, { shareToken, isPublic: true });

        const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${shareToken}`;
        return { shareToken, shareUrl };
    }

    /**
     * Revoke sharing — clears shareToken and sets isPublic false.
     */
    async revokeShare(sessionId: string, userId: string): Promise<void> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }
        await Session.findByIdAndUpdate(sessionId, {
            $unset: { shareToken: 1 },
            isPublic: false,
        });
    }

    /**
     * Get a publicly shared session by its share token (no auth required).
     * Returns the session + associated notes.
     */
    async getPublicSession(shareToken: string): Promise<{ session: ISession; notes: any[] }> {
        const session = await Session.findOne({ shareToken, isPublic: true });
        if (!session) {
            throw new CustomError('Shared session not found or link has been revoked', StatusCodes.NOT_FOUND);
        }

        const { Note } = await import('@models');
        const notes = await Note.find({ sessionId: String(session._id) }).sort({ createdAt: -1 });

        return { session, notes };
    }
}

export default new SessionService();
