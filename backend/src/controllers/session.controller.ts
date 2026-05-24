import { Request, Response, NextFunction } from 'express';
import sessionService from '@services/session.service';
import reportService from '@services/report.service';
import SuccessResponse from '@common/success-response';
import { StatusCodes } from 'http-status-codes';

class SessionController {
    async createYouTubeSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const session = await sessionService.createYouTubeSession(userId, req.body);
            new SuccessResponse(
                'Session created. Transcription in progress.',
                session,
                StatusCodes.CREATED
            ).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Step 1: Initialize an upload session.
     * Body: { filename, totalChunks, title?, duration?, checksum? }
     */
    async initUploadSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { filename, totalChunks, title, duration, checksum } = req.body;

            if (!filename || !totalChunks) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'filename and totalChunks are required',
                });
            }

            const { session, isDuplicate } = await sessionService.initUploadSession(
                userId,
                filename,
                Number(totalChunks),
                title,
                duration ? Number(duration) : undefined,
                checksum || undefined
            );

            if (isDuplicate) {
                new SuccessResponse(
                    'Duplicate file detected. Returning existing session.',
                    {
                        sessionId: String(session._id),
                        totalChunks: 0,
                        isDuplicate: true,
                        existingStatus: session.status,
                    },
                    StatusCodes.OK
                ).send(res);
                return;
            }

            new SuccessResponse(
                'Upload session initialized. Send audio chunks next.',
                { sessionId: String(session._id), totalChunks: Number(totalChunks), isDuplicate: false },
                StatusCodes.CREATED
            ).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Step 2: Upload and transcribe a single audio chunk.
     * Multipart: file (audio chunk) + chunk_index + chunk_offset + session_id
     * Returns ACK so frontend can garbage-collect the chunk from memory.
     */
    async uploadChunk(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;

            if (!req.file) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'No audio chunk file uploaded',
                });
            }

            const sessionId = req.body.session_id as string;
            const chunkIndex = Number(req.body.chunk_index);
            const chunkOffset = Number(req.body.chunk_offset);
            const language = req.body.language as string | undefined;

            if (!sessionId || isNaN(chunkIndex) || isNaN(chunkOffset)) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'session_id, chunk_index, and chunk_offset are required',
                });
            }

            const result = await sessionService.processChunk(
                sessionId,
                userId,
                chunkIndex,
                chunkOffset,
                req.file.path,
                language
            );

            new SuccessResponse('Chunk transcribed successfully', {
                chunkIndex: result.chunk_index,
                segmentCount: result.transcript.length,
                ack: true,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Step 3: Complete the upload — merge all chunks, generate embeddings.
     */
    async completeUpload(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const sessionId = req.body.session_id as string;

            if (!sessionId) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'session_id is required',
                });
            }

            const session = await sessionService.completeUploadSession(sessionId, userId);
            new SuccessResponse('Upload complete. Session is ready.', session).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get upload progress (how many chunks received so far)
     */
    async getUploadProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const sessionId = req.params.id as string;
            const progress = sessionService.getUploadProgress(sessionId);

            if (!progress) {
                return res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'No active upload session found',
                });
            }

            new SuccessResponse('Upload progress', progress).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getUserSessions(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const sessions = await sessionService.getUserSessions(userId);
            new SuccessResponse('Sessions retrieved', sessions).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const session = await sessionService.getSession(id, userId);
            new SuccessResponse('Session retrieved', session).send(res);
        } catch (error) {
            next(error);
        }
    }

    async deleteSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            await sessionService.deleteSession(id, userId);
            new SuccessResponse('Session deleted').send(res);
        } catch (error) {
            next(error);
        }
    }

    async getTranscript(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const { start, end } = req.query;
            const transcript = await sessionService.getTranscript(
                id,
                userId,
                start ? Number(start) : undefined,
                end ? Number(end) : undefined
            );
            new SuccessResponse('Transcript retrieved', transcript).send(res);
        } catch (error) {
            next(error);
        }
    }

    async translateSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const { targetLanguage } = req.body;

            if (!targetLanguage) {
                return res.status(400).json({
                    success: false,
                    message: 'targetLanguage is required',
                });
            }

            const session = await sessionService.translateSession(id, userId, targetLanguage);
            new SuccessResponse('Transcription translated successfully', session).send(res);
        } catch (error) {
            next(error);
        }
    }

    async restoreOriginal(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const session = await sessionService.restoreOriginalTranscription(id, userId);
            new SuccessResponse('Original transcription restored', session).send(res);
        } catch (error) {
            next(error);
        }
    }

    async updateSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const { title } = req.body;

            if (!title || typeof title !== 'string' || title.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required',
                });
            }

            const session = await sessionService.updateSession(id, userId, { title: title.trim() });
            new SuccessResponse('Session updated', session).send(res);
        } catch (error) {
            next(error);
        }
    }

    async findExistingSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { videoUrl } = req.query as { videoUrl: string };

            if (!videoUrl) {
                return res.status(400).json({
                    success: false,
                    message: 'videoUrl is required',
                });
            }

            const session = await sessionService.findByVideoUrl(userId, videoUrl);
            new SuccessResponse(
                session ? 'Existing session found' : 'No existing session',
                session
            ).send(res);
        } catch (error) {
            next(error);
        }
    }

    async generateReport(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            
            const pdfBuffer = await reportService.generateReport(id, userId);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=report.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    }

    async shareSession(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const result = await sessionService.generateShareToken(id, userId);
            new SuccessResponse('Share link generated', result).send(res);
        } catch (error) {
            next(error);
        }
    }

    async revokeShare(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            await sessionService.revokeShare(id, userId);
            new SuccessResponse('Sharing revoked').send(res);
        } catch (error) {
            next(error);
        }
    }

    async getPublicSession(req: Request, res: Response, next: NextFunction) {
        try {
            const shareToken = String(req.params.shareToken);
            const result = await sessionService.getPublicSession(shareToken);
            new SuccessResponse('Public session retrieved', result).send(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new SessionController();
