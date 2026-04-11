import { Router } from 'express';
import chatController from '@controllers/chat.controller';
import { authenticate } from '@middlewares/auth.middleware';
import { validateBody } from '@middlewares/validate.middleware';
import { sendChatMessageSchema } from '@validators/chat.validator';
import { aiLimiter } from '@middlewares/rateLimiter.middleware';

const router = Router();

router.use(authenticate);

router.post('/:sessionId', aiLimiter, validateBody(sendChatMessageSchema), chatController.sendMessage);
router.get('/:sessionId', chatController.getChatHistory);
router.delete('/:sessionId', chatController.clearChatHistory);

export default router;
