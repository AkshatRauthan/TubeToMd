import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnotation extends Document {
    sessionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    selectedText: string;
    highlightColor: string;
    note?: string;
    startTimestamp?: number;
    endTimestamp?: number;
    appendedToNoteId?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const annotationSchema = new Schema<IAnnotation>(
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
        },
        selectedText: {
            type: String,
            required: true,
        },
        highlightColor: {
            type: String,
            default: '#FFFF00',
        },
        note: { type: String },
        startTimestamp: { type: Number },
        endTimestamp: { type: Number },
        appendedToNoteId: {
            type: Schema.Types.ObjectId,
            ref: 'Note',
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

annotationSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

const Annotation = mongoose.model<IAnnotation>('Annotation', annotationSchema);
export default Annotation;
