import { Router } from 'express';
import authController from '@controllers/auth.controller';
import { authenticate } from '@middlewares/auth.middleware';

const router = Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.get('/google', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/set-password', authenticate, authController.setPassword);
router.post('/link-google', authenticate, authController.linkGoogle);

export default router;
