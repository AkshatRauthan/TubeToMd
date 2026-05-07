import mongoose, { Schema, Document } from 'mongoose';

export interface IImageQuota extends Document {
    userId: mongoose.Types.ObjectId;
    day: string; // YYYY-MM-DD UTC
    count: number;
}

const imageQuotaSchema = new Schema<IImageQuota>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        day: { type: String, required: true },
        count: { type: Number, default: 0 },
    },
    { timestamps: true }
);

imageQuotaSchema.index({ userId: 1, day: 1 }, { unique: true });

const ImageQuota = mongoose.model<IImageQuota>('ImageQuota', imageQuotaSchema);
export default ImageQuota;
