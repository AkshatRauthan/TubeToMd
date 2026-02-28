import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import type { ApiResponse, User } from '@/types';
import { Loader2 } from 'lucide-react';

export function AuthCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const setTokens = useAuthStore((s) => s.setTokens);

    useEffect(() => {
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        if (error) {
            console.error('[AuthCallback] OAuth error:', error);
            toast.error(error);
            navigate('/login', { replace: true });
            return;
        }

        if (!accessToken || !refreshToken) {
            console.error('[AuthCallback] Missing tokens in callback URL');
            toast.error('Authentication failed — no tokens received');
            navigate('/login', { replace: true });
            return;
        }

        console.log('[AuthCallback] Tokens received, fetching profile...');

        // Store tokens first, then fetch profile
        setTokens(accessToken, refreshToken);

        api.get<ApiResponse<User>>('/auth/profile')
            .then((res) => {
                const user = res.data.data;
                login(user, accessToken, refreshToken);
                toast.success(`Welcome, ${user.name}!`);
                console.log('[AuthCallback] ✅ Profile loaded, redirecting to dashboard');
                navigate('/dashboard', { replace: true });
            })
            .catch((err) => {
                console.error('[AuthCallback] ❌ Failed to fetch profile:', err);
                toast.error('Failed to complete authentication');
                navigate('/login', { replace: true });
            });
    }, [searchParams, navigate, login, setTokens]);

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    Completing Google sign-in...
                </p>
            </div>
        </div>
    );
}
