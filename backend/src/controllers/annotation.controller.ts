import { Request, Response, NextFunction } from 'express';
import annotationService from '@services/annotation.service';
import SuccessResponse from '@common/success-response';
import { StatusCodes } from 'http-status-codes';

class AnnotationController {
    async createAnnotation(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            const annotation = await annotationService.createAnnotation(
                sessionId,
                userId,
                req.body
            );
            new SuccessResponse(
                'Annotation created',
                annotation,
                StatusCodes.CREATED
            ).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getAnnotations(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            const annotations = await annotationService.getAnnotations(
                sessionId,
                userId
            );
            new SuccessResponse('Annotations retrieved', annotations).send(res);
        } catch (error) {
            next(error);
        }
    }

    async updateAnnotation(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const annotation = await annotationService.updateAnnotation(
                id,
                userId,
                req.body
            );
            new SuccessResponse('Annotation updated', annotation).send(res);
        } catch (error) {
            next(error);
        }
    }

    async deleteAnnotation(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            await annotationService.deleteAnnotation(id, userId);
            new SuccessResponse('Annotation deleted').send(res);
        } catch (error) {
            next(error);
        }
    }

    async appendToNote(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const id = req.params.id as string;
            const { noteId } = req.body;
            const annotation = await annotationService.appendToNote(
                id,
                noteId,
                userId
            );
            new SuccessResponse('Annotation appended to note', annotation).send(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new AnnotationController();
