import { Link } from 'react-router-dom';

export function LandingPage() {
    return (
        <div className="overflow-x-hidden pt-12">
            <main>
                {/* ── Hero ─────────────────────────────────────────── */}
                <section className="relative px-6 pt-14 pb-14 md:pt-24 md:pb-20 max-w-7xl mx-auto text-center hero-glow">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/20 mb-6 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                        <span className="text-xs font-bold tracking-widest text-secondary uppercase">Intelligence v1.0 is live</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1] animate-fade-in-up">
                        Transform Videos into <br />
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Structured Knowledge</span>
                    </h1>
                    <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        AI-powered notes, mindmaps, and summaries from any YouTube video in seconds. Turn passive watching into active learning.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-br from-primary-container to-primary text-white rounded-3xl font-extrabold text-lg shadow-[0_0_30px_rgba(219,39,119,0.3)] hover:shadow-[0_0_50px_rgba(219,39,119,0.5)] active:scale-95 transition-all duration-300">
                            Start for Free
                        </Link>
                        <Link to="/login" className="w-full sm:w-auto px-10 py-5 glass-card text-on-surface rounded-3xl font-bold text-lg hover:bg-surface-container-high transition-all">
                            View Demo
                        </Link>
                    </div>
                </section>

                {/* ── How It Works ─────────────────────────────────── */}
                <section className="px-6 py-16 overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-14">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">Three Steps to Mastery</h2>
                            <p className="text-on-surface-variant max-w-xl mx-auto">From URL to expertise in under 60 seconds.</p>
                        </div>

                        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
                            <div className="hidden md:block absolute top-[3.5rem] left-0 w-full h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent -z-10"></div>

                            {/* Step 1 */}
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-2xl font-black text-primary mb-6 shadow-xl">1</div>
                                <div className="glass-card p-6 rounded-3xl w-full">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Paste Link</h4>
                                    <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 border border-outline-variant/10">
                                        <span className="material-symbols-outlined text-slate-500 text-sm">link</span>
                                        <div className="h-2 w-24 bg-slate-400 dark:bg-slate-700 rounded-full"></div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mt-5">Drop any YouTube URL into the input field and click "Process". And let the magic unleash.</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-2xl font-black text-secondary mb-6 shadow-xl">2</div>
                                <div className="glass-card p-6 rounded-3xl w-full">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">AI Processes</h4>
                                    <div className="flex justify-center py-2">
                                        <div className="relative w-10 h-10">
                                            <div className="absolute inset-0 border-4 border-secondary/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-t-secondary rounded-full animate-spin"></div>
                                        </div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mt-5">Our neural engine transcribes, analyses, and structures the video.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-14 h-14 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-2xl font-black text-on-surface mb-6 shadow-xl">3</div>
                                <div className="glass-card p-6 rounded-3xl w-full">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Get Notes</h4>
                                    <div className="space-y-2 text-left px-2">
                                        <div className="h-1.5 w-full bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                                        <div className="h-1.5 w-full bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                                        <div className="h-1.5 w-4/5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                                        <div className="h-1.5 w-4/5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                                        <div className="h-1.5 w-2/4 bg-primary/40 rounded-full"></div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mt-5">Receive summaries, flashcards, mindmaps, and more — all in one place.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── What You Get (was "Ethereal Workspace") ──────── */}
                <section className="px-6 py-16 bg-surface-container-lowest/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                            <div className="max-w-xl">
                                <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                                    Six Tools. One Video. Zero Effort.
                                </h2>
                                <p className="text-on-surface-variant text-lg">
                                    Paste a YouTube link and TubeToMD generates everything you need to truly understand it — in seconds.
                                </p>
                            </div>
                            <div className="hidden md:block flex-shrink-0">
                                <span className="text-sm font-bold uppercase tracking-widest text-primary">Core Capabilities</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Summaries */}
                            <div className="glass-card p-7 rounded-3xl transition-all duration-500 hover:-translate-y-1 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-11 h-11 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">AI Summaries</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">Bullet-point takeaways that capture the essence of any 2-hour video in under 2 minutes.</p>
                            </div>

                            {/* Mindmaps */}
                            <div className="glass-card p-7 rounded-3xl transition-all duration-500 hover:-translate-y-1 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-11 h-11 rounded-2xl bg-secondary/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Mindmaps & Flowcharts</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">Auto-generated visual diagrams that map every concept and how they connect.</p>
                            </div>

                            {/* Flashcards */}
                            <div className="glass-card p-7 rounded-3xl transition-all duration-500 hover:-translate-y-1 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Flash Cards</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">Study-mode flashcards generated directly from the video — ready to drill anywhere.</p>
                            </div>

                            {/* Interactive Transcript */}
                            <div className="glass-card p-7 rounded-3xl transition-all duration-500 hover:-translate-y-1 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-11 h-11 rounded-2xl bg-surface-container-highest flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>subtitles</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Interactive Transcript</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">Click any line to jump to that exact moment. Searchable, synced to the video in real time.</p>
                            </div>

                            {/* Detailed Notes */}
                            <div className="glass-card p-7 rounded-3xl transition-all duration-500 hover:-translate-y-1 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-11 h-11 rounded-2xl bg-secondary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Detailed Notes</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">Chapter-by-chapter notes with full context — like having a study buddy who watched for you.</p>
                            </div>

                            {/* Export */}
                            <div className="glass-card p-7 rounded-3xl transition-all duration-500 hover:-translate-y-1 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>ios_share</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Export Anywhere</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed">One-click export to Markdown, HTML, or PDF. Your notes live where you already work.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── CTA ──────────────────────────────────────────── */}
                <section className="px-6 py-14">
                    <div className="max-w-5xl mx-auto glass-card rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]"></div>

                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                            Ready to stop watching<br />and start knowing?
                        </h2>
                        <p className="text-on-surface-variant text-lg mb-10 max-w-xl mx-auto">
                            Join 10,000+ students, researchers, and creators using TubeToMD to master content faster.
                        </p>

                        <Link to="/register" className="inline-block px-12 py-5 bg-gradient-to-br from-primary-container to-primary text-white rounded-3xl font-extrabold text-xl shadow-[0_0_30px_rgba(219,39,119,0.3)] hover:scale-105 transition-all duration-300">
                            Get Started Free
                        </Link>
                        <p className="mt-6 text-slate-500 text-sm">No credit card required. Free tier forever.</p>
                    </div>
                </section>
            </main>

            {/* ── Footer ───────────────────────────────────────────── */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 w-full pt-12 pb-8">
                <div className="max-w-7xl mx-auto px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-8">

                        {/* Brand */}
                        <div className="flex flex-col items-center md:items-start gap-2">
                            <div className="flex items-center gap-2">
                                <img src="/TubeToMD.png" alt="TubeToMD" className="h-6 w-6" onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }} />
                                <span className="text-base font-bold text-slate-200">TubeToMD</span>
                            </div>
                            <p className="text-xs text-slate-500">© {new Date().getFullYear()} TubeToMD. All rights reserved.</p>
                        </div>

                        {/* Links */}
                        <nav className="flex flex-wrap justify-center gap-6">
                            <Link to="/contact" className="text-slate-500 hover:text-pink-400 transition-colors text-sm">
                                Contact Us
                            </Link>
                            <Link to="/privacy" className="text-slate-500 hover:text-pink-400 transition-colors text-sm">
                                Privacy Policy
                            </Link>
                            <Link to="/terms" className="text-slate-500 hover:text-pink-400 transition-colors text-sm">
                                Terms of Service
                            </Link>
                        </nav>

                        {/* GitHub */}
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-pink-400 transition-colors duration-200"
                            title="GitHub"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                            </svg>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}