import { Router } from 'express';
import chatController from '@controllers/chat.controller';
import { authenticate } from '@middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/:sessionId', chatController.sendMessage);
router.get('/:sessionId', chatController.getChatHistory);
router.delete('/:sessionId', chatController.clearChatHistory);

export default router;
