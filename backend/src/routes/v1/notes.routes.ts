import { Router } from 'express';
import notesController from '@controllers/notes.controller';
import { authenticate } from '@middlewares/auth.middleware';
import { validateBody } from '@middlewares/validate.middleware';
import { generateNotesSchema, updateNoteSchema } from '@validators/notes.validator';
import { aiLimiter } from '@middlewares/rateLimiter.middleware';

const router = Router();

router.use(authenticate);

// Session-scoped routes
router.post('/session/:sessionId/generate', aiLimiter, validateBody(generateNotesSchema), notesController.generateNotes);
router.get('/session/:sessionId', notesController.getSessionNotes);

// Note-specific routes
router.get('/:id', notesController.getNote);
router.put('/:id', validateBody(updateNoteSchema), notesController.updateNote);
router.delete('/:id', notesController.deleteNote);
router.get('/:id/export', notesController.exportNote);
router.post('/:id/image', aiLimiter, notesController.generateNoteImage);

export default router;
