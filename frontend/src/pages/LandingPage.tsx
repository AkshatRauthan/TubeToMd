import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Brain, MessageSquare, FileDown, Sparkles, Zap, ChevronDown, Check, Github } from 'lucide-react';
import { motion } from 'framer-motion';
import logoImg from '@/assets/TubeToMD.png';

const features = [
    {
        icon: Youtube,
        title: 'YouTube & Video Upload',
        description: 'Paste a YouTube URL or upload any video file. Audio is extracted in-browser — nothing stored on the server.',
    },
    {
        icon: Brain,
        title: 'AI-Powered Notes',
        description: 'Generate summaries, detailed notes, mind maps, flowcharts, and flashcards powered by Gemini AI.',
    },
    {
        icon: MessageSquare,
        title: 'Interactive Q&A',
        description: 'Ask questions about the video and get precise AI answers with clickable timestamp citations.',
    },
    {
        icon: FileDown,
        title: 'Multi-Format Export',
        description: 'Export your notes as Markdown, PDF, DOCX, or HTML. Mermaid diagrams render beautifully.',
    },
];

const faqs = [
    {
        q: 'How does TubeToMD work?',
        a: 'Simply paste a YouTube URL or upload a video file. Our system transcribes the audio using OpenAI Whisper, then uses Gemini AI to generate structured notes, summaries, mind maps, and more.',
    },
    {
        q: 'Is my video data stored on your servers?',
        a: 'No. For uploaded videos, audio extraction happens entirely in your browser using FFmpeg.wasm. Only the audio chunks are sent for transcription — the original video file never leaves your device.',
    },
    {
        q: 'What note types can I generate?',
        a: 'You can generate summaries, detailed notes, mind maps (Mermaid), flowcharts, flashcards, resource lists, and more. Each type can be personalized with different writing personas.',
    },
    {
        q: 'Can I ask questions about the video?',
        a: 'Yes! The AI chat uses a RAG (Retrieval Augmented Generation) pipeline to search through the transcript and provide precise answers with clickable timestamp references.',
    },
    {
        q: 'What formats can I export notes in?',
        a: 'Currently Markdown (.md) and HTML are fully supported. PDF and DOCX export are coming soon.',
    },
];

const stats = [
    { value: '10+', label: 'Note Types' },
    { value: 'Any', label: 'Video Format' },
    { value: 'RAG', label: 'AI Search' },
    { value: 'Free', label: 'To Start' },
];

