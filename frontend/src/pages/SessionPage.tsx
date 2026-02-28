import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Session, Note, NoteType, ChatMessage, Annotation } from '@/types';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import {
    Loader2, FileText, Brain, GitBranch, MessageSquare, CreditCard,
    BookOpen, Trash2, FolderOpen, ArrowLeft, Sparkles, Languages,
    RotateCcw, ChevronDown, Copy, Search, Clock, Hash, Type,
    Youtube, Upload, AlertCircle, Download, Send, X,
    GraduationCap, ToggleLeft, ToggleRight, Edit2, Check, Play,
    StickyNote, Plus,
} from 'lucide-react';

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

const POLL_INTERVAL = 4000;

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'pt', label: 'Portuguese' },
    { code: 'ru', label: 'Russian' },
    { code: 'ja', label: 'Japanese' },
    { code: 'ko', label: 'Korean' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ar', label: 'Arabic' },
    { code: 'it', label: 'Italian' },
    { code: 'nl', label: 'Dutch' },
    { code: 'tr', label: 'Turkish' },
    { code: 'pl', label: 'Polish' },
    { code: 'sv', label: 'Swedish' },
    { code: 'id', label: 'Indonesian' },
    { code: 'th', label: 'Thai' },
    { code: 'vi', label: 'Vietnamese' },
    { code: 'uk', label: 'Ukrainian' },
];

