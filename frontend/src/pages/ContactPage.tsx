import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Github, Send, Check, Loader2 } from 'lucide-react';

type Category = 'bug' | 'feature' | 'account' | 'billing' | 'other';

const CATEGORIES: { value: Category; label: string }[] = [
    { value: 'bug',     label: '🐛 Bug Report' },
    { value: 'feature', label: '💡 Feature Request' },
    { value: 'account', label: '🔐 Account Help' },
    { value: 'billing', label: '💳 Billing' },
    { value: 'other',   label: '💬 Other' },
];

export function ContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState<Category>('other');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !email.trim() || !message.trim()) {
            setError('Please fill in all fields.');
            return;
        }
        setError('');
        setSending(true);

        // Simulate sending — replace with your actual API call
        await new Promise(resolve => setTimeout(resolve, 1400));

        setSending(false);
        setSent(true);
    };

    return (
        <div className="min-h-screen pt-20 pb-16 px-6">
            <div className="max-w-5xl mx-auto">
                {/* Back */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-pink-400 transition-colors mb-8"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                        Get in Touch
                    </h1>
                    <p className="text-on-surface-variant text-lg">
                        We usually respond within 24 hours.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Contact info sidebar */}
                    <div className="flex flex-col gap-4">
                        <a
                            href="mailto:support@tubetomd.com"
                            className="glass-card rounded-2xl p-5 flex items-start gap-4 hover:border-pink-500/30 transition-all group"
                        >
                            <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 flex-shrink-0 group-hover:bg-pink-500/20 transition">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">Email Support</p>
                                <p className="text-xs text-slate-500">support@tubetomd.com</p>
                                <p className="text-xs text-slate-600 mt-1">Response within 24 hours</p>
                            </div>
                        </a>

                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noreferrer"
                            className="glass-card rounded-2xl p-5 flex items-start gap-4 hover:border-pink-500/30 transition-all group"
                        >
                            <div className="p-2.5 rounded-xl bg-slate-500/10 text-slate-400 flex-shrink-0 group-hover:bg-slate-500/20 transition">
                                <Github className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">GitHub Issues</p>
                                <p className="text-xs text-slate-500">github.com/TubeToMD</p>
                                <p className="text-xs text-slate-600 mt-1">Best for bug reports</p>
                            </div>
                        </a>

                        <div className="glass-card rounded-2xl p-5 flex items-start gap-4">
                            <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary flex-shrink-0">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-slate-900 dark:text-white mb-0.5">Response Times</p>
                                <div className="mt-2 space-y-1.5 text-xs text-slate-500">
                                    <div className="flex justify-between">
                                        <span>Bug reports</span>
                                        <span className="text-pink-400 font-medium">4–8 hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Feature requests</span>
                                        <span className="text-pink-400 font-medium">24–48 hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Account issues</span>
                                        <span className="text-pink-400 font-medium">12 hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>General</span>
                                        <span className="text-pink-400 font-medium">24 hrs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="lg:col-span-2">
                        {sent ? (
                            <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                                    <Check className="h-8 w-8 text-emerald-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Message Sent!</h2>
                                <p className="text-on-surface-variant max-w-sm">
                                    Thanks for reaching out, <strong className="text-white">{name}</strong>. We'll get back to you at{' '}
                                    <span className="text-pink-400">{email}</span> within 24 hours.
                                </p>
                                <button
                                    onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); setCategory('other'); }}
                                    className="mt-8 text-sm text-slate-500 hover:text-pink-400 transition-colors"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-7 space-y-5">
                                {/* Name + Email row */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Your Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Jane Doe"
                                            className="w-full bg-surface-container-highest/50 border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full bg-surface-container-highest/50 border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition"
                                        />
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Category
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {CATEGORIES.map(cat => (
                                            <button
                                                key={cat.value}
                                                type="button"
                                                onClick={() => setCategory(cat.value)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                                    category === cat.value
                                                        ? 'bg-pink-500/15 border-pink-500/40 text-pink-300'
                                                        : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                                }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Message
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        rows={6}
                                        placeholder="Describe your issue or feedback in detail..."
                                        className="w-full bg-surface-container-highest/50 border border-outline-variant/20 rounded-xl px-4 py-3 text-sm text-on-surface placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none transition"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-xs">{error}</p>
                                )}

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-br from-primary-container to-primary text-white font-bold text-sm shadow-[0_0_20px_rgba(219,39,119,0.3)] hover:shadow-[0_0_30px_rgba(219,39,119,0.5)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {sending ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                                    ) : (
                                        <><Send className="h-4 w-4" /> Send Message</>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}