import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Send, Sparkles, CheckCircle2, MessageSquare, ThumbsUp } from 'lucide-react';

interface RateUsModalProps {
    open: boolean;
    onClose: () => void;
}

const ASPECTS = [
    { key: 'transcription', label: 'Transcription Quality' },
    { key: 'notes',         label: 'AI Note Generation' },
    { key: 'chat',          label: 'Chat Assistant' },
    { key: 'ui',            label: 'UI & Experience' },
];

const QUICK_TAGS = [
    '⚡ Super Fast', '🎯 Accurate', '✨ Easy to Use',
    '📝 Great Notes', '🤖 Helpful AI', '🌐 Best Tool',
    '🔍 Detailed', '💡 Very Creative',
];

function StarRow({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) {
    const [hovered, setHovered] = useState(0);
    const dim = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    className="transition-transform hover:scale-125 active:scale-95"
                    type="button"
                >
                    <Star
                        className={`${dim} transition-colors ${
                            n <= (hovered || value)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-600 dark:text-slate-700'
                        }`}
                    />
                </button>
            ))}
        </div>
    );
}

function starLabel(v: number) {
    return ['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'][v] ?? '';
}

export function RateUsModal({ open, onClose }: RateUsModalProps) {
    const [overall, setOverall] = useState(0);
    const [aspects, setAspects] = useState<Record<string, number>>({});
    const [tags, setTags] = useState<Set<string>>(new Set());
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'rate' | 'feedback'>('rate');

    // Reset when reopened
    useEffect(() => {
        if (open) {
            setOverall(0); setAspects({}); setTags(new Set());
            setFeedback(''); setSubmitted(false); setStep('rate');
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const toggleTag = (t: string) =>
        setTags(prev => { const next = new Set(prev); next.has(t) ? next.delete(t) : next.add(t); return next; });

    const handleSubmit = async () => {
        if (overall === 0) return;
        setSubmitting(true);
        // Simulate API call
        await new Promise(r => setTimeout(r, 1200));
        setSubmitting(false);
        setSubmitted(true);
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="pointer-events-auto w-full max-w-lg bg-white dark:bg-[#0f1629] border border-slate-200 dark:border-slate-800/60 rounded-2xl shadow-[0_0_60px_-10px_rgba(219,39,119,0.25)] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* ── Submitted state ─────────────────────────── */}
                            <AnimatePresence mode="wait">
                                {submitted ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center gap-4 px-8 py-14 text-center"
                                    >
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                                        >
                                            <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                                        </motion.div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Thank you! 🎉</h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
                                            Your feedback means a lot to us. We'll use it to keep making TubeToMD better for you.
                                        </p>
                                        <button
                                            onClick={onClose}
                                            className="mt-2 px-8 py-2.5 rounded-xl bg-gradient-to-br from-pink-600 to-rose-500 text-white text-sm font-bold shadow-lg hover:shadow-pink-500/30 hover:-translate-y-0.5 transition-all"
                                        >
                                            Close
                                        </button>
                                    </motion.div>

                                ) : (
                                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        {/* Header */}
                                        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/60">
                                            <div className="flex items-center gap-2">
                                                <Sparkles className="h-5 w-5 text-pink-500" />
                                                <span className="font-black text-slate-900 dark:text-white text-lg">Rate TubeToMD</span>
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>

                                            {/* Step pills */}
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex gap-1.5">
                                                {(['rate', 'feedback'] as const).map(s => (
                                                    <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-6 bg-pink-500' : 'w-2 bg-slate-300 dark:bg-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="px-6 py-6 space-y-6">
                                            <AnimatePresence mode="wait">

                                            {/* ── Step 1: Rate ──────────────────────────── */}
                                            {step === 'rate' && (
                                                <motion.div
                                                    key="step-rate"
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    className="space-y-6"
                                                >
                                                    {/* Overall */}
                                                    <div className="flex flex-col items-center gap-3 py-2">
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">Overall experience</p>
                                                        <StarRow value={overall} onChange={setOverall} />
                                                        <AnimatePresence>
                                                            {overall > 0 && (
                                                                <motion.span
                                                                    key={overall}
                                                                    initial={{ opacity: 0, y: -4 }}
                                                                    animate={{ opacity: 1, y: 0 }}
                                                                    exit={{ opacity: 0 }}
                                                                    className="text-sm font-bold text-amber-400"
                                                                >
                                                                    {starLabel(overall)}
                                                                </motion.span>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>

                                                    {/* Aspect ratings */}
                                                    <div className="space-y-2.5">
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">Rate specific features</p>
                                                        {ASPECTS.map(a => (
                                                            <div key={a.key} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                                                <span className="text-sm text-slate-700 dark:text-slate-300">{a.label}</span>
                                                                <StarRow
                                                                    value={aspects[a.key] ?? 0}
                                                                    onChange={v => setAspects(prev => ({ ...prev, [a.key]: v }))}
                                                                    size="sm"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Quick tags */}
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">What did you love?</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {QUICK_TAGS.map(t => (
                                                                <button
                                                                    key={t}
                                                                    type="button"
                                                                    onClick={() => toggleTag(t)}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                                                                        tags.has(t)
                                                                            ? 'bg-pink-500/15 border-pink-500/40 text-pink-400'
                                                                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-pink-500/30 hover:text-pink-400'
                                                                    }`}
                                                                >
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => setStep('feedback')}
                                                        disabled={overall === 0}
                                                        className="w-full py-3 rounded-xl bg-gradient-to-br from-pink-600 to-rose-500 text-white font-bold shadow-lg hover:shadow-pink-500/30 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                                    >
                                                        Next — Add a comment
                                                    </button>
                                                </motion.div>
                                            )}

                                            {/* ── Step 2: Feedback ──────────────────────── */}
                                            {step === 'feedback' && (
                                                <motion.div
                                                    key="step-feedback"
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="space-y-5"
                                                >
                                                    {/* Overall recap */}
                                                    <div className="flex items-center gap-3 py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                        <div className="flex gap-0.5">
                                                            {[1,2,3,4,5].map(n => (
                                                                <Star key={n} className={`h-4 w-4 ${n <= overall ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                                                            ))}
                                                        </div>
                                                        <span className="text-sm font-semibold text-amber-400">{starLabel(overall)}</span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                            <MessageSquare className="h-3.5 w-3.5" />
                                                            Tell us more (optional)
                                                        </label>
                                                        <textarea
                                                            value={feedback}
                                                            onChange={e => setFeedback(e.target.value)}
                                                            placeholder="What did you like? What can we improve? Any feature requests..."
                                                            rows={5}
                                                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none transition"
                                                        />
                                                        <p className="text-[11px] text-slate-400 text-right">{feedback.length}/500</p>
                                                    </div>

                                                    {tags.size > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {Array.from(tags).map(t => (
                                                                <span key={t} className="px-2.5 py-1 rounded-full text-xs bg-pink-500/10 text-pink-400 border border-pink-500/20">
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div className="flex gap-3 pt-1">
                                                        <button
                                                            onClick={() => setStep('rate')}
                                                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                                        >
                                                            Back
                                                        </button>
                                                        <button
                                                            onClick={handleSubmit}
                                                            disabled={submitting}
                                                            className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-pink-600 to-rose-500 text-white text-sm font-bold shadow-lg hover:shadow-pink-500/30 hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-60"
                                                        >
                                                            {submitting ? (
                                                                <>
                                                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                    Submitting...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="h-4 w-4" />
                                                                    Submit Review
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Footer */}
                                        <div className="px-6 pb-4 pt-0">
                                            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600">
                                                <ThumbsUp className="h-3 w-3" />
                                                Your feedback is anonymous and helps us improve
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}