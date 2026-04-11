import { z } from 'zod';

const noteTypeSchema = z.enum([
    'summary', 'detailed_notes', 'mindmap', 'flowchart',
    'diagram', 'flashcards', 'resources', 'custom',
]);

const personaSchema = z.enum([
    'detailed', 'executive', 'eli5', 'code-heavy', 'actionable', 'academic', 'custom',
]).optional();

export const generateNotesSchema = z.object({
    type: noteTypeSchema,
    persona: personaSchema,
    topic: z.string().max(300).optional(),
    customPrompt: z.string().max(1000).optional(),
    startTimestamp: z.number().min(0).optional(),
    endTimestamp: z.number().min(0).optional(),
});

export const updateNoteSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().optional(),
});
