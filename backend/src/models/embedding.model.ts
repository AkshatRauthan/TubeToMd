import mongoose, { Schema, Document } from 'mongoose';

export interface IEmbedding extends Document {
    sessionId: mongoose.Types.ObjectId;
    chunkText: string;
    chunkIndex: number;
    startTimestamp: number;
    endTimestamp: number;
    embedding: number[];
}

const embeddingSchema = new Schema<IEmbedding>(
    {
        sessionId: {
            type: Schema.Types.ObjectId,
            ref: 'Session',
            required: true,
            index: true,
        },
        chunkText: {
            type: String,
            required: true,
        },
        chunkIndex: {
            type: Number,
            required: true,
        },
        startTimestamp: {
            type: Number,
            required: true,
        },
        endTimestamp: {
            type: Number,
            required: true,
        },
        embedding: {
            type: [Number],
            required: true,
        },
    },
    {
        timestamps: false,
    }
);

// Compound index for session lookups
embeddingSchema.index({ sessionId: 1, chunkIndex: 1 });

embeddingSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

const Embedding = mongoose.model<IEmbedding>('Embedding', embeddingSchema);
export default Embedding;
