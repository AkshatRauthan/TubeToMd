import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useTheme } from '@/contexts/ThemeContext';
import { LogOut, Menu, X, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 shadow-sm dark:shadow-[0_0_40px_-15px_rgba(219,39,119,0.3)] transition-colors duration-300">
            <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group cursor-pointer">
                    <span className="material-symbols-outlined text-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>movie_edit</span>
                    <span className="text-2xl font-black bg-gradient-to-br from-pink-500 to-pink-300 bg-clip-text text-transparent tracking-tighter">TubeToMD</span>
                </Link>

                {/* Desktop nav links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link to="/" className="text-primary font-semibold transition-colors flex items-center gap-1">
                        Home
                    </Link>
                    {isAuthenticated && (
                        <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors flex items-center gap-1">
                            Dashboard
                        </Link>
                    )}
                </div>

                {/* Desktop actions */}
                <div className="hidden md:flex items-center gap-6">
                    <button
                        onClick={toggleTheme}
                        className="rounded-full p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Toggle dark mode"
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    {isAuthenticated ? (
                        <>
                            <div className="h-5 w-px bg-slate-300 dark:bg-slate-800" />
                            <span className="text-sm text-slate-700 dark:text-slate-400 font-medium">
                                {user?.name}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-500/10 transition-all duration-200"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors text-sm font-medium"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="bg-gradient-to-br from-primary-container to-primary text-white px-6 py-2.5 rounded-3xl font-bold text-sm shadow-[0_4px_14px_0_rgba(219,39,119,0.39)] hover:shadow-[0_6px_20px_rgba(219,39,119,0.23)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-300"
                            >
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile menu button */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                    <button
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile nav */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
                    >
                        <div className="py-4 px-6 space-y-4">
                            {isAuthenticated ? (
                                <>
                                    <Link
                                        to="/dashboard"
                                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        <LayoutDashboard className="h-4 w-4" />
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={() => { handleLogout(); setMobileOpen(false); }}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 w-full transition"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="block rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="block text-center bg-gradient-to-br from-primary-container to-primary text-white px-6 py-2.5 rounded-3xl font-bold text-sm shadow-[0_4px_14px_0_rgba(219,39,119,0.39)] transition-all"
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