const ACTION_BUTTONS: { type: NoteType; label: string; icon: typeof FileText; span?: 'full' | 'half' }[] = [
    { type: 'summary', label: 'Summarize Transcript', icon: FileText, span: 'full' },
    { type: 'mindmap', label: 'Mindmap', icon: Brain, span: 'full' },
    { type: 'flashcards', label: 'Flash Cards', icon: CreditCard, span: 'half' },
    { type: 'resources', label: 'Study Guide', icon: GraduationCap, span: 'half' },
    { type: 'detailed_notes', label: 'Detailed Notes', icon: BookOpen, span: 'half' },
    { type: 'flowchart', label: 'Flowchart', icon: GitBranch, span: 'half' },
];

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:v=|\/)([\w-]{11})(?:\?|&|$|\/)/,
        /(?:youtu\.be\/)([\w-]{11})/,
        /(?:embed\/)([\w-]{11})/,
        /(?:shorts\/)([\w-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function SessionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Core state
    const [session, setSession] = useState<Session | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);

    // Session title editing
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');

    // YouTube Player
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerRef = useRef<any>(null);
    const [playerReady, setPlayerReady] = useState(false);
    void playerReady; // used for future enhancements

    // Video
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

    // Transcript
    const [searchQuery, setSearchQuery] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const [copiedTranscript, setCopiedTranscript] = useState(false);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const activeSegmentRef = useRef<HTMLDivElement>(null);

    // Annotation popup
    const [showAnnotationPopup, setShowAnnotationPopup] = useState<{ segIdx: number; timestamp: number } | null>(null);
    const [annotationNote, setAnnotationNote] = useState('');

    // Translation
    const [translating, setTranslating] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const langMenuRef = useRef<HTMLDivElement>(null);

    // Actions / Notes
    const [generating, setGenerating] = useState<NoteType | null>(null);
    const [activeNote, setActiveNote] = useState<Note | null>(null);

    // Chat
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const youtubeVideoId = useMemo(
        () => (session?.videoUrl ? extractYouTubeId(session.videoUrl) : null),
        [session?.videoUrl]
    );

    // ─── Data Fetching ───────────────────────────────────────────

    const fetchSession = useCallback(async () => {
        console.log(`[Session] Fetching session id=${id}`);
        const res = await api.get<ApiResponse<Session>>(`/sessions/${id}`);
        const s = res.data.data;
        console.log(`[Session] Fetched:`, {
            id: s._id, title: s.title, status: s.status,
            videoType: s.videoType, language: s.metadata?.language,
            segments: s.transcription?.length ?? 0,
        });
        setSession(s);
        return s;
    }, [id]);

    const fetchNotes = useCallback(async () => {
        try {
            const res = await api.get<ApiResponse<Note[]>>(`/notes/session/${id}`);
            console.log(`[Session] Fetched ${res.data.data.length} notes`);
            setNotes(res.data.data);
        } catch (err) {
            console.log('[Session] No notes yet:', err);
        }
    }, [id]);

    const fetchChatHistory = useCallback(async () => {
        try {
            const res = await api.get<ApiResponse<ChatMessage[]>>(`/chat/${id}`);
            setChatMessages(res.data.data);
        } catch {
            // no chat yet
        }
    }, [id]);

    const fetchAnnotations = useCallback(async () => {
        try {
            const res = await api.get<ApiResponse<Annotation[]>>(`/annotations/session/${id}`);
            setAnnotations(res.data.data);
        } catch {
            // no annotations yet
        }
    }, [id]);

    // Load YouTube IFrame API
    useEffect(() => {
        if (!(window as any).YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode?.insertBefore(tag, firstScript);
        }
    }, []);

    useEffect(() => {
        if (id) {
            console.log(`[Session] Initial load for id=${id}`);
            Promise.all([fetchSession(), fetchNotes(), fetchChatHistory(), fetchAnnotations()])
                .finally(() => {
                    console.log('[Session] Initial load complete');
                    setLoading(false);
                });
        }
    }, [id, fetchSession, fetchNotes, fetchChatHistory, fetchAnnotations]);

    // Polling for processing sessions
    useEffect(() => {
        if (!session || (session.status !== 'processing' && session.status !== 'transcribing')) return;
        console.log(`[Session] Status=${session.status}, starting poll (${POLL_INTERVAL}ms)`);
        const interval = setInterval(async () => {
            console.log('[Session] Polling...');
            const updated = await fetchSession();
            if (updated.status === 'ready') {
                console.log('[Session] Transcription complete!');
                toast.success('Transcription complete!');
                fetchNotes();
            } else if (updated.status === 'failed') {
                console.error('[Session] Transcription failed:', updated.errorMessage);
                toast.error('Transcription failed');
            }
        }, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [session?.status, fetchSession, fetchNotes]);

    // Cleanup local video URL
    useEffect(() => {
        return () => { if (localVideoUrl) URL.revokeObjectURL(localVideoUrl); };
    }, [localVideoUrl]);

    // Close language menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
                setShowLangMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Auto-scroll transcript
    useEffect(() => {
        if (autoScroll && activeSegmentRef.current && transcriptContainerRef.current) {
            activeSegmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentTime, autoScroll]);

    // Scroll chat to bottom
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ─── Actions ─────────────────────────────────────────────────

    // Initialize YouTube Player when video ID is available
    useEffect(() => {
        if (!youtubeVideoId || !session || session.videoType !== 'youtube') return;

        const initPlayer = () => {
            if (playerRef.current) return;
            
            const container = document.getElementById('yt-player-container');
            if (!container) return;

            playerRef.current = new (window as any).YT.Player('yt-player', {
                videoId: youtubeVideoId,
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    enablejsapi: 1,
                    origin: window.location.origin,
                },
                events: {
                    onReady: () => {
                        console.log('[Session] YouTube Player ready');
                        setPlayerReady(true);
                    },
                    onStateChange: (event: any) => {
                        if (event.data === 1) { // playing
                            // Start time sync interval
                            const interval = setInterval(() => {
                                if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                                    const time = playerRef.current.getCurrentTime();
                                    setCurrentTime(time);
                                }
                            }, 250);
                            (window as any).__ytInterval = interval;
                        } else {
                            // Clear interval when paused/stopped
                            if ((window as any).__ytInterval) {
                                clearInterval((window as any).__ytInterval);
                            }
                        }
                    },
                },
            });
        };

        // Wait for YT API to load
        if ((window as any).YT && (window as any).YT.Player) {
            initPlayer();
        } else {
            (window as any).onYouTubeIframeAPIReady = initPlayer;
        }

        return () => {
            if ((window as any).__ytInterval) {
                clearInterval((window as any).__ytInterval);
            }
        };
    }, [youtubeVideoId, session?.videoType]);

    const seekTo = (seconds: number) => {
        console.log(`[Session] Seeking to ${seconds}s`);
        if (session?.videoType === 'youtube' && playerRef.current && typeof playerRef.current.seekTo === 'function') {
            playerRef.current.seekTo(seconds, true);
            setCurrentTime(seconds);
        } else if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            setCurrentTime(seconds);
        }
    };

    const handleUpdateTitle = async () => {
        if (!editedTitle.trim() || editedTitle.trim() === session?.title) {
            setIsEditingTitle(false);
            return;
        }
        try {
            const res = await api.put<ApiResponse<Session>>(`/sessions/${id}`, { title: editedTitle.trim() });
            setSession(res.data.data);
            toast.success('Title updated');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to update title';
            toast.error(msg);
        } finally {
            setIsEditingTitle(false);
        }
    };

    const handleAddAnnotation = async (timestamp: number) => {
        if (!annotationNote.trim()) return;
        try {
            const res = await api.post<ApiResponse<Annotation>>(`/annotations/session/${id}`, {
                selectedText: annotationNote.trim(),
                note: annotationNote.trim(),
                startTimestamp: timestamp,
            });
            setAnnotations(prev => [...prev, res.data.data]);
            toast.success('Note added');
            setShowAnnotationPopup(null);
            setAnnotationNote('');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to add note';
            toast.error(msg);
        }
    };

    const handleDeleteAnnotation = async (annotationId: string) => {
        try {
            await api.delete(`/annotations/${annotationId}`);
            setAnnotations(prev => prev.filter(a => a._id !== annotationId));
            toast.success('Note deleted');
        } catch (err: any) {
            toast.error('Failed to delete note');
        }
    };

    const handleLocalVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        console.log('[Session] Local video selected:', file.name);
        if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
        setLocalVideoUrl(URL.createObjectURL(file));
    };

    const copyTranscript = () => {
        if (!session?.transcription?.length) return;
        const text = session.transcription
            .map(seg => `${formatTime(seg.start)}  ${seg.text}`)
            .join('\n');
        navigator.clipboard.writeText(text);
        setCopiedTranscript(true);
        toast.success('Transcript copied!');
        console.log('[Session] Transcript copied to clipboard');
        setTimeout(() => setCopiedTranscript(false), 2000);
    };

    const generateNote = async (type: NoteType) => {
        if (!session || session.status !== 'ready') {
            console.warn('[Session] Cannot generate note: session not ready, status=', session?.status);
            toast.error('Session is not ready yet. Wait for transcription to complete.');
            return;
        }
        if (!session.transcription?.length) {
            console.warn('[Session] Cannot generate note: no transcript segments');
            toast.error('No transcript available to generate notes from.');
            return;
        }

        console.log(`[Session] Generating note: type=${type}, sessionId=${id}`);
        setGenerating(type);
        toast.info(`Generating ${type.replace('_', ' ')}...`);

        try {
            const res = await api.post<ApiResponse<Note>>(`/notes/session/${id}/generate`, {
                type,
                persona: 'detailed',
            });
            const newNote = res.data.data;
            console.log(`[Session] Note generated:`, { id: newNote._id, title: newNote.title, type: newNote.type });
            setNotes(prev => [newNote, ...prev]);
            setActiveNote(newNote);
            toast.success(`${type.replace('_', ' ')} generated!`);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to generate note. Please try again.';
            console.error(`[Session] Note generation failed: ${msg}`);
            toast.error(msg);
        } finally {
            setGenerating(null);
        }
    };

    const deleteNote = async (noteId: string) => {
        console.log('[Session] Deleting note:', noteId);
        try {
            await api.delete(`/notes/${noteId}`);
            setNotes(prev => prev.filter(n => n._id !== noteId));
            if (activeNote?._id === noteId) setActiveNote(null);
            toast.success('Note deleted');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to delete note';
            console.error(`[Session] Delete note failed: ${msg}`);
            toast.error(msg);
        }
    };

    const handleExport = async (noteId: string, format: string) => {
        console.log(`[Session] Exporting note ${noteId} as ${format}`);
        try {
            const res = await api.get(`/notes/${noteId}/export?format=${format}`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `note.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success(`Exported as .${format}`);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Export failed';
            console.error(`[Session] Export failed: ${msg}`);
            toast.error(msg);
        }
    };

    const handleTranslate = async (langCode: string) => {
        const langLabel = LANGUAGES.find(l => l.code === langCode)?.label || langCode;
        console.log(`[Session] Translating to ${langLabel}`);
        setShowLangMenu(false);
        setTranslating(true);
        toast.info(`Translating to ${langLabel}...`);
        try {
            const res = await api.post<ApiResponse<Session>>(`/sessions/${id}/translate`, {
                targetLanguage: langCode,
            });
            console.log(`[Session] Translation complete to ${langLabel}`);
            setSession(res.data.data);
            toast.success('Transcript translated!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Translation failed. Please try again.';
            console.error(`[Session] Translation failed: ${msg}`);
            toast.error(msg);
        } finally {
            setTranslating(false);
        }
    };

    const handleRestoreOriginal = async () => {
        console.log('[Session] Restoring original transcript');
        setTranslating(true);
        try {
            const res = await api.post<ApiResponse<Session>>(`/sessions/${id}/restore-original`);
            setSession(res.data.data);
            toast.success('Original transcript restored');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to restore transcript';
            console.error(`[Session] Restore failed: ${msg}`);
            toast.error(msg);
        } finally {
            setTranslating(false);
        }
    };

    const sendChatMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || chatSending) return;
        const userMsg = chatInput;
        console.log('[Session] Sending chat message:', userMsg);
        setChatInput('');
        setChatSending(true);

        const tempMsg: ChatMessage = {
            _id: `temp-${Date.now()}`,
            sessionId: id!,
            role: 'user',
            content: userMsg,
            createdAt: new Date().toISOString(),
        };
        setChatMessages(prev => [...prev, tempMsg]);

        try {
            const res = await api.post<ApiResponse<ChatMessage>>(`/chat/${id}`, { message: userMsg });
            console.log('[Session] Chat response received');
            setChatMessages(prev => [
                ...prev.filter(m => m._id !== tempMsg._id),
                { ...tempMsg, _id: `sent-${Date.now()}` },
                res.data.data,
            ]);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to send message';
            console.error(`[Session] Chat send failed: ${msg}`);
            toast.error(msg);
            setChatMessages(prev => prev.filter(m => m._id !== tempMsg._id));
        } finally {
            setChatSending(false);
        }
    };

    // ─── Computed ────────────────────────────────────────────────

    const isYouTube = session?.videoType === 'youtube';
    const isUploaded = session?.videoType === 'uploaded';
    const isProcessing = session?.status === 'processing' || session?.status === 'transcribing';
    const isReady = session?.status === 'ready';
    const isFailed = session?.status === 'failed';
    const hasTranscript = (session?.transcription?.length ?? 0) > 0;
    const isTranslated = !!session?.metadata?.translatedTo;

    const filteredTranscript = useMemo(() => {
        if (!session?.transcription) return [];
        if (!searchQuery.trim()) return session.transcription;
        const q = searchQuery.toLowerCase();
        return session.transcription.filter(seg => seg.text.toLowerCase().includes(q));
    }, [session?.transcription, searchQuery]);

    const wordCount = useMemo(() => {
        if (!session?.transcription) return 0;
        return session.transcription.reduce((acc, seg) => acc + seg.text.split(/\s+/).filter(Boolean).length, 0);
    }, [session?.transcription]);

    const charCount = useMemo(() => {
        if (!session?.transcription) return 0;
        return session.transcription.reduce((acc, seg) => acc + seg.text.length, 0);
    }, [session?.transcription]);

    const isActiveSegment = (seg: { start: number; duration: number }) => {
        return currentTime >= seg.start && currentTime < seg.start + seg.duration;
    };

    // ─── Loading State ───────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">Loading session...</span>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4">
                <p className="text-[hsl(var(--muted-foreground))]">Session not found</p>
                <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:underline">
                    <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                </button>
            </div>
        );
    }

    // ─── Note Viewer Modal ───────────────────────────────────────

    if (activeNote) {
        return <NoteViewerFull note={activeNote} onBack={() => setActiveNote(null)} onExport={handleExport} onSeek={seekTo} onDelete={deleteNote} />;
    }

    // ─── Main 3-Column Layout ────────────────────────────────────

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

            {/* LEFT COLUMN: Video + Info */}
            <div className="w-[320px] flex-shrink-0 flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                {/* Back button */}
                <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center gap-2">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Back to Dashboard</span>
                </div>

                {/* Video Player (compact) */}
                <div className="bg-black aspect-video w-full flex-shrink-0 relative" id="yt-player-container">
                    {isYouTube && youtubeVideoId ? (
                        <div id="yt-player" className="w-full h-full" />
                    ) : isUploaded && localVideoUrl ? (
                        <video
                            ref={videoRef}
                            src={localVideoUrl}
                            className="w-full h-full"
                            controls
                            onTimeUpdate={() => {
                                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                            }}
                        />
                    ) : isUploaded ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60 p-4">
                            <FolderOpen className="h-8 w-8" />
                            <p className="text-xs text-center">Select your video file</p>
                            <label className="cursor-pointer btn-primary rounded-lg px-4 py-1.5 text-xs font-medium">
                                <input type="file" accept="video/*,audio/*" onChange={handleLocalVideoSelect} className="hidden" />
                                Choose File
                            </label>
                        </div>
                    ) : isProcessing ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-white/40" />
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center text-white/40 text-sm">No video</div>
                    )}
                </div>

                {/* Session Title - Editable */}
                <div className="px-4 py-3 border-b border-[hsl(var(--border))]">
                    {isEditingTitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateTitle();
                                    if (e.key === 'Escape') setIsEditingTitle(false);
                                }}
                                className="flex-1 bg-[hsl(var(--secondary))] border border-[hsl(var(--input))] rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                                autoFocus
                            />
                            <button onClick={handleUpdateTitle} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                                <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setIsEditingTitle(false)} className="p-1 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] rounded">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-2 group cursor-pointer"
                            onClick={() => { setEditedTitle(session.title); setIsEditingTitle(true); }}
                        >
                            <h2 className="text-sm font-semibold leading-snug flex-1">{session.title}</h2>
                            <Edit2 className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition" />
                        </div>
                    )}
                </div>

                {/* Metadata Tags */}
                <div className="px-4 py-3 border-b border-[hsl(var(--border))] space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            isYouTube ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                            {isYouTube ? <Youtube className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
                            {session.videoType}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            isReady ? 'bg-emerald-500/10 text-emerald-400'
                                : isFailed ? 'bg-red-500/10 text-red-400'
                                : 'bg-amber-500/10 text-amber-400'
                        }`}>
                            {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
                            {session.status}
                        </span>

                        {session.duration && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]">
                                <Clock className="h-3 w-3" />
                                {Math.floor(session.duration / 60)}m {Math.floor(session.duration % 60)}s
                            </span>
                        )}
                    </div>

                    {session.metadata?.language && (
                        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                            <Languages className="h-3.5 w-3.5" />
                            <span className="uppercase font-medium">{session.metadata.language}</span>
                            {session.metadata.translatedTo && (
                                <span className="text-[hsl(var(--primary))]">
                                    → {LANGUAGES.find(l => l.code === session.metadata?.translatedTo)?.label || session.metadata.translatedTo}
                                </span>
                            )}
                        </div>
                    )}

                    {isFailed && session.errorMessage && (
                        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span>{session.errorMessage}</span>
                        </div>
                    )}
                </div>

                {/* Video ID / Channel Info */}
                <div className="px-4 py-3 border-b border-[hsl(var(--border))] space-y-2 text-xs text-[hsl(var(--muted-foreground))]">
                    {isYouTube && youtubeVideoId && (
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Video ID:</span>
                            <code className="bg-[hsl(var(--secondary))] px-2 py-0.5 rounded text-[10px]">{youtubeVideoId}</code>
                        </div>
                    )}
                    {session.metadata?.channel && (
                        <div className="flex items-center justify-between">
                            <span className="font-medium">Channel:</span>
                            <span className="truncate ml-2">{session.metadata.channel}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="font-medium">Created:</span>
                        <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                {/* Generated Notes List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-3">
                        <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">
                            Generated Notes ({notes.length})
                        </h3>
                        {notes.length === 0 ? (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]/60">
                                No notes yet. Use the actions panel to generate.
                            </p>
                        ) : (
                            <div className="space-y-1.5">
                                {notes.map(note => (
                                    <div
                                        key={note._id}
                                        className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-2 hover:bg-[hsl(var(--secondary))] cursor-pointer transition group"
                                        onClick={() => setActiveNote(note)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-medium truncate block">{note.title}</span>
                                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] capitalize">{note.type.replace('_', ' ')}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNote(note._id); }}
                                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CENTER COLUMN: Transcript */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Transcript Toolbar */}
                <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <div className="px-4 py-2.5 flex items-center gap-3">
                        <button
                            onClick={copyTranscript}
                            disabled={!hasTranscript}
                            className="btn-primary rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 disabled:opacity-40 flex-shrink-0"
                        >
                            <Copy className="h-4 w-4" />
                            {copiedTranscript ? 'Copied!' : 'Copy Transcript'}
                        </button>

                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search Transcript"
                                className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Language Dropdown */}
                        {hasTranscript && isReady && (
                            <div className="relative flex-shrink-0" ref={langMenuRef}>
                                <button
                                    onClick={() => setShowLangMenu(!showLangMenu)}
                                    disabled={translating}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--secondary))] transition disabled:opacity-50 whitespace-nowrap"
                                >
                                    {translating ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Languages className="h-3.5 w-3.5" />
                                    )}
                                    {isTranslated
                                        ? LANGUAGES.find(l => l.code === session.metadata?.translatedTo)?.label || 'Translated'
                                        : session.metadata?.language
                                            ? `${session.metadata.language.charAt(0).toUpperCase() + session.metadata.language.slice(1)} (auto-generated)`
                                            : 'Language'}
                                    <ChevronDown className="h-3 w-3" />
                                </button>

                                <AnimatePresence>
                                    {showLangMenu && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                            transition={{ duration: 0.12 }}
                                            className="absolute top-full right-0 mt-1 z-50 w-52 max-h-64 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl"
                                        >
                                            {isTranslated && (
                                                <button
                                                    onClick={handleRestoreOriginal}
                                                    className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--primary))] font-medium hover:bg-[hsl(var(--secondary))] transition flex items-center gap-2 border-b border-[hsl(var(--border))]"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                    Restore Original
                                                </button>
                                            )}
                                            {LANGUAGES.map(lang => (
                                                <button
                                                    key={lang.code}
                                                    onClick={() => handleTranslate(lang.code)}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[hsl(var(--secondary))] transition ${
                                                        session.metadata?.translatedTo === lang.code
                                                            ? 'text-[hsl(var(--primary))] font-medium'
                                                            : 'text-[hsl(var(--foreground))]'
                                                    }`}
                                                >
                                                    {lang.label}
                                                    {session.metadata?.translatedTo === lang.code && (
                                                        <span className="ml-1 text-xs opacity-60">(current)</span>
                                                    )}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transcript Body */}
                <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto">
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    {session.status === 'processing' ? 'Preparing transcription...' : 'Transcribing video...'}
                                </p>
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                    This may take a minute. The transcript will appear automatically.
                                </p>
                            </div>
                            <div className="w-full max-w-md px-6 space-y-2 opacity-40">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="flex gap-3 animate-pulse">
                                        <div className="h-3 w-12 rounded bg-[hsl(var(--muted))]" />
                                        <div className="h-3 rounded bg-[hsl(var(--muted))]" style={{ width: `${40 + Math.random() * 50}%` }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : isFailed ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <AlertCircle className="h-10 w-10 text-red-400" />
                            <p className="text-sm font-medium text-red-400">Transcription Failed</p>
                            {session.errorMessage && (
                                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm text-center">{session.errorMessage}</p>
                            )}
                        </div>
                    ) : !hasTranscript ? (
                        <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                            No transcript available
                        </div>
                    ) : (
                        <div className="p-4 space-y-1">
                            {filteredTranscript.map((seg, idx) => {
                                const active = isActiveSegment(seg);
                                const segAnnotations = annotations.filter(a => 
                                    a.startTimestamp !== undefined && 
                                    Math.abs(a.startTimestamp - seg.start) < 1
                                );
                                return (
                                    <div key={idx} className="group">
                                        <div
                                            ref={active ? activeSegmentRef : undefined}
                                            onClick={() => seekTo(seg.start)}
                                            className={`flex gap-4 rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 relative ${
                                                active
                                                    ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--foreground))] border-l-3 border-[hsl(var(--primary))] shadow-sm'
                                                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] border-l-3 border-transparent'
                                            }`}
                                        >
                                            <span className={`flex-shrink-0 font-mono text-sm w-14 pt-0.5 ${
                                                active ? 'text-[hsl(var(--primary))] font-bold' : 'text-[hsl(var(--primary))]/60'
                                            }`}>
                                                {formatTime(seg.start)}
                                            </span>
                                            <span className="flex-1 leading-relaxed text-base">{seg.text}</span>
                                            
                                            {/* Action buttons on hover */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); seekTo(seg.start); }}
                                                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
                                                    title="Jump to"
                                                >
                                                    <Play className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setShowAnnotationPopup({ segIdx: idx, timestamp: seg.start });
                                                        setAnnotationNote('');
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-400"
                                                    title="Add note"
                                                >
                                                    <StickyNote className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Show annotations for this timestamp */}
                                        {segAnnotations.map(ann => (
                                            <div key={ann._id} className="ml-20 mt-1 mb-2 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm">
                                                <StickyNote className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                                                <span className="flex-1 text-amber-200">{ann.note || ann.selectedText}</span>
                                                <button
                                                    onClick={() => handleDeleteAnnotation(ann._id)}
                                                    className="p-1 text-[hsl(var(--muted-foreground))] hover:text-red-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {/* Annotation popup */}
                                        {showAnnotationPopup?.segIdx === idx && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="ml-20 mt-2 mb-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-lg"
                                            >
                                                <div className="flex items-center gap-2 mb-2 text-xs text-[hsl(var(--muted-foreground))]">
                                                    <StickyNote className="h-3.5 w-3.5" />
                                                    Add note at {formatTime(seg.start)}
                                                </div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={annotationNote}
                                                        onChange={(e) => setAnnotationNote(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleAddAnnotation(seg.start);
                                                            if (e.key === 'Escape') setShowAnnotationPopup(null);
                                                        }}
                                                        placeholder="Enter your note..."
                                                        className="flex-1 bg-[hsl(var(--secondary))] border border-[hsl(var(--input))] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleAddAnnotation(seg.start)}
                                                        disabled={!annotationNote.trim()}
                                                        className="btn-primary rounded-lg px-3 py-2 text-sm disabled:opacity-40"
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setShowAnnotationPopup(null)}
                                                        className="p-2 rounded-lg hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Transcript Footer */}
                {hasTranscript && (
                    <div className="border-t border-[hsl(var(--border))] px-4 py-3 flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--card))]">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1.5">
                                <Type className="h-4 w-4" />
                                Word Count: {wordCount.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Hash className="h-4 w-4" />
                                Character count: {charCount.toLocaleString()}
                            </span>
                        </div>
                        <button
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition ${
                                autoScroll 
                                    ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' 
                                    : 'hover:bg-[hsl(var(--secondary))]'
                            }`}
                        >
                            {autoScroll ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                            <span className="font-medium">Autoscroll</span>
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT COLUMN: Actions */}
            <div className="w-[340px] flex-shrink-0 flex flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                {/* Chat Section */}
                <div className="border-b border-[hsl(var(--border))]">
                    <div className="px-4 py-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-[hsl(var(--primary))]" />
                        <span className="text-sm font-semibold">Chat with the transcript</span>
                    </div>

                    {chatMessages.length > 0 && (
                        <div className="px-4 max-h-48 overflow-y-auto space-y-2 mb-2">
                            {chatMessages.map(msg => (
                                <div key={msg._id} className={`text-xs ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                    <span className={`inline-block max-w-[85%] rounded-lg px-3 py-1.5 ${
                                        msg.role === 'user'
                                            ? 'bg-[hsl(var(--primary))] text-white'
                                            : 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]'
                                    }`}>
                                        {msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content}
                                    </span>
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1 justify-start">
                                            {msg.sources.map((src, idx) => (
                                                <button key={idx} onClick={() => seekTo(src.startTimestamp)} className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] font-mono">
                                                    {formatTime(src.startTimestamp)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={chatBottomRef} />
                        </div>
                    )}

                    <form onSubmit={sendChatMessage} className="px-4 pb-3 flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Ask about the video..."
                            disabled={!isReady}
                            className="flex-1 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={chatSending || !chatInput.trim() || !isReady}
                            className="btn-primary rounded-lg p-2 disabled:opacity-40"
                        >
                            {chatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                    </form>
                </div>

                {/* Actions */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="h-4 w-4 text-[hsl(var(--primary))]" />
                            <span className="text-sm font-semibold">Actions</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {ACTION_BUTTONS.map(({ type, label, icon: Icon, span }) => (
                                <button
                                    key={type}
                                    onClick={() => generateNote(type)}
                                    disabled={generating !== null || !isReady || !hasTranscript}
                                    className={`${
                                        span === 'full' ? 'col-span-2' : 'col-span-1'
                                    } rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-left
                                    hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/5
                                    disabled:opacity-40 disabled:hover:border-[hsl(var(--border))] disabled:hover:bg-transparent
                                    transition-all duration-200 flex items-center gap-2.5`}
                                >
                                    {generating === type ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--primary))]" />
                                    ) : (
                                        <Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
                                    )}
                                    {label}
                                </button>
                            ))}
                        </div>

                        {generating && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 rounded-lg px-3 py-2"
                            >
                                <Sparkles className="h-3 w-3 animate-pulse" />
                                AI is generating your {generating.replace('_', ' ')}...
                            </motion.div>
                        )}

                        {!isReady && !isFailed && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg px-3 py-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Waiting for transcription to complete...
                            </div>
                        )}

                        {isFailed && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                                <AlertCircle className="h-3 w-3" />
                                Transcription failed. Actions are unavailable.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Full-Screen Note Viewer ─────────────────────────────────────

function NoteViewerFull({
    note, onBack, onExport, onSeek, onDelete,
}: {
    note: Note;
    onBack: () => void;
    onExport: (noteId: string, format: string) => void;
    onSeek: (seconds: number) => void;
    onDelete: (noteId: string) => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    const renderMermaid = useCallback(async () => {
        if (!containerRef.current) return;
        const blocks = containerRef.current.querySelectorAll('.mermaid-block');
        for (const block of blocks) {
            const code = block.getAttribute('data-mermaid');
            if (!code || block.querySelector('svg')) continue;
            try {
                const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
                const { svg } = await mermaid.render(id, code);
                block.innerHTML = svg;
            } catch {
                block.innerHTML = `<pre class="text-xs text-red-400 p-2">Failed to render diagram</pre>`;
            }
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(renderMermaid, 100);
        return () => clearTimeout(timer);
    }, [note.content, renderMermaid]);

    useEffect(() => {
        if (note.mermaidCode) renderMermaid();
    }, [note.mermaidCode, renderMermaid]);

    const processContent = (content: string) => {
        return content.replace(
            /\[(\d+):(\d{2})\]/g,
            (_, mins: string, secs: string) => {
                const totalSeconds = parseInt(mins) * 60 + parseInt(secs);
                return `[${mins}:${secs}](timestamp:${totalSeconds})`;
            }
        );
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col" ref={containerRef}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <h3 className="font-semibold text-sm">{note.title}</h3>
                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                            {note.type.replace('_', ' ')} &middot; {new Date(note.createdAt).toLocaleString()}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {['md', 'html'].map(fmt => (
                        <button
                            key={fmt}
                            onClick={() => onExport(note._id, fmt)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
                        >
                            <Download className="h-3 w-3" />.{fmt}
                        </button>
                    ))}
                    <button
                        onClick={() => { onDelete(note._id); onBack(); }}
                        className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 transition"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full">
                {note.mermaidCode && (
                    <div className="mb-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-4 overflow-x-auto">
                        <div className="mermaid-block" data-mermaid={note.mermaidCode} />
                    </div>
                )}

                <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown
                        components={{
                            a: ({ href, children }) => {
                                if (href?.startsWith('timestamp:')) {
                                    const secs = parseInt(href.replace('timestamp:', ''));
                                    return (
                                        <button
                                            onClick={() => onSeek(secs)}
                                            className="text-[hsl(var(--accent))] hover:underline font-mono text-xs bg-[hsl(var(--accent))]/10 px-1.5 py-0.5 rounded"
                                        >
                                            {children}
                                        </button>
                                    );
                                }
                                return (
                                    <a href={href} target="_blank" rel="noopener" className="text-[hsl(var(--primary))] hover:text-[hsl(var(--accent))]">
                                        {children}
                                    </a>
                                );
                            },
                            code: ({ className, children, ...props }) => {
                                const match = /language-mermaid/.exec(className || '');
                                if (match) {
                                    const code = String(children).replace(/\n$/, '');
                                    return (
                                        <div className="not-prose my-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary))] p-4 overflow-x-auto">
                                            <div className="mermaid-block" data-mermaid={code} />
                                        </div>
                                    );
                                }
                                return <code className={className} {...props}>{children}</code>;
                            },
                        }}
                    >
                        {processContent(note.content)}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
