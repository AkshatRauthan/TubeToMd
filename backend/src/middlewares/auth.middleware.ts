import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import serverConfig from '@config/server.config';
import { TokenPayload } from '@types';
import User from '@models/user.model';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                _id: string;
                userId: string;
                email: string;
            };
        }
    }
}

export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Access token is required',
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, serverConfig.JWT_SECRET) as TokenPayload;

        // Verify user still exists
        const user = await User.findById(decoded.userId);
        if (!user) {
            res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'User no longer exists',
            });
            return;
        }

        req.user = {
            _id: decoded.userId,
            userId: decoded.userId,
            email: decoded.email,
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(StatusCodes.UNAUTHORIZED).json({
                success: false,
                message: 'Token expired',
            });
            return;
        }

        res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: 'Invalid token',
        });
    }
};
