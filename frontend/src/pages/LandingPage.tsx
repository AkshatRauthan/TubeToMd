import { Link } from 'react-router-dom';

export function LandingPage() {
    return (
        <div className="overflow-x-hidden pt-12">
            <main>
                {/* Hero Section */}
                <section className="relative px-6 pt-16 pb-24 md:pt-32 md:pb-48 max-w-7xl mx-auto text-center hero-glow">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-high border border-outline-variant/20 mb-8 animate-fade-in">
                        <span className="flex h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                        <span className="text-xs font-bold tracking-widest text-secondary uppercase">Intelligence v1.0 is live</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.1] animate-fade-in-up">
                        Transform Videos into <br />
                        <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Structured Knowledge</span>
                    </h1>
                    <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-12 font-medium leading-relaxed animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        AI-powered notes, mindmaps, and summaries from any YouTube video in seconds. Turn passive watching into active learning.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <Link to="/register" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-br from-primary-container to-primary text-white rounded-3xl font-extrabold text-lg shadow-[0_0_30px_rgba(219,39,119,0.3)] hover:shadow-[0_0_50px_rgba(219,39,119,0.5)] active:scale-95 transition-all duration-300">
                            Start for Free
                        </Link>
                        <Link to="/login" className="w-full sm:w-auto px-10 py-5 glass-card text-on-surface rounded-3xl font-bold text-lg hover:bg-surface-container-high transition-all">
                            View Demo
                        </Link>
                    </div>

                    {/* Mock Dashboard / Abstract Graphic */}
                    <div className="relative max-w-5xl mx-auto group animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/10 to-primary/20 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
                        <div className="relative glass-card rounded-3xl p-4 overflow-hidden border border-white/10 shadow-2xl">
                            <img alt="Knowledge Interface" className="rounded-2xl w-full opacity-90 group-hover:opacity-100 transition-opacity duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXWxva0ijTH7kgczMEqvRQl32n99a_5sjl4QSeu7yyAJFKosJBC-D0pYCwAmNBXm4PNtOjp5BybD1uc_w0Uya55okPxbbEp4j-kPN-Fj02ESpnSoX57di2OWN2yMySaVmP5Q7bz7DNc_EWlBmNVzxJxo5uiVOvAYrcHPR_Fy32eETlNYt0tt9MSRbeMFytNyuDp18-rPhJMO8q5GmXyJuoWd7dkW1RQprdQ7LRW-A5vzpQofPFsPFX8ogCO_aSSnhNdD4JiKm50iHz" />
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="px-6 py-32 bg-surface-container-lowest/50">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                            <div className="max-w-xl">
                                <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">The Ethereal Workspace</h2>
                                <p className="text-on-surface-variant text-lg">Beyond simple transcripts. We restructure information for the way your brain actually works.</p>
                            </div>
                            <div className="hidden md:block">
                                <span className="text-bg font-bold uppercase tracking-widest text-primary">Core Capabilities</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Card 1 */}
                            <div className="glass-card p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">AI Summaries</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">Concise, bullet-point takeaways that capture the essence of any 2-hour video in 2 minutes.</p>
                            </div>

                            {/* Card 2 */}
                            <div className="glass-card p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>hub</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Mindmaps & Diagrams</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">Visualize complex knowledge instantly with auto-generated logical maps and concept flows.</p>
                            </div>

                            {/* Card 3 */}
                            <div className="glass-card p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-on-surface" style={{ fontVariationSettings: "'FILL' 1" }}>subtitles</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Interactive Transcript</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">Clickable timestamps connected directly to your notes. Jump to exact moments instantly.</p>
                            </div>

                            {/* Card 4 */}
                            <div className="glass-card p-8 rounded-3xl transition-all duration-500 hover:-translate-y-2 group hover:shadow-[0_20px_40px_-15px_rgba(219,39,119,0.15)]">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-primary-fixed" style={{ fontVariationSettings: "'FILL' 1" }}>ios_share</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Export Anywhere</h3>
                                <p className="text-on-surface-variant text-sm leading-relaxed mb-4">One-click sync to Notion, Obsidian, and Markdown. Your knowledge lives where you work.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="px-6 py-32 overflow-hidden">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-24">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">Three Steps to Mastery</h2>
                            <p className="text-on-surface-variant max-w-xl mx-auto">From URL to expertise in under 60 seconds.</p>
                        </div>

                        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-8">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-outline-variant/30 to-transparent -z-10"></div>

                            {/* Step 1 */}
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-2xl font-black text-primary mb-8 shadow-xl">1</div>
                                <div className="glass-card p-6 rounded-3xl w-full">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Paste Link</h4>
                                    <div className="bg-surface-container-lowest rounded-xl p-3 flex items-center gap-3 border border-outline-variant/10">
                                        <span className="material-symbols-outlined text-slate-500 text-sm">link</span>
                                        <div className="h-2 w-24 bg-slate-400 dark:bg-slate-700 rounded-full"></div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mt-6">Drop any YouTube URL into the intelligent input field.</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-2xl font-black text-secondary mb-8 shadow-xl">2</div>
                                <div className="glass-card p-6 rounded-3xl w-full">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">AI Processes</h4>
                                    <div className="flex justify-center py-2">
                                        <div className="relative w-10 h-10">
                                            <div className="absolute inset-0 border-4 border-secondary/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-t-secondary rounded-full animate-spin"></div>
                                        </div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mt-6">Our neural engine analyzes audio, video, and sentiment.</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-2xl font-black text-on-surface mb-8 shadow-xl">3</div>
                                <div className="glass-card p-6 rounded-3xl w-full">
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Get Notes</h4>
                                    <div className="space-y-2 text-left px-2">
                                        <div className="h-1.5 w-full bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                                        <div className="h-1.5 w-4/5 bg-slate-400 dark:bg-slate-600 rounded-full"></div>
                                        <div className="h-1.5 w-3/4 bg-primary/40 rounded-full"></div>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mt-6">Receive structured Markdown or a visual mindmap.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="px-6 py-24">
                    <div className="max-w-5xl mx-auto glass-card rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-secondary/10 rounded-full blur-[100px]"></div>

                        <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-8 leading-tight">Ready to stop watching and <br />start knowing?</h2>
                        <p className="text-on-surface-variant text-lg mb-12 max-w-xl mx-auto">Join 10,000+ students, researchers, and creators using TubeToMD to master content faster.</p>

                        <Link to="/register" className="inline-block px-12 py-5 bg-gradient-to-br from-primary-container to-primary text-white rounded-3xl font-extrabold text-xl shadow-[0_0_30px_rgba(219,39,119,0.3)] hover:scale-105 transition-all duration-300">
                            Get Started Free
                        </Link>
                        <p className="mt-8 text-slate-500 text-sm">No credit card required. Free tier forever.</p>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900 w-full pt-20 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-center px-8 max-w-7xl mx-auto gap-10">
                    <div className="flex flex-col items-center md:items-start">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>movie_edit</span>
                            <span className="text-lg font-bold text-slate-200">TubeToMD</span>
                        </div>
                        <p className="text-sm text-slate-500 font-['Inter']">© {(new Date()).getFullYear()} TubeToMD. The Intelligent Lume.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-8">
                        <Link to="#" className="text-slate-500 hover:text-teal-400 transition-colors text-sm">Privacy Policy</Link>
                        <Link to="#" className="text-slate-500 hover:text-teal-400 transition-colors text-sm">Terms of Service</Link>
                        <Link to="#" className="text-slate-500 hover:text-teal-400 transition-colors text-sm">Contact Us</Link>
                    </div>
                    <div className="flex gap-6">
                        <a href="https://github.com/AkshatRauthan/TubeToMD" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-pink-400 transition-opacity duration-200">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
