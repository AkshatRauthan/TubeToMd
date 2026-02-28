import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiResponse, User } from '@/types';
import { Loader2, Mail, Lock } from 'lucide-react';
import logoImg from '@/assets/TubeToMD.png';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post<
                ApiResponse<{ user: User; tokens: { accessToken: string; refreshToken: string } }>
            >('/auth/login', { email, password });

            const { user, tokens } = res.data.data;
            login(user, tokens.accessToken, tokens.refreshToken);
            toast.success(`Welcome back, ${user.name}!`);
            navigate('/dashboard');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Login failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        window.location.href = '/api/v1/auth/google';
    };

    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="w-full max-w-md card rounded-2xl p-8 shadow-xl"
            >
                <div className="flex justify-center mb-6">
                    <img src={logoImg} alt="TubeToMD" className="h-10 w-auto" />
                </div>

                <h2 className="text-2xl font-bold text-center">Welcome Back</h2>
                <p className="mt-2 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    Sign in to access your sessions & notes
                </p>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 rounded-xl bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 p-3 text-sm text-[hsl(var(--destructive))]"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-all"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] pl-10 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[hsl(var(--border))]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="px-3 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]">
                            or continue with
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] py-2.5 text-sm font-medium hover:bg-[hsl(var(--muted))] transition-all duration-200"
                >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <p className="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
                    Don't have an account?{' '}
                    <Link to="/register" className="font-semibold text-[hsl(var(--primary))] hover:opacity-80 transition">
                        Sign Up
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
