import jwt from 'jsonwebtoken';
import serverConfig from '@config/server.config';
import User, { IUser } from '@models/user.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';
import {
    RegisterRequest,
    LoginRequest,
    GoogleAuthPayload,
    AuthTokens,
    TokenPayload,
} from '@types';

class AuthService {
    /**
     * Generate access + refresh tokens
     */
    generateTokens(user: IUser): AuthTokens {
        const payload: TokenPayload = {
            userId: String(user._id),
            email: user.email,
        };

        const accessToken = jwt.sign(payload, serverConfig.JWT_SECRET, {
            expiresIn: serverConfig.JWT_EXPIRY,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(payload, serverConfig.JWT_REFRESH_SECRET, {
            expiresIn: serverConfig.JWT_REFRESH_EXPIRY,
        } as jwt.SignOptions);

        return { accessToken, refreshToken };
    }

    /**
     * Register with email/password
     */
    async register(data: RegisterRequest): Promise<{ user: IUser; tokens: AuthTokens }> {
        const existingUser = await User.findOne({ email: data.email.toLowerCase() });
        if (existingUser) {
            throw new CustomError('Email already registered', StatusCodes.CONFLICT);
        }

        const user = await User.create({
            email: data.email.toLowerCase(),
            password: data.password,
            name: data.name,
            authMethods: ['local'],
        });

        const tokens = this.generateTokens(user);
        return { user, tokens };
    }

    /**
     * Login with email/password
     */
    async login(data: LoginRequest): Promise<{ user: IUser; tokens: AuthTokens }> {
        const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password');
        if (!user) {
            throw new CustomError('Invalid email or password', StatusCodes.UNAUTHORIZED);
        }

        if (!user.password) {
            throw new CustomError(
                'This account uses Google login. Please use Google to sign in, or set a password first.',
                StatusCodes.UNAUTHORIZED
            );
        }

        const isMatch = await user.comparePassword(data.password);
        if (!isMatch) {
            throw new CustomError('Invalid email or password', StatusCodes.UNAUTHORIZED);
        }

        const tokens = this.generateTokens(user);
        return { user, tokens };
    }

    /**
     * Handle Google OAuth — links to existing account or creates new
     */
    async googleAuth(payload: GoogleAuthPayload): Promise<{ user: IUser; tokens: AuthTokens }> {
        // First check if user exists with this googleId
        let user = await User.findOne({ googleId: payload.googleId });

        if (user) {
            // Existing Google user — just sign in
            const tokens = this.generateTokens(user);
            return { user, tokens };
        }

        // Check if user exists with this email (from email/password registration)
        user = await User.findOne({ email: payload.email.toLowerCase() });

        if (user) {
            // Link Google to existing account
            user.googleId = payload.googleId;
            if (!user.authMethods.includes('google')) {
                user.authMethods.push('google');
            }
            if (payload.avatar && !user.avatar) {
                user.avatar = payload.avatar;
            }
            await user.save();

            const tokens = this.generateTokens(user);
            return { user, tokens };
        }

        // Create new user via Google
        user = await User.create({
            email: payload.email.toLowerCase(),
            name: payload.name,
            googleId: payload.googleId,
            avatar: payload.avatar,
            authMethods: ['google'],
        });

        const tokens = this.generateTokens(user);
        return { user, tokens };
    }

    /**
     * Set password for an OAuth-only account
     */
    async setPassword(userId: string, password: string): Promise<IUser> {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new CustomError('User not found', StatusCodes.NOT_FOUND);
        }

        user.password = password;
        if (!user.authMethods.includes('local')) {
            user.authMethods.push('local');
        }
        await user.save();

        return user;
    }

    /**
     * Link Google account to an existing local account
     */
    async linkGoogle(userId: string, googlePayload: GoogleAuthPayload): Promise<IUser> {
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError('User not found', StatusCodes.NOT_FOUND);
        }

        // Check if googleId is already linked to another account
        const existingGoogleUser = await User.findOne({ googleId: googlePayload.googleId });
        if (existingGoogleUser && existingGoogleUser._id?.toString() !== userId) {
            throw new CustomError(
                'This Google account is already linked to another user',
                StatusCodes.CONFLICT
            );
        }

        user.googleId = googlePayload.googleId;
        if (!user.authMethods.includes('google')) {
            user.authMethods.push('google');
        }
        if (googlePayload.avatar && !user.avatar) {
            user.avatar = googlePayload.avatar;
        }
        await user.save();

        return user;
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken: string): Promise<AuthTokens> {
        try {
            const decoded = jwt.verify(
                refreshToken,
                serverConfig.JWT_REFRESH_SECRET
            ) as TokenPayload;

            const user = await User.findById(decoded.userId);
            if (!user) {
                throw new CustomError('User not found', StatusCodes.UNAUTHORIZED);
            }

            return this.generateTokens(user);
        } catch (error) {
            throw new CustomError('Invalid refresh token', StatusCodes.UNAUTHORIZED);
        }
    }

    /**
     * Get user profile
     */
    async getProfile(userId: string): Promise<IUser> {
        const user = await User.findById(userId);
        if (!user) {
            throw new CustomError('User not found', StatusCodes.NOT_FOUND);
        }
        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(
        userId: string,
        updates: Partial<Pick<IUser, 'name' | 'avatar' | 'preferences'>>
    ): Promise<IUser> {
        const user = await User.findByIdAndUpdate(userId, updates, { new: true });
        if (!user) {
            throw new CustomError('User not found', StatusCodes.NOT_FOUND);
        }
        return user;
    }
}

export default new AuthService();
