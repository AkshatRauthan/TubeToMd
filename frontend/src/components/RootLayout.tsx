import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';

export function RootLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-[hsl(var(--background))]">
            <Navbar />
            <AnimatePresence mode="wait">
                <motion.main
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                    <Outlet />
                </motion.main>
            </AnimatePresence>
        </div>
    );
}
