export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface GoogleAuthPayload {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
}

export interface TokenPayload {
    userId: string;
    email: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface SetPasswordRequest {
    password: string;
}

export interface LinkGoogleRequest {
    googleToken: string;
}
