import { Request, Response, NextFunction } from 'express';
import notesService from '@services/notes.service';
import exportService from '@services/export.service';
import SuccessResponse from '@common/success-response';
import { StatusCodes } from 'http-status-codes';
import { ExportFormat } from '@types';

class NotesController {
    async generateNotes(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            const note = await notesService.generateNotes(sessionId, userId, req.body);
            new SuccessResponse('Notes generated', note, StatusCodes.CREATED).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getSessionNotes(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            const notes = await notesService.getSessionNotes(sessionId, userId);
            new SuccessResponse('Notes retrieved', notes).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getNote(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const note = await notesService.getNote(id, userId);
            new SuccessResponse('Note retrieved', note).send(res);
        } catch (error) {
            next(error);
        }
    }

    async updateNote(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const note = await notesService.updateNote(id, userId, req.body);
            new SuccessResponse('Note updated', note).send(res);
        } catch (error) {
            next(error);
        }
    }

    async generateNoteImage(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const { prompt } = req.body || {};
            const note = await notesService.generateNoteImage(id, userId, prompt);
            new SuccessResponse('Image generated', note, StatusCodes.CREATED).send(res);
        } catch (error) {
            next(error);
        }
    }

    async deleteNote(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            await notesService.deleteNote(id, userId);
            new SuccessResponse('Note deleted').send(res);
        } catch (error) {
            next(error);
        }
    }

    async exportNote(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const format = req.query.format as ExportFormat;
            const note = await notesService.getNote(id, userId);
            const exported = await exportService.exportNote(note, format);

            res.setHeader('Content-Type', exported.contentType);
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${exported.filename}"`
            );
            res.send(exported.content);
        } catch (error) {
            next(error);
        }
    }
}

export default new NotesController();
