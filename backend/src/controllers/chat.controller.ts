import { Request, Response, NextFunction } from 'express';
import chatService from '@services/chat.service';
import SuccessResponse from '@common/success-response';

class ChatController {
    async sendMessage(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            const { message } = req.body;
            const response = await chatService.sendMessage(sessionId, userId, message);
            new SuccessResponse('Message processed', response).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getChatHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            const messages = await chatService.getChatHistory(sessionId, userId);
            new SuccessResponse('Chat history retrieved', messages).send(res);
        } catch (error) {
            next(error);
        }
    }

    async clearChatHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const { sessionId } = req.params as { sessionId: string };
            await chatService.clearChatHistory(sessionId, userId);
            new SuccessResponse('Chat history cleared').send(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new ChatController();
