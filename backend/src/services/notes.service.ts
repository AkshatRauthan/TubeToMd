import Note, { INote } from '@models/note.model';
import Session from '@models/session.model';
import nimService from '@services/nim.service';
import imageService from '@services/image.service';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';
import { GenerateNotesRequest, UpdateNoteRequest } from '@types';

class NotesService {
    /**
     * Generate notes for a session
     */
    async generateNotes(
        sessionId: string,
        userId: string,
        request: GenerateNotesRequest
    ): Promise<INote> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        if (session.status !== 'ready') {
            throw new CustomError(
                'Session is not ready yet. Please wait for transcription to complete.',
                StatusCodes.BAD_REQUEST
            );
        }

        const noteQuery: Record<string, unknown> = {
            sessionId,
            userId,
            type: request.type,
        };
        if (request.persona) noteQuery.persona = request.persona;
        if (request.topic) noteQuery.topic = request.topic;
        if (request.startTimestamp !== undefined) {
            noteQuery.startTimestamp = request.startTimestamp;
        }
        if (request.endTimestamp !== undefined) {
            noteQuery.endTimestamp = request.endTimestamp;
        }

        if (!request.regenerate) {
            const existing = await Note.findOne(noteQuery).sort({ createdAt: -1 });
            if (existing) return existing;
        }

        const result = await nimService.generateNotes(
            session.transcription,
            request.type,
            {
                persona: request.persona,
                topic: request.topic,
                startTimestamp: request.startTimestamp,
                endTimestamp: request.endTimestamp,
                customPrompt: request.customPrompt,
                videoTitle: session.title,
            }
        );

        const note = await Note.create({
            sessionId,
            userId,
            type: request.type,
            title: result.title,
            content: result.content,
            persona: request.persona,
            startTimestamp: request.startTimestamp,
            endTimestamp: request.endTimestamp,
            topic: request.topic,
            mermaidCode: result.mermaidCode,
            isEdited: false,
        });

        return note;
    }

    /**
     * Get all notes for a session
     */
    async getSessionNotes(sessionId: string, userId: string): Promise<INote[]> {
        // Verify session ownership
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        return Note.find({ sessionId, userId }).sort({ createdAt: -1 });
    }

    /**
     * Get a specific note
     */
    async getNote(noteId: string, userId: string): Promise<INote> {
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            throw new CustomError('Note not found', StatusCodes.NOT_FOUND);
        }
        return note;
    }

    /**
     * Update a note (edit content)
     */
    async updateNote(
        noteId: string,
        userId: string,
        updates: UpdateNoteRequest
    ): Promise<INote> {
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            throw new CustomError('Note not found', StatusCodes.NOT_FOUND);
        }

        if (updates.title) note.title = updates.title;
        if (updates.content !== undefined) {
            note.content = updates.content;
            note.isEdited = true;
        }

        await note.save();
        return note;
    }

    /**
     * Generate a cover image for a note using NVIDIA NIM image models.
     * Saves the image to disk and stores the URL on the note.
     */
    async generateNoteImage(
        noteId: string,
        userId: string,
        customPrompt?: string
    ): Promise<INote> {
        const note = await Note.findOne({ _id: noteId, userId });
        if (!note) {
            throw new CustomError('Note not found', StatusCodes.NOT_FOUND);
        }

        const prompt = customPrompt?.trim()
            ? customPrompt.trim()
            : imageService.buildCoverPrompt(note.title, note.content);

        const result = await imageService.generate(userId, { prompt, aspectRatio: '16:9' });

        note.imageUrl = result.relativeUrl;
        await note.save();
        return note;
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId: string, userId: string): Promise<void> {
        const result = await Note.findOneAndDelete({ _id: noteId, userId });
        if (!result) {
            throw new CustomError('Note not found', StatusCodes.NOT_FOUND);
        }
    }
}

export default new NotesService();
