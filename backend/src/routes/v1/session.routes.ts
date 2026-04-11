import { Router } from 'express';
import sessionController from '@controllers/session.controller';
import { authenticate } from '@middlewares/auth.middleware';
import { uploadAudioChunk } from '@middlewares/upload.middleware';
import { validateBody } from '@middlewares/validate.middleware';
import {
    createYouTubeSessionSchema,
    initUploadSessionSchema,
    updateSessionSchema,
    translateSessionSchema,
} from '@validators/session.validator';

const router = Router();

// ─── Public Route (no auth) ─────────────────────────────────────────────────
// Must be declared before `router.use(authenticate)` to stay unauthenticated
router.get('/public/:shareToken', sessionController.getPublicSession);

// All session routes below are protected
router.use(authenticate);

// Session CRUD
router.get('/', sessionController.getUserSessions);
router.get('/find-by-url', sessionController.findExistingSession);
router.get('/:id', sessionController.getSession);
router.get('/:id/report', sessionController.generateReport);
router.put('/:id', validateBody(updateSessionSchema), sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);
router.get('/:id/transcript', sessionController.getTranscript);

// Sharing
router.post('/:id/share', sessionController.shareSession);
router.delete('/:id/share', sessionController.revokeShare);

// Translation
router.post('/:id/translate', validateBody(translateSessionSchema), sessionController.translateSession);
router.post('/:id/restore-original', sessionController.restoreOriginal);

// YouTube flow
router.post('/youtube', validateBody(createYouTubeSessionSchema), sessionController.createYouTubeSession);

// Chunk-based upload flow (browser-side FFmpeg.wasm)
router.post('/upload/init', validateBody(initUploadSessionSchema), sessionController.initUploadSession);
router.post(
    '/upload/chunk',
    uploadAudioChunk.single('chunk'),
    sessionController.uploadChunk
);
router.post('/upload/complete', sessionController.completeUpload);
router.get('/upload/progress/:id', sessionController.getUploadProgress);

export default router;
