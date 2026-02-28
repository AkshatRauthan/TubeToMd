import mongoose, { Schema, Document } from 'mongoose';

export interface IChatSource {
    text: string;
    startTimestamp: number;
    endTimestamp: number;
}

export interface IChatMessage extends Document {
    sessionId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    role: 'user' | 'assistant';
    content: string;
    sources: IChatSource[];
    createdAt: Date;
}

const chatSourceSchema = new Schema<IChatSource>(
    {
        text: { type: String, required: true },
        startTimestamp: { type: Number, required: true },
        endTimestamp: { type: Number, required: true },
    },
    { _id: false }
);

const chatMessageSchema = new Schema<IChatMessage>(
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
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        sources: {
            type: [chatSourceSchema],
            default: [],
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

chatMessageSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        delete ret.__v;
        return ret;
    },
});

const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
export default ChatMessage;
