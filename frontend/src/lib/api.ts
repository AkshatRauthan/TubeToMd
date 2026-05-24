import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Get user-friendly error message from HTTP status code
 */
function getStatusMessage(status: number | string): string {
    const messages: Record<number, string> = {
        400: 'Invalid request. Please check your input.',
        401: 'Please log in to continue.',
        403: 'You don\'t have permission for this action.',
        404: 'The requested resource was not found.',
        408: 'Request timed out. Please try again.',
        429: 'Too many requests. Please wait a moment.',
        500: 'Server error. Please try again later.',
        502: 'Service temporarily unavailable.',
        503: 'Service unavailable. Please try again later.',
        504: 'Request timed out. Please try again.',
    };
    if (typeof status === 'string') {
        return 'Network error. Please check your connection.';
    }
    return messages[status] || 'Something went wrong. Please try again.';
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach JWT token + log
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Log outgoing requests
    const method = config.method?.toUpperCase() ?? '???';
    const url = `${config.baseURL ?? ''}${config.url ?? ''}`;
    console.log(`🚀 [API] ${method} ${url}`);
    (config as any)._startTime = Date.now();

    return config;
});

// Response interceptor — handle token refresh + log
api.interceptors.response.use(
    (response) => {
        const duration = Date.now() - ((response.config as any)._startTime || Date.now());
        const method = response.config.method?.toUpperCase() ?? '???';
        const url = `${response.config.baseURL ?? ''}${response.config.url ?? ''}`;
        console.log(`✅ [API] ${method} ${url} [${response.status}] ${duration}ms`);
        return response;
    },
    async (error) => {
        const config = error.config;
        const duration = Date.now() - ((config as any)?._startTime || Date.now());
        const method = config?.method?.toUpperCase() ?? '???';
        const url = `${config?.baseURL ?? ''}${config?.url ?? ''}`;
        const status = error.response?.status ?? 'NETWORK';
        
        // Extract clean error message - prefer server message, fallback to status text
        const serverMessage = error.response?.data?.message;
        const cleanMessage = serverMessage || getStatusMessage(status);
        
        console.error(`❌ [API] ${method} ${url} [${status}] ${duration}ms — ${cleanMessage}`);

        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
                try {
                    console.log('🔄 [API] Refreshing access token...');
                    const response = await axios.post('/api/v1/auth/refresh', {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } =
                        response.data.data;

                    useAuthStore.getState().setTokens(accessToken, newRefreshToken);
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    console.log('✅ [API] Token refreshed, retrying request');
                    return api(originalRequest);
                } catch {
                    console.warn('❌ [API] Token refresh failed, logging out');
                    useAuthStore.getState().logout();
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
