import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

const SECTIONS = [
    {
        title: 'Information We Collect',
        content: [
            {
                subtitle: 'Account Information',
                text: 'When you register, we collect your name, email address, and a hashed password. If you sign up via Google OAuth, we receive your name, email, and profile picture from Google.',
            },
            {
                subtitle: 'YouTube URLs & Session Data',
                text: 'We store the YouTube URLs you submit, the transcriptions we generate, and all notes, summaries, flashcards, mindmaps, and flowcharts you create. This data is tied to your account and used solely to power your workspace.',
            },
            {
                subtitle: 'Usage Data',
                text: 'We collect standard server logs including IP addresses, browser type, pages visited, and timestamps. This helps us diagnose issues and improve the product.',
            },
        ],
    },
    {
        title: 'How We Use Your Information',
        content: [
            {
                subtitle: 'Service Operation',
                text: 'Your data is used exclusively to provide TubeToMD — transcribing videos, generating AI-powered notes, and syncing your workspace across devices.',
            },
            {
                subtitle: 'AI Processing',
                text: 'Video transcriptions and your prompts are sent to our AI providers (NVIDIA NIM) for processing. We do not use your personal content to train any AI models.',
            },
            {
                subtitle: 'Communications',
                text: 'We may email you about important account changes, security alerts, or product updates. You can opt out of marketing emails at any time.',
            },
        ],
    },
    {
        title: 'Data Sharing',
        content: [
            {
                subtitle: 'We Do Not Sell Your Data',
                text: 'We never sell, rent, or trade your personal information to third parties for their marketing purposes.',
            },
            {
                subtitle: 'Third-Party Services',
                text: 'We use trusted third-party services including MongoDB Atlas (database), NVIDIA NIM (AI processing), and Cloudflare (CDN/security). Each is bound by strict data processing agreements.',
            },
            {
                subtitle: 'Legal Requirements',
                text: 'We may disclose your information if required by law, court order, or to protect the rights and safety of our users.',
            },
        ],
    },
    {
        title: 'Data Retention & Deletion',
        content: [
            {
                subtitle: 'Your Data, Your Control',
                text: 'You can delete individual sessions, notes, or your entire account at any time from the Dashboard. Deletion is permanent and processed within 30 days.',
            },
            {
                subtitle: 'Retention Period',
                text: 'Active account data is retained as long as your account exists. Inactive accounts (no login for 12 months) may be deleted after 30-day notice via email.',
            },
        ],
    },
    {
        title: 'Security',
        content: [
            {
                subtitle: 'How We Protect Your Data',
                text: 'Passwords are hashed with bcrypt. All data in transit uses TLS 1.3 encryption. Database access is restricted by IP allowlist and role-based permissions. We conduct regular security reviews.',
            },
            {
                subtitle: 'Breach Notification',
                text: 'In the unlikely event of a data breach affecting your personal information, we will notify you within 72 hours via email.',
            },
        ],
    },
    {
        title: 'Your Rights',
        content: [
            {
                subtitle: 'Access & Portability',
                text: 'You have the right to request a copy of all personal data we hold about you. Export your notes anytime in Markdown or HTML from within the app.',
            },
            {
                subtitle: 'Correction & Erasure',
                text: 'You can update your account information at any time. To request full erasure of your data, contact us at privacy@tubetomd.com.',
            },
        ],
    },
];

export function PrivacyPage() {
    return (
        <div className="min-h-screen pt-20 pb-16 px-6">
            <div className="max-w-3xl mx-auto">
                {/* Back */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-pink-400 transition-colors mb-8"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>

                {/* Header */}
                <div className="flex items-start gap-4 mb-10">
                    <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex-shrink-0">
                        <Shield className="h-6 w-6 text-pink-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                            Privacy Policy
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>

                {/* Intro */}
                <div className="glass-card rounded-2xl p-6 mb-8 border-l-4 border-pink-500">
                    <p className="text-on-surface-variant leading-relaxed">
                        TubeToMD ("we", "us", "our") is committed to protecting your privacy. This policy explains
                        what data we collect, how we use it, and your rights over it. By using TubeToMD, you agree
                        to this policy.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    {SECTIONS.map((section, i) => (
                        <div key={i} className="glass-card rounded-2xl p-7">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 pb-3 border-b border-slate-200 dark:border-slate-800">
                                {i + 1}. {section.title}
                            </h2>
                            <div className="space-y-5">
                                {section.content.map((item, j) => (
                                    <div key={j}>
                                        <h3 className="font-semibold text-pink-400 text-sm mb-1.5">{item.subtitle}</h3>
                                        <p className="text-on-surface-variant text-sm leading-relaxed">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Contact */}
                <div className="mt-8 glass-card rounded-2xl p-6 text-center">
                    <p className="text-slate-500 text-sm">
                        Questions about this policy?{' '}
                        <Link to="/contact" className="text-pink-400 hover:underline font-medium">
                            Contact us
                        </Link>
                        {' '}or email{' '}
                        <a href="mailto:privacy@tubetomd.com" className="text-pink-400 hover:underline font-medium">
                            privacy@tubetomd.com
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}