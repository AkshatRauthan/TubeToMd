import { Router } from 'express';
import notesController from '@controllers/notes.controller';
import { authenticate } from '@middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Session-scoped routes
router.post('/session/:sessionId/generate', notesController.generateNotes);
router.get('/session/:sessionId', notesController.getSessionNotes);

// Note-specific routes
router.get('/:id', notesController.getNote);
router.put('/:id', notesController.updateNote);
router.delete('/:id', notesController.deleteNote);
router.get('/:id/export', notesController.exportNote);

export default router;
