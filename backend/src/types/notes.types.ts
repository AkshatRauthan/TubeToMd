import { NoteType } from '@models/note.model';

export interface GenerateNotesRequest {
    type: NoteType;
    persona?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    topic?: string;
    customPrompt?: string;
    regenerate?: boolean;
}

export interface UpdateNoteRequest {
    title?: string;
    content?: string;
}

export type ExportFormat = 'md' | 'pdf' | 'docx' | 'html';
