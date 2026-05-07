import ChatMessage, { IChatMessage } from '@models/chatMessage.model';
import Session from '@models/session.model';
import nimService from '@services/nim.service';
import embeddingService from '@services/embedding.service';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

class ChatService {
    /**
     * Process a user message and generate RAG-based response
     */
    async sendMessage(
        sessionId: string,
        userId: string,
        message: string
    ): Promise<IChatMessage> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        if (session.status !== 'ready') {
            throw new CustomError(
                'Session is not ready. Please wait for transcription to complete.',
                StatusCodes.BAD_REQUEST
            );
        }

        // Save user message
        await ChatMessage.create({
            sessionId,
            userId,
            role: 'user',
            content: message,
        });

        // Find relevant transcript chunks via vector search
        const relevantChunks = await embeddingService.findRelevantChunks(
            sessionId,
            message,
            5
        );

        // Get recent chat history for context
        const chatHistory = await ChatMessage.find({ sessionId, userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const historyForPrompt = chatHistory.reverse().map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        // Generate answer with RAG context
        const { answer, sources } = await nimService.answerQuestion(
            message,
            relevantChunks,
            historyForPrompt,
            session.title
        );

        // Save assistant message
        const assistantMessage = await ChatMessage.create({
            sessionId,
            userId,
            role: 'assistant',
            content: answer,
            sources: sources.map((s) => ({
                text: s.text,
                startTimestamp: s.startTimestamp,
                endTimestamp: s.endTimestamp,
            })),
        });

        return assistantMessage;
    }

    /**
     * Get chat history for a session
     */
    async getChatHistory(
        sessionId: string,
        userId: string
    ): Promise<IChatMessage[]> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        return ChatMessage.find({ sessionId, userId }).sort({ createdAt: 1 });
    }

    /**
     * Clear chat history for a session
     */
    async clearChatHistory(sessionId: string, userId: string): Promise<void> {
        const session = await Session.findOne({ _id: sessionId, userId });
        if (!session) {
            throw new CustomError('Session not found', StatusCodes.NOT_FOUND);
        }

        await ChatMessage.deleteMany({ sessionId, userId });
    }
}

export default new ChatService();
