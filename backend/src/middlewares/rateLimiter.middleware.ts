import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter: 200 requests per 15 minutes per IP.
 * Covers all /api/* endpoints as a baseline.
 */
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
});

/**
 * Strict AI limiter: 15 requests per minute per IP.
 * Applied to note generation, chat, and translation — all LLM-heavy routes.
 */
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'AI request limit reached. Please wait a moment before trying again.',
    },
});
