import { Router, Request, Response, NextFunction } from 'express';
import geminiKeyManager from '@services/geminiKeyManager.service';
import serverConfig from '@config/server.config';

const router = Router();

/**
 * Admin auth middleware — validates a special bearer token from env.
 * Header: Authorization: Bearer <ADMIN_API_TOKEN>
 */
function adminAuth(req: Request, res: Response, next: NextFunction) {
    const adminToken = serverConfig.ADMIN_API_TOKEN;

    if (!adminToken) {
        return res.status(500).json({
            success: false,
            message: 'ADMIN_API_TOKEN is not configured on the server.',
        });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Missing or invalid Authorization header. Use: Bearer <ADMIN_API_TOKEN>',
        });
    }

    const token = authHeader.slice(7);
    if (token !== adminToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid admin token.',
        });
    }

    next();
}

// All admin routes require the special bearer token
router.use(adminAuth);

/**
 * GET /api/v1/admin/gemini-keys
 * Get status of all configured Gemini API keys.
 */
router.get('/gemini-keys', (_req: Request, res: Response) => {
    const status = geminiKeyManager.getStatus();
    res.json({ success: true, message: 'Key pool status', data: status });
});

/**
 * POST /api/v1/admin/gemini-keys
 * Add a new Gemini API key to the pool.
 * Body: { key: string, label?: string }
 */
router.post('/gemini-keys', (req: Request, res: Response) => {
    const { key, label } = req.body;

    if (!key || typeof key !== 'string' || key.trim().length < 10) {
        return res.status(400).json({
            success: false,
            message: 'A valid "key" field is required.',
        });
    }

    const added = geminiKeyManager.addKey(key.trim(), label);

    if (!added) {
        return res.status(409).json({
            success: false,
            message: 'This key already exists in the pool.',
        });
    }

    const status = geminiKeyManager.getStatus();
    res.status(201).json({
        success: true,
        message: 'Key added to pool.',
        data: status,
    });
});

/**
 * DELETE /api/v1/admin/gemini-keys
 * Remove a Gemini API key from the pool.
 * Body: { key: string }
 */
router.delete('/gemini-keys', (req: Request, res: Response) => {
    const { key } = req.body;

    if (!key || typeof key !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'A valid "key" field is required.',
        });
    }

    const removed = geminiKeyManager.removeKey(key.trim());

    if (!removed) {
        return res.status(404).json({
            success: false,
            message: 'Key not found in pool.',
        });
    }

    const status = geminiKeyManager.getStatus();
    res.json({
        success: true,
        message: 'Key removed from pool.',
        data: status,
    });
});

export default router;
