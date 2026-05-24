import mongoose, { Schema, Document } from 'mongoose';

export interface ITranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    videoType: 'youtube' | 'uploaded';
    videoUrl?: string;
    videoPath?: string;
    thumbnailUrl?: string;
    duration?: number;
    fileChecksum?: string;
    transcription: ITranscriptSegment[];
    status: 'processing' | 'transcribing' | 'transcribed' | 'ready' | 'failed';
    errorMessage?: string;
    metadata: {
        channel?: string;
        uploadDate?: string;
        description?: string;
        language?: string;
        translatedTo?: string;
        originalLanguage?: string;
        originalTranscription?: string;
    };
    timeRange?: {
        start: number;
        end: number;
    };
    shareToken?: string;
    isPublic?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const transcriptSegmentSchema = new Schema<ITranscriptSegment>(
    {
        start: { type: Number, required: true },
        duration: { type: Number, required: true },
        text: { type: String, required: true },
    },
    { _id: false }
);

const sessionSchema = new Schema<ISession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        videoType: {
            type: String,
            enum: ['youtube', 'uploaded'],
            required: true,
        },
        videoUrl: { type: String },
        videoPath: { type: String },
        thumbnailUrl: { type: String },
        duration: { type: Number },
        fileChecksum: { type: String, index: true, sparse: true },
        transcription: {
            type: [transcriptSegmentSchema],
            default: [],
        },
        status: {
            type: String,
            enum: ['processing', 'transcribing', 'transcribed', 'ready', 'failed'],
            default: 'processing',
        },
        errorMessage: { type: String },
        metadata: {
            channel: { type: String },
            uploadDate: { type: String },
            description: { type: String },
            language: { type: String },
            translatedTo: { type: String },
            originalLanguage: { type: String },
            originalTranscription: { type: String },
        },
        timeRange: {
            start: { type: Number },
            end: { type: Number },
        },
        shareToken: { type: String, sparse: true, index: true },
        isPublic: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

sessionSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

const Session = mongoose.model<ISession>('Session', sessionSchema);
export default Session;
