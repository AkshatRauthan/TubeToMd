import { Router } from 'express';
import annotationController from '@controllers/annotation.controller';
import { authenticate } from '@middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

// Session-scoped routes
router.post('/session/:sessionId', annotationController.createAnnotation);
router.get('/session/:sessionId', annotationController.getAnnotations);

// Annotation-specific routes
router.put('/:id', annotationController.updateAnnotation);
router.delete('/:id', annotationController.deleteAnnotation);
router.post('/:id/append', annotationController.appendToNote);

export default router;
