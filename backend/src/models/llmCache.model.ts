import mongoose, { Schema, Document } from 'mongoose';

export interface ILlmCache extends Document {
    cacheKey: string;
    modelName: string;
    operation: string;
    response: string;
    expiresAt: Date;
    createdAt: Date;
}

const llmCacheSchema = new Schema<ILlmCache>(
    {
        cacheKey: { type: String, required: true, unique: true, index: true },
        modelName: { type: String, required: true },
        operation: { type: String, required: true },
        response: { type: String, required: true },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// MongoDB TTL index — auto-evict expired cache entries
llmCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const LlmCache = mongoose.model<ILlmCache>('LlmCache', llmCacheSchema);
export default LlmCache;
