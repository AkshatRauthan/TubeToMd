// User
export interface User {
    _id: string;
    email: string;
    name: string;
    avatar?: string;
    authMethods: ('local' | 'google')[];
    preferences?: {
        defaultPersona?: string;
        language?: string;
    };
    createdAt: string;
    updatedAt?: string;
}

// Session
export interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

export interface Session {
    _id: string;
    userId: string;
    title: string;
    videoType: 'youtube' | 'uploaded';
    videoUrl?: string;
    videoPath?: string;
    thumbnailUrl?: string;
    duration?: number;
    transcription: TranscriptSegment[];
    status: 'processing' | 'transcribing' | 'transcribed' | 'ready' | 'failed';
    errorMessage?: string;
    metadata?: {
        channel?: string;
        uploadDate?: string;
        description?: string;
        language?: string;
        translatedTo?: string;
        originalLanguage?: string;
    };
    createdAt: string;
    updatedAt: string;
}

// Note
export type NoteType =
    | 'summary'
    | 'detailed_notes'
    | 'mindmap'
    | 'flowchart'
    | 'diagram'
    | 'flashcards'
    | 'resources'
    | 'custom';

export interface Note {
    _id: string;
    sessionId: string;
    userId: string;
    type: NoteType;
    title: string;
    content: string;
    persona?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    topic?: string;
    mermaidCode?: string;
    isEdited: boolean;
    createdAt: string;
    updatedAt: string;
}

// Chat
export interface ChatSource {
    text: string;
    startTimestamp: number;
    endTimestamp: number;
}

export interface ChatMessage {
    _id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: ChatSource[];
    createdAt: string;
}

// Annotation
export interface Annotation {
    _id: string;
    sessionId: string;
    selectedText: string;
    highlightColor?: string;
    note?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    appendedToNoteId?: string;
    createdAt: string;
}

// API Response
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data: T;
}
