import mongoose, { Schema, Document } from 'mongoose';

export type NoteType =
    | 'summary'
    | 'detailed_notes'
    | 'mindmap'
    | 'flowchart'
    | 'diagram'
    | 'flashcards'
    | 'resources'
    | 'custom';

export interface INote extends Document {
    sessionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    type: NoteType;
    title: string;
    content: string;
    persona?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    topic?: string;
    isEdited: boolean;
    mermaidCode?: string;
    imageUrl?: string;
    exportFormats: string[];
    createdAt: Date;
    updatedAt: Date;
}

const noteSchema = new Schema<INote>(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: 'Session',
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: [
                'summary',
                'detailed_notes',
                'mindmap',
                'flowchart',
                'diagram',
                'flashcards',
                'resources',
                'custom',
            ],
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            default: '',
        },
        persona: { type: String },
        startTimestamp: { type: Number },
        endTimestamp: { type: Number },
        topic: { type: String },
        isEdited: {
            type: Boolean,
            default: false,
        },
        mermaidCode: { type: String },
        imageUrl: { type: String },
        exportFormats: {
            type: [String],
            default: ['md', 'pdf', 'docx', 'html'],
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queries
noteSchema.index({ sessionId: 1, type: 1 });

noteSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

const Note = mongoose.model<INote>('Note', noteSchema);
export default Note;
