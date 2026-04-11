import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import {
    Loader2, FileText, Brain, GitBranch, CreditCard, BookOpen,
    GraduationCap, Clock, Search, X, ChevronDown, Copy, Check,
    Youtube, Video, AlertCircle, ExternalLink, Play, Sparkles,
    ChevronUp,
} from 'lucide-react';
import type { Note } from '@/types';
import { FlashcardStudyMode } from '@/components/FlashcardStudyMode';

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#db2777',
        primaryTextColor: '#f5f5f5',
        primaryBorderColor: '#db2777',
        lineColor: '#10b981',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
    },
});

// ─── Types ──────────────────────────────────────────────────────────────────

interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

interface PublicSession {
    _id: string;
    title: string;
    videoType: 'youtube' | 'uploaded';
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    transcription: TranscriptSegment[];
    status: string;
    metadata?: { language?: string; channel?: string };
    isPublic: boolean;
    shareToken: string;
    createdAt: string;
}

interface PublicData {
    session: PublicSession;
    notes: Note[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:v=|\/)([A-Za-z0-9_-]{11})(?:\?|&|$|\/)/,
        /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
        /(?:embed\/)([A-Za-z0-9_-]{11})/,
        /(?:shorts\/)([A-Za-z0-9_-]{11})/,
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function formatDuration(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec}s`;
}

const NOTE_ICON: Record<string, React.ElementType> = {
    summary: FileText,
    mindmap: Brain,
    flowchart: GitBranch,
    flashcards: CreditCard,
    detailed_notes: BookOpen,
    resources: GraduationCap,
    diagram: GitBranch,
    custom: FileText,
};

function renderHighlightedText(text: string, query: string) {
    if (!query.trim()) return <>{text}</>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} style={{ background: 'rgba(251,191,36,0.3)', color: '#fde68a', borderRadius: '2px', padding: '0 2px' }}>
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
}

// ─── MermaidRenderer ──────────────────────────────────────────────────────────

function MermaidRenderer({ code }: { code: string }) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!ref.current || !code) return;
        const id = `mermaid-pub-${Math.random().toString(36).slice(2)}`;
        mermaid.render(id, code).then(({ svg }) => {
            if (ref.current) ref.current.innerHTML = svg;
        }).catch(() => {
            if (ref.current) ref.current.innerHTML = `<pre>${code}</pre>`;
        });
    }, [code]);
    return <div ref={ref} className="overflow-x-auto" />;
}

// ─── NoteCard ─────────────────────────────────────────────────────────────────

function NoteCard({ note, onStudy }: { note: Note; onStudy: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const Icon = NOTE_ICON[note.type] ?? FileText;

    const copy = () => {
        navigator.clipboard.writeText(note.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div layout className="bg-[#1a1f2f]/60 backdrop-blur-md border border-pink-900/20 rounded-xl overflow-hidden">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/4 transition-colors"
            >
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-pink-500/15 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-pink-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{note.title}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                        {note.type.replace('_', ' ')}
                        {note.persona && note.persona !== 'detailed' && ` · ${note.persona}`}
                        {note.isEdited && ' · edited'}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {note.type === 'flashcards' && (
                        <button
                            onClick={e => { e.stopPropagation(); onStudy(); }}
                            className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-[10px] font-bold hover:bg-pink-500/30 transition"
                        >
                            Study
                        </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); copy(); }} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition">
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden border-t border-pink-900/20"
                    >
                        <div className="p-5 prose prose-invert prose-sm max-w-none prose-headings:text-pink-300 prose-a:text-pink-400 prose-code:bg-slate-800 prose-code:text-emerald-300 prose-pre:bg-slate-900">
                            {note.mermaidCode
                                ? <MermaidRenderer code={note.mermaidCode} />
                                : <ReactMarkdown>{note.content}</ReactMarkdown>
                            }
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PublicSessionPage() {
    const { shareToken } = useParams<{ shareToken: string }>();
    const [data, setData] = useState<PublicData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Transcript
    const [searchQuery, setSearchQuery] = useState('');
    const [matchIndex, setMatchIndex] = useState(0);
    const transcriptRef = useRef<HTMLDivElement>(null);

    // Tabs
    const [activeTab, setActiveTab] = useState<'transcript' | 'notes'>('transcript');

    // Flashcard
    const [studyNote, setStudyNote] = useState<Note | null>(null);

    // YouTube IFrame
    const playerRef = useRef<any>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Fetch ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!shareToken) return;
        fetch(`/api/v1/sessions/public/${shareToken}`)
            .then(r => r.json())
            .then(json => {
                if (json.success) setData(json.data);
                else setError(json.message ?? 'Session not found');
            })
            .catch(() => setError('Failed to load session.'))
            .finally(() => setLoading(false));
    }, [shareToken]);

    // ── YouTube Player ────────────────────────────────────────────────────────

    const youtubeId = useMemo(() => {
        if (!data?.session.videoUrl || data.session.videoType !== 'youtube') return null;
        return extractYouTubeId(data.session.videoUrl);
    }, [data]);

    useEffect(() => {
        if (!youtubeId) return;
        const init = () => {
            if (playerRef.current) return;
            playerRef.current = new (window as any).YT.Player('yt-player-public', {
                videoId: youtubeId,
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onReady: () => {
                        timerRef.current = setInterval(() => {
                            const t = playerRef.current?.getCurrentTime?.();
                            if (typeof t === 'number') setCurrentTime(t);
                        }, 800);
                    },
                },
            });
        };
        if ((window as any).YT?.Player) {
            init();
        } else {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
            (window as any).onYouTubeIframeAPIReady = init;
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [youtubeId]);

    const seekTo = (time: number) => {
        playerRef.current?.seekTo?.(time, true);
        playerRef.current?.playVideo?.();
    };

    // ── Transcript filtering ──────────────────────────────────────────────────

    const segments = data?.session.transcription ?? [];

    const filteredSegments = useMemo(() => {
        if (!searchQuery.trim()) return segments;
        const q = searchQuery.toLowerCase();
        return segments.filter(s => s.text.toLowerCase().includes(q));
    }, [segments, searchQuery]);

    useEffect(() => { setMatchIndex(0); }, [searchQuery]);

    useEffect(() => {
        if (!searchQuery.trim() || !transcriptRef.current) return;
        const el = transcriptRef.current.querySelector(`[data-seg="${matchIndex}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [matchIndex, searchQuery]);

    const isActive = (seg: TranscriptSegment) =>
        currentTime >= seg.start && currentTime < seg.start + seg.duration;

    // ── Loading / Error ───────────────────────────────────────────────────────

    if (loading) return (
        <div className="min-h-screen bg-[#0b0f1e] flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-pink-500" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-[#0b0f1e] flex items-center justify-center px-4">
            <div className="max-w-md text-center">
                <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3">Session Not Found</h1>
                <p className="text-slate-400 text-sm mb-8">{error ?? 'This link may have expired or been revoked.'}</p>
                <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-semibold text-sm transition">
                    <Sparkles className="h-4 w-4" /> Try TubeToMD Free
                </Link>
            </div>
        </div>
    );

    const { session, notes } = data;

    return (
        <div className="min-h-screen bg-[#0b0f1e] text-white">
            {studyNote && <FlashcardStudyMode note={studyNote} onClose={() => setStudyNote(null)} />}

            {/* Navbar */}
            <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0f1e]/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-1.5 font-bold text-lg">
                        <span className="text-pink-400">Tube</span><span className="text-white">ToMD</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 hidden sm:block">Shared Session</span>
                        <Link to="/register" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-white text-xs font-bold transition">
                            <Sparkles className="h-3.5 w-3.5" /> Try Free
                        </Link>
                    </div>
                </div>
            </header>

            {/* Session Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
                <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        session.videoType === 'youtube' ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'
                    }`}>
                        {session.videoType === 'youtube' ? 'YouTube' : 'Uploaded'}
                    </span>
                    {session.metadata?.language && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400">
                            {session.metadata.language}
                        </span>
                    )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug">{session.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-slate-500">
                    {session.duration != null && (
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(session.duration)}</span>
                    )}
                    <span>{segments.length} segments</span>
                    <span>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
                    {session.metadata?.channel && (
                        <span className="flex items-center gap-1"><Youtube className="h-3.5 w-3.5 text-red-400" />{session.metadata.channel}</span>
                    )}
                    {session.videoUrl && (
                        <a href={session.videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-pink-400 transition">
                            <ExternalLink className="h-3.5 w-3.5" /> Original video
                        </a>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">

                    {/* Left column */}
                    <div className="space-y-5">
                        {/* Video Player */}
                        {youtubeId ? (
                            <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-2xl ring-1 ring-white/5">
                                <div id="yt-player-public" className="w-full h-full" />
                            </div>
                        ) : (
                            <div className="rounded-2xl overflow-hidden aspect-video bg-[#1a1f2f] flex items-center justify-center ring-1 ring-white/5">
                                <div className="text-center">
                                    <Video className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">Uploaded video (not embeddable)</p>
                                </div>
                            </div>
                        )}

                        {/* Tab strip */}
                        <div className="flex gap-1 p-1 bg-[#1a1f2f]/60 rounded-xl w-fit">
                            {(['transcript', 'notes'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                                        activeTab === tab
                                            ? 'bg-pink-500/20 text-pink-300 shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {tab}
                                    {tab === 'notes' && notes.length > 0 && (
                                        <span className="ml-1.5 text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full">{notes.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Transcript */}
                        {activeTab === 'transcript' && (
                            <div className="bg-[#1a1f2f]/60 backdrop-blur-md border border-pink-900/15 rounded-2xl overflow-hidden">
                                <div className="p-3 border-b border-pink-900/15">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search transcript…"
                                            className="w-full bg-white/5 rounded-lg py-1.5 pl-9 pr-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500/40 transition"
                                        />
                                        {searchQuery.trim() && (
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                                <span className="text-[10px] text-slate-500 tabular-nums px-1">
                                                    {filteredSegments.length > 0 ? `${matchIndex + 1}/${filteredSegments.length}` : '0/0'}
                                                </span>
                                                <button onClick={() => setMatchIndex(i => Math.max(0, i - 1))} disabled={matchIndex === 0} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30">
                                                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                                                </button>
                                                <button onClick={() => setMatchIndex(i => Math.min(filteredSegments.length - 1, i + 1))} disabled={matchIndex >= filteredSegments.length - 1} className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30">
                                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                                </button>
                                                <button onClick={() => setSearchQuery('')} className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div ref={transcriptRef} className="overflow-y-auto max-h-[520px] space-y-0.5 p-2">
                                    {filteredSegments.length === 0
                                        ? <p className="text-center text-slate-500 text-sm py-10">No matches found.</p>
                                        : filteredSegments.map((seg, idx) => {
                                            const active = isActive(seg);
                                            const hit = !!searchQuery.trim() && idx === matchIndex;
                                            return (
                                                <button
                                                    key={idx}
                                                    data-seg={idx}
                                                    onClick={() => seekTo(seg.start)}
                                                    className={`w-full flex gap-4 p-3 rounded-lg text-left transition-all duration-200 border-l-2 ${
                                                        active ? 'bg-pink-500/10 border-pink-500'
                                                            : hit ? 'bg-yellow-500/8 border-yellow-500/50'
                                                                : 'border-transparent hover:bg-white/4'
                                                    }`}
                                                >
                                                    <span className={`flex-shrink-0 font-mono text-xs w-10 pt-0.5 ${active ? 'text-pink-400 font-bold' : hit ? 'text-yellow-400' : 'text-slate-600'}`}>
                                                        {formatTime(seg.start)}
                                                    </span>
                                                    <span className={`flex-1 text-sm leading-relaxed ${active ? 'text-white' : 'text-slate-300'}`}>
                                                        {renderHighlightedText(seg.text, searchQuery)}
                                                    </span>
                                                    {youtubeId && <Play className="flex-shrink-0 h-3.5 w-3.5 text-slate-600 mt-0.5" />}
                                                </button>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                        )}

                        {/* Notes (mobile) */}
                        {activeTab === 'notes' && (
                            <div className="space-y-3">
                                {notes.length === 0
                                    ? <div className="bg-[#1a1f2f]/40 rounded-2xl p-16 text-center">
                                        <FileText className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">No notes generated yet.</p>
                                    </div>
                                    : notes.map(n => <NoteCard key={n._id} note={n} onStudy={() => setStudyNote(n)} />)
                                }
                            </div>
                        )}
                    </div>

                    {/* Right sidebar (xl) */}
                    <div className="hidden xl:block">
                        <div className="sticky top-20 space-y-3 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
                            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-white/5">
                                AI Notes {notes.length > 0 && <span className="text-pink-400 ml-1">({notes.length})</span>}
                            </h2>
                            {notes.length === 0
                                ? <div className="bg-[#1a1f2f]/40 rounded-xl p-8 text-center">
                                    <FileText className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm">No notes yet.</p>
                                </div>
                                : notes.map(n => <NoteCard key={n._id} note={n} onStudy={() => setStudyNote(n)} />)
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer CTA */}
            <footer className="border-t border-white/5 bg-[#0b0f1e]/80 mt-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
                    <div className="inline-flex items-center gap-1.5 text-lg font-bold mb-3">
                        <span className="text-pink-400">Tube</span><span className="text-white">ToMD</span>
                    </div>
                    <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
                        Turn any YouTube video or audio into smart AI notes, flashcards, mind maps &amp; more.
                    </p>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-sm transition hover:scale-105 shadow-[0_0_30px_rgba(219,39,119,0.3)]"
                    >
                        <Sparkles className="h-4 w-4" /> Start Free — No Credit Card Needed
                    </Link>
                </div>
            </footer>
        </div>
    );
}
