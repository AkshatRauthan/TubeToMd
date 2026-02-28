import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { LogOut, Menu, X, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoImg from '@/assets/TubeToMD.png';

export function Navbar() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="sticky top-0 z-50 bg-[hsl(var(--card))]/80 backdrop-blur-md border-b border-[hsl(var(--border))]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <img
                            src={logoImg}
                            alt="TubeToMD"
                            className="h-8 w-auto"
                        />
                        <span className="text-xl font-bold text-gradient">
                            TubeToMD
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition-all duration-200"
                                >
                                    <LayoutDashboard className="h-4 w-4" />
                                    Dashboard
                                </Link>
                                <div className="h-5 w-px bg-[hsl(var(--border))]" />
                                <span className="text-sm text-[hsl(var(--muted-foreground))] font-medium">
                                    {user?.name}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 transition-all duration-200"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all duration-200"
                                >
                                    Login
                                </Link>
                                <Link
                                    to="/register"
                                    className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold shadow-md"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden items-center gap-2">
                        <button
                            className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
                            className="md:hidden overflow-hidden"
                        >
                            <div className="py-4 space-y-1">
                                {isAuthenticated ? (
                                    <>
                                        <Link
                                            to="/dashboard"
                                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-[hsl(var(--secondary))] transition"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            <LayoutDashboard className="h-4 w-4" />
                                            Dashboard
                                        </Link>
                                        <button
                                            onClick={() => { handleLogout(); setMobileOpen(false); }}
                                            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 w-full transition"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            to="/login"
                                            className="block rounded-lg px-3 py-2.5 text-sm hover:bg-[hsl(var(--secondary))] transition"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            Login
                                        </Link>
                                        <Link
                                            to="/register"
                                            className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] transition"
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
            </div>
        </nav>
    );
}
