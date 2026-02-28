import Annotation, { IAnnotation } from '@models/annotation.model';
import Session from '@models/session.model';
import Note from '@models/note.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

class AnnotationService {
    /**
     * Create an annotation/highlight
     */
    async createAnnotation(
        sessionId: string,
        userId: string,
        data: {
            selectedText: string;
            highlightColor?: string;
            note?: string;
            startTimestamp?: number;
            endTimestamp?: number;
        }
    ): Promise<IAnnotation> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        return Annotation.create({
            sessionId,
            userId,
            ...data,
        });
    }

    /**
     * Get all annotations for a session
     */
    async getAnnotations(sessionId: string, userId: string): Promise<IAnnotation[]> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        return Annotation.find({ sessionId, userId }).sort({ createdAt: 1 });
    }

    /**
     * Update an annotation
     */
    async updateAnnotation(
        annotationId: string,
        userId: string,
        updates: { note?: string; highlightColor?: string }
    ): Promise<IAnnotation> {
        const annotation = await Annotation.findOneAndUpdate(
            { _id: annotationId, userId },
            updates,
            { new: true }
        );
        if (!annotation) {
            throw new CustomError('Annotation not found', StatusCodes.NOT_FOUND);
        }
        return annotation;
    }

    /**
     * Delete an annotation
     */
    async deleteAnnotation(annotationId: string, userId: string): Promise<void> {
        const result = await Annotation.findOneAndDelete({ _id: annotationId, userId });
        if (!result) {
            throw new CustomError('Annotation not found', StatusCodes.NOT_FOUND);
        }
    }

    /**
     * Append annotation text to an existing note
     */
    async appendToNote(
        annotationId: string,
        noteId: string,
        userId: string
    ): Promise<IAnnotation> {
        const annotation = await Annotation.findOne({ _id: annotationId, userId });
        if (!annotation) {
            throw new CustomError('Annotation not found', StatusCodes.NOT_FOUND);
        }

        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            throw new CustomError('Note not found', StatusCodes.NOT_FOUND);
        }

        // Append highlighted text to note
        const timestamp = annotation.startTimestamp
            ? `[${Math.floor(annotation.startTimestamp / 60)}:${Math.floor(annotation.startTimestamp % 60).toString().padStart(2, '0')}]`
            : '';

        note.content += `\n\n> ${timestamp} ${annotation.selectedText}`;
        if (annotation.note) {
            note.content += `\n> _Note: ${annotation.note}_`;
        }
        note.isEdited = true;
        await note.save();

        annotation.appendedToNoteId = note._id as any;
        await annotation.save();

        return annotation;
    }
}

export default new AnnotationService();
