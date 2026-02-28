import express from 'express';
import authRoutes from '@v1routes/auth.routes';
import sessionRoutes from '@v1routes/session.routes';
import notesRoutes from '@v1routes/notes.routes';
import chatRoutes from '@v1routes/chat.routes';
import annotationRoutes from '@v1routes/annotation.routes';
import adminRoutes from '@v1routes/admin.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sessions', sessionRoutes);
router.use('/notes', notesRoutes);
router.use('/chat', chatRoutes);
router.use('/annotations', annotationRoutes);
router.use('/admin', adminRoutes);

export default router;