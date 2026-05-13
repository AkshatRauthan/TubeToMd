import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/components/RootLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SessionPage } from '@/pages/SessionPage';
import { PublicSessionPage } from '@/pages/PublicSessionPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { ContactPage } from '@/pages/ContactPage';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { Toaster } from 'sonner';

function AppContent() {
    const { theme } = useTheme();
    return (
        <BrowserRouter>
            <Toaster
                position="bottom-right"
                richColors
                theme={theme as 'light' | 'dark'}
            />
            <Routes>
                <Route element={<RootLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/contact" element={<ContactPage />} />

                    {/* Public share route — no authentication required */}
                    <Route path="/share/:shareToken" element={<PublicSessionPage />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/session/:id" element={<SessionPage />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

export default App;