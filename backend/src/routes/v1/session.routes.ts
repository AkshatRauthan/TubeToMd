import { Router } from 'express';
import sessionController from '@controllers/session.controller';
import { authenticate } from '@middlewares/auth.middleware';
import { uploadAudioChunk } from '@middlewares/upload.middleware';

const router = Router();

// All session routes are protected
router.use(authenticate);

// Session CRUD
router.get('/', sessionController.getUserSessions);
router.get('/find-by-url', sessionController.findExistingSession);
router.get('/:id', sessionController.getSession);
router.get('/:id/report', sessionController.generateReport);
router.put('/:id', sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);
router.get('/:id/transcript', sessionController.getTranscript);

// Translation
router.post('/:id/translate', sessionController.translateSession);
router.post('/:id/restore-original', sessionController.restoreOriginal);

// YouTube flow (unchanged)
router.post('/youtube', sessionController.createYouTubeSession);

// Chunk-based upload flow (browser-side FFmpeg.wasm)
router.post('/upload/init', sessionController.initUploadSession);
router.post(
    '/upload/chunk',
    uploadAudioChunk.single('chunk'),
    sessionController.uploadChunk
);
router.post('/upload/complete', sessionController.completeUpload);
router.get('/upload/progress/:id', sessionController.getUploadProgress);

export default router;
