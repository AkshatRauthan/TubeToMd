import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import CustomError from '@errors/custom.error';

const errorHandler = (
    err: CustomError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    const message = err.explanation || err.message || "Something went wrong while processing your request";

    console.error(`[ErrorHandler] ${req.method} ${req.originalUrl} → ${statusCode}: ${message}`, err.stack ? err.stack.split('\n').slice(0, 3).join('\n') : '');

    res.status(statusCode).json({
        success: false,
        message,
    });
};

export default errorHandler;
