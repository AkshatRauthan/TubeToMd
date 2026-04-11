import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { StatusCodes } from 'http-status-codes';

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with structured field errors on failure.
 */
export function validateBody(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            // Zod v4 uses result.error.issues; v3 uses result.error.errors
            const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
            const errors = issues.map((e: any) => ({
                field: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
                message: e.message,
            }));
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
            return;
        }
        // Replace body with coerced/validated data
        req.body = result.data;
        next();
    };
}