function FAQItem({ q, a }: { q: string; a: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="border-b border-[hsl(var(--border))]">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between py-5 text-left text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
            >
                <span className="text-base font-medium pr-4">{q}</span>
                <ChevronDown className={`h-5 w-5 flex-shrink-0 text-[hsl(var(--muted-foreground))] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            <motion.div
                initial={false}
                animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
            >
                <p className="pb-5 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{a}</p>
            </motion.div>
        </div>
    );
}

export function LandingPage() {
    return (
        <div className="overflow-hidden">
            {/* ── Hero ──────────────────────────────────────────── */}
            <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32">
                <div className="text-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-1.5 text-sm text-[hsl(var(--muted-foreground))] mb-8"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />
                        Powered by Gemini AI & Whisper
                    </motion.div>

                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="flex justify-center mb-6"
                    >
                        <img src={logoImg} alt="TubeToMD" className="h-16 w-auto" />
                    </motion.div>

                    {/* Heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
                    >
                        Turn Videos into{' '}
                        <span className="text-gradient">Knowledge</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-6 text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto leading-relaxed"
                    >
                        TubeToMD transcribes any YouTube video or uploaded file, then uses AI
                        to generate summaries, mind maps, flashcards, and lets you ask
                        questions — all with <span className="text-[hsl(var(--accent))] font-medium">clickable timestamps</span>.
                    </motion.p>

                    {/* CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            to="/register"
                            className="btn-primary rounded-xl px-8 py-3.5 text-sm font-semibold shadow-lg flex items-center gap-2"
                        >
                            <Zap className="h-4 w-4" />
                            Get Started — It's Free
                        </Link>
                        <Link
                            to="/login"
                            className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-8 py-3.5 text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-2 hover:border-[hsl(var(--primary))]/30 transition-all duration-200"
                        >
                            Sign In
                        </Link>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-lg sm:max-w-2xl mx-auto"
                    >
                        {stats.map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-2xl font-bold text-gradient">{stat.value}</div>
                                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── Features ─────────────────────────────────────── */}
            <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        Everything you need to <span className="text-gradient">learn faster</span>
                    </h2>
                    <p className="mt-4 text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
                        From transcription to AI-powered analysis, TubeToMD handles the heavy lifting.
                    </p>
                </motion.div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
                    {features.map((f) => (
                        <motion.div
                            key={f.title}
                            whileHover={{ y: -4 }}
                            className="card p-6 card-hover cursor-default"
                        >
                            <div className="inline-flex rounded-xl p-2.5 bg-[hsl(var(--secondary))] mb-4">
                                <f.icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                            </div>
                            <h3 className="text-lg font-semibold">{f.title}</h3>
                            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                                {f.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ─────────────────────────────────── */}
            <section className="mx-auto max-w-5xl px-6 pb-24 sm:pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        Three steps to <span className="text-gradient">knowledge</span>
                    </h2>
                </motion.div>

                <div className="grid gap-8 md:grid-cols-3 stagger-children">
                    {[
                        { step: '01', title: 'Paste or Upload', desc: 'Drop a YouTube URL or upload a video. Audio extraction happens right in your browser.' },
                        { step: '02', title: 'AI Processes', desc: 'Whisper transcribes the audio. Gemini generates notes, summaries, mind maps, and more.' },
                        { step: '03', title: 'Learn & Export', desc: 'Browse notes with synced timestamps, ask follow-up questions, and export in any format.' },
                    ].map((item) => (
                        <div key={item.step} className="card p-6 text-center card-hover">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white font-bold text-lg mb-4">
                                {item.step}
                            </div>
                            <h3 className="text-lg font-semibold">{item.title}</h3>
                            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Why TubeToMD ─────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-6 pb-24 sm:pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="card p-8 sm:p-12"
                >
                    <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
                        Why choose <span className="text-gradient">TubeToMD</span>?
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {[
                            'Browser-side audio extraction — privacy first',
                            'AI-powered with Google Gemini 2.0 Flash',
                            'RAG-based chat with timestamp citations',
                            'Mermaid mind maps & flowcharts',
                            'Multi-format export (MD, HTML, PDF)',
                            'Open source & self-hostable',
                        ].map((item) => (
                            <div key={item} className="flex items-start gap-3">
                                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[hsl(var(--accent))]/15 mt-0.5">
                                    <Check className="h-3 w-3 text-[hsl(var(--accent))]" />
                                </div>
                                <span className="text-sm text-[hsl(var(--muted-foreground))]">{item}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ── FAQ ──────────────────────────────────────────── */}
            <section className="mx-auto max-w-3xl px-6 pb-24 sm:pb-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="text-3xl font-bold text-center mb-10">
                        Frequently Asked Questions
                    </h2>
                    <div className="divide-y-0">
                        {faqs.map((faq) => (
                            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* ── Bottom CTA ───────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-6 pb-24 sm:pb-32">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="card p-10 sm:p-16 text-center"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold">
                        Ready to transform how you learn?
                    </h2>
                    <p className="mt-4 text-[hsl(var(--muted-foreground))] max-w-lg mx-auto">
                        Join learners using TubeToMD to turn video content into actionable knowledge.
                    </p>
                    <Link
                        to="/register"
                        className="btn-primary inline-flex items-center gap-2 mt-8 rounded-xl px-8 py-3.5 text-sm font-bold shadow-xl"
                    >
                        <Zap className="h-4 w-4" />
                        Start for Free
                    </Link>
                </motion.div>
            </section>

            {/* ── Footer ───────────────────────────────────────── */}
            <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="mx-auto max-w-6xl px-6 py-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-3">
                                <img src={logoImg} alt="TubeToMD" className="h-7 w-auto" />
                                <span className="font-bold text-gradient">TubeToMD</span>
                            </div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                                Turn any video into structured, AI-powered study notes.
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Product</h4>
                            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                                <li><Link to="/register" className="hover:text-[hsl(var(--foreground))] transition">Get Started</Link></li>
                                <li><Link to="/login" className="hover:text-[hsl(var(--foreground))] transition">Sign In</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Resources</h4>
                            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                                <li><a href="#" className="hover:text-[hsl(var(--foreground))] transition">Documentation</a></li>
                                <li><a href="#" className="hover:text-[hsl(var(--foreground))] transition">API Reference</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Legal</h4>
                            <ul className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
                                <li><a href="#" className="hover:text-[hsl(var(--foreground))] transition">Privacy Policy</a></li>
                                <li><a href="#" className="hover:text-[hsl(var(--foreground))] transition">Terms of Service</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-10 pt-6 border-t border-[hsl(var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                            &copy; {new Date().getFullYear()} TubeToMD. All rights reserved.
                        </p>
                        <a href="https://github.com" target="_blank" rel="noopener" className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition">
                            <Github className="h-5 w-5" />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
