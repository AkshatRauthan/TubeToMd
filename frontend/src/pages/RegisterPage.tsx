import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiResponse, User } from '@/types';
import { Loader2, Mail, Lock, User as UserIcon } from 'lucide-react';

export function RegisterPage() {
    const [name, setName] = useState('');
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
            >('/auth/register', { name, email, password });

            const { user, tokens } = res.data.data;
            login(user, tokens.accessToken, tokens.refreshToken);
            toast.success(`Welcome, ${user.name}! Account created.`);
            navigate('/dashboard');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Registration failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = () => {
        window.location.href = '/api/v1/auth/google';
    };

    return (
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4 relative min-h-[calc(100vh-4rem)]">
            {/* Background Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] hero-glow rounded-full pointer-events-none"></div>
            
            {/* Registration Card */}
            <div className="w-full max-w-md relative z-10">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="glass-card p-8 md:p-10 rounded-[2rem] border border-[var(--color-outline-variant)]/20 shadow-2xl transition-all duration-500 hover:shadow-pink-500/10 bg-surface-container/70 dark:bg-[#111827]/70"
                >
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-black tracking-tight text-white mb-2 font-headline">Create account</h1>
                        <p className="text-[var(--color-on-surface-variant)] font-medium leading-relaxed">Join TubeToMD to transform knowledge.</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 p-3 text-sm text-[var(--color-error)]"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] ml-1">Full Name</label>
                            <div className="relative group">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-outline)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input 
                                    className="w-full bg-surface dark:bg-[#111827] pl-12 pr-4 py-4 border border-[var(--color-outline-variant)]/30 rounded-xl text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)]/50 focus:ring-2 focus:ring-[var(--color-primary-container)] focus:border-transparent transition-all outline-none" 
                                    placeholder="Jane Doe" 
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-outline)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input 
                                    className="w-full bg-surface dark:bg-[#111827] pl-12 pr-4 py-4 border border-[var(--color-outline-variant)]/30 rounded-xl text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)]/50 focus:ring-2 focus:ring-[var(--color-primary-container)] focus:border-transparent transition-all outline-none" 
                                    placeholder="name@example.com" 
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--color-outline)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input 
                                    className="w-full bg-surface dark:bg-[#111827] pl-12 pr-4 py-4 border border-[var(--color-outline-variant)]/30 rounded-xl text-[var(--color-on-surface)] placeholder:text-[var(--color-outline)]/50 focus:ring-2 focus:ring-[var(--color-primary-container)] focus:border-transparent transition-all outline-none" 
                                    placeholder="••••••••" 
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 space-y-4">
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[var(--color-primary-container)] to-[#ff80ab] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] active:scale-[0.98] transition-all duration-300 text-lg disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Creating account...
                                    </>
                                ) : (
                                    'Sign Up'
                                )}
                            </button>

                            <div className="relative flex items-center justify-center py-2">
                                <div className="flex-grow border-t border-[var(--color-outline-variant)]/20"></div>
                                <span className="px-4 text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-tight">or continue with</span>
                                <div className="flex-grow border-t border-[var(--color-outline-variant)]/20"></div>
                            </div>

                            <button 
                                type="button"
                                onClick={handleGoogleSignup}
                                className="w-full flex items-center justify-center gap-3 bg-[var(--color-surface-container-high)]/40 hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] font-semibold rounded-xl border border-[var(--color-outline-variant)]/20 py-4 transition-all duration-300 active:scale-[0.98]"
                            >
                                <svg className="w-5 h-5 transition-transform" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"></path>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                                </svg>
                                Google
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-[var(--color-on-surface-variant)]">
                        Already have an account? 
                        <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline decoration-2 underline-offset-4 ml-1">
                            Sign in
                        </Link>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
