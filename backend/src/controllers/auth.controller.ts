import { Request, Response, NextFunction } from 'express';
import authService from '@services/auth.service';
import SuccessResponse from '@common/success-response';
import { StatusCodes } from 'http-status-codes';
import serverConfig from '@config/server.config';
import {
    RegisterRequest,
    LoginRequest,
    GoogleAuthPayload,
    SetPasswordRequest,
    LinkGoogleRequest,
} from '@types';

class AuthController {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const data: RegisterRequest = req.body;
            const result = await authService.register(data);
            new SuccessResponse(
                'Registration successful',
                result,
                StatusCodes.CREATED
            ).send(res);
        } catch (error) {
            next(error);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const data: LoginRequest = req.body;
            const result = await authService.login(data);
            new SuccessResponse('Login successful', result).send(res);
        } catch (error) {
            next(error);
        }
    }

    async googleAuth(req: Request, res: Response, next: NextFunction) {
        try {
            const data: GoogleAuthPayload = req.body;
            const result = await authService.googleAuth(data);
            new SuccessResponse('Google authentication successful', result).send(res);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/google — Redirect user to Google's consent screen
     */
    async googleRedirect(_req: Request, res: Response, next: NextFunction) {
        try {
            const params = new URLSearchParams({
                client_id: serverConfig.GOOGLE_CLIENT_ID,
                redirect_uri: serverConfig.GOOGLE_CALLBACK_URL,
                response_type: 'code',
                scope: 'openid email profile',
                access_type: 'offline',
                prompt: 'consent',
            });
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            console.log(`🔐 [OAuth] Redirecting to Google consent screen`);
            res.redirect(googleAuthUrl);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /auth/google/callback — Handle Google's redirect back with auth code
     */
    async googleCallback(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, error: oauthError } = req.query;

            if (oauthError || !code) {
                console.error(`❌ [OAuth] Google callback error: ${oauthError || 'no code'}`);
                return res.redirect(
                    `${serverConfig.FRONTEND_URL}/login?error=${encodeURIComponent(String(oauthError || 'Google login failed'))}`
                );
            }

            console.log(`🔐 [OAuth] Received auth code, exchanging for tokens...`);

            // Exchange auth code for tokens
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    client_id: serverConfig.GOOGLE_CLIENT_ID,
                    client_secret: serverConfig.GOOGLE_CLIENT_SECRET,
                    redirect_uri: serverConfig.GOOGLE_CALLBACK_URL,
                    grant_type: 'authorization_code',
                }),
            });

            const tokenData = await tokenRes.json();

            if (!tokenRes.ok || !tokenData.access_token) {
                console.error(`❌ [OAuth] Token exchange failed:`, tokenData);
                return res.redirect(
                    `${serverConfig.FRONTEND_URL}/login?error=${encodeURIComponent('Failed to exchange Google auth code')}`
                );
            }

            // Fetch user profile from Google
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            const userInfo = await userInfoRes.json();

            if (!userInfoRes.ok || !userInfo.sub) {
                console.error(`❌ [OAuth] User info fetch failed:`, userInfo);
                return res.redirect(
                    `${serverConfig.FRONTEND_URL}/login?error=${encodeURIComponent('Failed to fetch Google profile')}`
                );
            }

            console.log(`✅ [OAuth] Google user: ${userInfo.email} (${userInfo.name})`);

            // Use existing authService to create/link user
            const payload: GoogleAuthPayload = {
                googleId: userInfo.sub,
                email: userInfo.email,
                name: userInfo.name,
                avatar: userInfo.picture,
            };

            const result = await authService.googleAuth(payload);

            // Redirect to frontend with tokens in URL
            const params = new URLSearchParams({
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
            });

            res.redirect(`${serverConfig.FRONTEND_URL}/auth/callback?${params.toString()}`);
        } catch (error) {
            console.error(`❌ [OAuth] Unexpected error:`, error);
            next(error);
        }
    }

    async setPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const data: SetPasswordRequest = req.body;
            await authService.setPassword(userId, data.password);
            new SuccessResponse('Password set successfully').send(res);
        } catch (error) {
            next(error);
        }
    }

    async linkGoogle(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const data = req.body;
            await authService.linkGoogle(userId, data);
            new SuccessResponse('Google account linked successfully').send(res);
        } catch (error) {
            next(error);
        }
    }

    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken(refreshToken);
            new SuccessResponse('Token refreshed', result).send(res);
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const user = await authService.getProfile(userId);
            new SuccessResponse('Profile retrieved', user).send(res);
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!._id;
            const user = await authService.updateProfile(userId, req.body);
            new SuccessResponse('Profile updated', user).send(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new AuthController();
