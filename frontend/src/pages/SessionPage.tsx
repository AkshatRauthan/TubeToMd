import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Session, Note, NoteType, ChatMessage, Annotation } from '@/types';
import { useSessionPolling } from '@/hooks/useSessionPolling';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import {
    Loader2, FileText, Brain, GitBranch, MessageSquare, CreditCard,
    BookOpen, Trash2, FolderOpen, ArrowLeft, Sparkles, Languages,
    RotateCcw, ChevronDown, ChevronUp, Copy, Search, Clock, Hash, Type,
    Youtube, AlertCircle, Download, X, Settings2,
    GraduationCap, Edit2, Save, Check, Play,
    StickyNote, Plus, Globe2, FileDown, Eraser,
    Share2, Link, SquareStack,
} from 'lucide-react';
import { FlashcardStudyMode, parseFlashcards } from '@/components/FlashcardStudyMode';


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

const PERSONAS = [
    { value: 'detailed',   label: 'Detailed — Comprehensive coverage' },
    { value: 'executive',  label: 'Executive — High-level summary' },
    { value: 'eli5',       label: 'ELI5 — Simple explanations' },
    { value: 'code-heavy', label: 'Code-Heavy — Focus on code' },
    { value: 'actionable', label: 'Actionable — Steps & takeaways' },
    { value: 'academic',   label: 'Academic — Formal & structured' },
    { value: 'custom',     label: 'Custom — Your own instructions' },
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

function normalizeYouTubeUrl(url?: string): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const id = extractYouTubeId(trimmed);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
    if (trimmed.length === 11 && /^[\w-]+$/.test(trimmed)) {
        return `https://www.youtube.com/watch?v=${trimmed}`;
    }
    return trimmed;
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTimeInput(t: string): number | undefined {
    if (!t.trim()) return undefined;
    const parts = t.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts[0] * 60 + parts[1];
    }
    return undefined;
}

function renderHighlightedText(text: string, query: string) {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5 not-italic">
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
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

    // YouTube Player — direct iframe with postMessage API
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [playerReady, setPlayerReady] = useState(false);

    // Video
    const videoRef = useRef<HTMLVideoElement>(null);
    const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);

    // Track YouTube currentTime via postMessage listener
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data?.event === 'infoDelivery' && data?.info?.currentTime != null) {
                    setCurrentTime(data.info.currentTime);
                }
            } catch { /* ignore */ }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    // Poll YouTube iframe for currentTime every 500ms once player is ready
    useEffect(() => {
        if (!playerReady || session?.videoType !== 'youtube') return;
        const interval = setInterval(() => {
            iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'getCurrentTime', args: [] }),
                '*'
            );
        }, 500);
        return () => clearInterval(interval);
    }, [playerReady, session?.videoType]);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const [copiedTranscript, setCopiedTranscript] = useState(false);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    // Map of segment start-time → DOM element for reliable auto-scroll across filtered views
    const segmentRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

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
    const [chatFloating, setChatFloating] = useState(false);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    // Advanced note generation options
    const [selectedPersona, setSelectedPersona] = useState('detailed');
    const [customPromptText, setCustomPromptText] = useState('');
    const [topicFocus, setTopicFocus] = useState('');
    const [noteStartTime, setNoteStartTime] = useState('');
    const [noteEndTime, setNoteEndTime] = useState('');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // Transcript match navigation
    const [matchIndex, setMatchIndex] = useState(0);

    // Sharing
    const [sharing, setSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [copiedShare, setCopiedShare] = useState(false);
    const [isShared, setIsShared] = useState(false);

    // Batch generation
    const [batchSelected, setBatchSelected] = useState<Set<NoteType>>(new Set());
    const [batchRunning, setBatchRunning] = useState(false);
    const [batchStatus, setBatchStatus] = useState<Record<string, 'idle' | 'running' | 'done' | 'error'>>({});
    const [showBatchPanel, setShowBatchPanel] = useState(false);
    const [showNotesPanel, setShowNotesPanel] = useState(true);

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
    useSessionPolling({
        session,
        fetchSession,
        fetchNotes,
        pollInterval: POLL_INTERVAL
    });

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

    // Auto-scroll transcript — find the active segment from the full transcript (not the
    // filtered subset) so scrolling works even when a search filter is active.
    useEffect(() => {
        if (!autoScroll || !session?.transcription) return;
        const activeSeg = session.transcription.find(
            seg => currentTime >= seg.start && currentTime < seg.start + seg.duration
        );
        if (!activeSeg) return;
        const el = segmentRefsMap.current.get(activeSeg.start);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [currentTime, autoScroll, session?.transcription]);

    // Reset match index when search query changes
    useEffect(() => {
        setMatchIndex(0);
    }, [searchQuery]);

    // Scroll to active match when matchIndex changes
    useEffect(() => {
        if (!searchQuery.trim() || !transcriptContainerRef.current) return;
        const el = transcriptContainerRef.current.querySelector(`[data-match-idx="${matchIndex}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [matchIndex, searchQuery]);

    // Scroll chat to bottom
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // ─── Actions ─────────────────────────────────────────────────



    const seekTo = (seconds: number) => {
        console.log(`[Session] Seeking to ${seconds}s`);
        if (session?.videoType === 'youtube' && iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'seekTo', args: [seconds, true] }),
                '*'
            );
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

    const generateNote = async (type: NoteType, regenerate = false) => {
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
                persona: selectedPersona,
                customPrompt: selectedPersona === 'custom' ? customPromptText : undefined,
                topic: topicFocus.trim() || undefined,
                startTimestamp: parseTimeInput(noteStartTime),
                endTimestamp: parseTimeInput(noteEndTime),
                regenerate,
            });
            const newNote = res.data.data;
            console.log(`[Session] Note generated:`, { id: newNote._id, title: newNote.title, type: newNote.type });
            setNotes(prev => {
                const idx = prev.findIndex(n => n._id === newNote._id);
                if (idx >= 0) {
                    const copy = [...prev];
                    copy[idx] = newNote;
                    return copy;
                }
                return [newNote, ...prev];
            });
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

    const updateNote = async (noteId: string, content: string) => {
        try {
            const res = await api.put(`/notes/${noteId}`, { content, title: activeNote?.title });
            const updated = res.data.data;
            setNotes(prev => prev.map(n => n._id === noteId ? updated : n));
            if (activeNote?._id === noteId) {
                setActiveNote(updated);
            }
            toast.success('Note updated successfully');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to update note';
            toast.error(msg);
            throw err;
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

    const handleDownloadReport = async () => {
        try {
            toast.info('Generating PDF report...');
            const res = await api.get(`/sessions/${id}/report`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session?.title || 'report'}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Report downloaded!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to generate report';
            toast.error(msg);
        }
    };

    const handleClearChat = async () => {
        if (!confirm('Clear all chat messages for this session?')) return;
        try {
            await api.delete(`/chat/${id}`);
            setChatMessages([]);
            toast.success('Chat history cleared');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to clear chat';
            toast.error(msg);
        }
    };

    const handleShareSession = async () => {
        setSharing(true);
        try {
            const res = await api.post<ApiResponse<{ shareToken: string; shareUrl: string }>>(`/sessions/${id}/share`);
            const { shareUrl: url } = res.data.data;
            setShareUrl(url);
            setIsShared(true);
            await navigator.clipboard.writeText(url);
            setCopiedShare(true);
            toast.success('Share link copied to clipboard!');
            setTimeout(() => setCopiedShare(false), 3000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to generate share link');
        } finally {
            setSharing(false);
        }
    };

    const handleCopyShareUrl = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        toast.success('Link copied!');
        setTimeout(() => setCopiedShare(false), 2000);
    };

    const handleRevokeShare = async () => {
        if (!confirm('Revoke the public share link? Anyone with the link will lose access.')) return;
        try {
            await api.delete(`/sessions/${id}/share`);
            setIsShared(false);
            setShareUrl('');
            toast.success('Share link revoked');
        } catch (err: any) {
            toast.error('Failed to revoke share link');
        }
    };

    const handleBatchGenerate = async () => {
        if (batchSelected.size === 0) { toast.error('Select at least one note type'); return; }
        if (!isReady || !hasTranscript) { toast.error('Session is not ready yet'); return; }

        setBatchRunning(true);
        const types = Array.from(batchSelected);
        const statusInit: Record<string, 'idle' | 'running' | 'done' | 'error'> = {};
        types.forEach(t => { statusInit[t] = 'running'; });
        setBatchStatus(statusInit);

        const results = await Promise.allSettled(
            types.map(type =>
                api.post<ApiResponse<Note>>(`/notes/session/${id}/generate`, {
                    type,
                    persona: selectedPersona,
                    customPrompt: selectedPersona === 'custom' ? customPromptText : undefined,
                    topic: topicFocus.trim() || undefined,
                    startTimestamp: parseTimeInput(noteStartTime),
                    endTimestamp: parseTimeInput(noteEndTime),
                }).then(res => ({ type, note: res.data.data }))
            )
        );

        const newStatuses: Record<string, 'idle' | 'running' | 'done' | 'error'> = {};
        const newNotes: Note[] = [];
        results.forEach((result, i) => {
            const type = types[i];
            if (result.status === 'fulfilled') {
                newStatuses[type] = 'done';
                newNotes.push(result.value.note);
            } else {
                newStatuses[type] = 'error';
            }
        });
        setBatchStatus(newStatuses);
        if (newNotes.length > 0) {
            setNotes(prev => [...newNotes, ...prev]);
            setActiveNote(newNotes[0]);
            toast.success(`Generated ${newNotes.length}/${types.length} notes!`);
        }
        setBatchRunning(false);
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

    // ─── Main 2-Column Layout (video+transcript | info+actions+chat) ──

    return (
        <>
        <AnimatePresence>
            {activeNote && (
                <NoteModal
                    note={activeNote}
                    onClose={() => setActiveNote(null)}
                    onExport={handleExport}
                    onSeek={seekTo}
                    onDelete={deleteNote}
                    onUpdate={updateNote}
                    onRegenerate={() => generateNote(activeNote.type, true)}
                    isRegenerating={generating === activeNote.type}
                />
            )}
            {chatFloating && (
                <ChatModal
                    messages={chatMessages}
                    sending={chatSending}
                    input={chatInput}
                    isReady={isReady}
                    onInputChange={setChatInput}
                    onSend={sendChatMessage}
                    onClear={handleClearChat}
                    onSeek={seekTo}
                    onClose={() => setChatFloating(false)}
                />
            )}
        </AnimatePresence>
        <main className="flex-1 mt-16 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-4rem)]">

            {/* LEFT COLUMN: Video stacked above Transcript */}
            <section className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-hidden lg:h-[calc(100vh-5rem)] lg:sticky lg:top-20">

                {/* Back button */}
                <div className="glass-panel px-4 py-2.5 rounded-xl flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </div>

                {/* Video Player */}
                <div className="relative aspect-video rounded-xl overflow-hidden glass-panel flex-shrink-0 bg-black" id="yt-player-container">
                    {isYouTube && youtubeVideoId ? (
                        // Direct YouTube iframe — most reliable, works regardless of ReactPlayer issues
                        <iframe
                            key={youtubeVideoId}
                            ref={iframeRef}
                            src={`https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0&modestbranding=1`}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            title="YouTube video player"
                            onLoad={() => {
                                setPlayerReady(true);
                                // Ask YouTube to send currentTime updates every 500ms
                                iframeRef.current?.contentWindow?.postMessage(
                                    JSON.stringify({ event: 'listening' }),
                                    '*'
                                );
                            }}
                        />
                    ) : isUploaded && localVideoUrl ? (
                        <video
                            ref={videoRef}
                            src={localVideoUrl}
                            className="w-full h-full object-contain bg-black"
                            controls
                            onTimeUpdate={() => {
                                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                            }}
                        />
                    ) : isUploaded ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 text-white p-4">
                            <FolderOpen className="h-8 w-8 text-[hsl(var(--primary))]" />
                            <p className="text-xs text-center opacity-80">Select your video file</p>
                            <label className="cursor-pointer bg-pink-500 hover:bg-pink-400 text-white rounded-lg px-4 py-1.5 text-xs font-medium transition-all">
                                <input type="file" accept="video/*,audio/*" onChange={handleLocalVideoSelect} className="hidden" />
                                Choose File
                            </label>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            {isFailed ? (
                                <AlertCircle className="h-10 w-10 text-red-500 opacity-80" />
                            ) : (
                                <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                            )}
                            <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                                {isFailed ? 'Error loading video' : 'Loading player...'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Transcript Panel — fills remaining height, scrolls internally */}
                <div className="glass-panel rounded-xl flex flex-col min-h-0 flex-1 overflow-hidden">
                    {/* Transcript header + search + language */}
                    <div className="p-4 border-b border-[hsl(var(--border))] flex flex-col gap-3 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-on-surface flex items-center gap-2">
                                <span className="material-symbols-outlined text-pink-500 text-lg">description</span>
                                Transcript
                            </h2>
                            {hasTranscript && (
                                <button
                                    onClick={copyTranscript}
                                    className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))] transition"
                                    title="Copy all transcript text"
                                >
                                    {copiedTranscript ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search transcript..."
                                    className={`w-full bg-surface-container-highest/50 border-none rounded-lg py-2 pl-9 text-sm text-on-surface focus:ring-2 focus:ring-pink-500/50 placeholder-slate-500 transition-all duration-300 ${searchQuery ? 'pr-28' : 'pr-4'}`}
                                />
                                {searchQuery && (
                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                                        <span className="text-[10px] text-slate-500 font-mono px-1 tabular-nums">
                                            {filteredTranscript.length > 0 ? `${matchIndex + 1}/${filteredTranscript.length}` : '0/0'}
                                        </span>
                                        <button
                                            onClick={() => setMatchIndex(i => Math.max(0, i - 1))}
                                            disabled={matchIndex === 0 || filteredTranscript.length === 0}
                                            className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 transition"
                                            title="Previous match"
                                        >
                                            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => setMatchIndex(i => Math.min(filteredTranscript.length - 1, i + 1))}
                                            disabled={matchIndex >= filteredTranscript.length - 1 || filteredTranscript.length === 0}
                                            className="p-0.5 rounded hover:bg-white/10 disabled:opacity-30 transition"
                                            title="Next match"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                        </button>
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                                            title="Clear search"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Language Dropdown */}
                            {hasTranscript && isReady && (
                                <div className="relative flex-shrink-0" ref={langMenuRef}>
                                    <button
                                        onClick={() => setShowLangMenu(!showLangMenu)}
                                        disabled={translating}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-highest/50 px-3 py-2 text-sm hover:bg-white/10 transition disabled:opacity-50 whitespace-nowrap h-full"
                                    >
                                        {translating ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Languages className="h-3.5 w-3.5" />
                                        )}
                                        <span className="max-w-[80px] truncate">
                                            {isTranslated
                                                ? LANGUAGES.find(l => l.code === session.metadata?.translatedTo)?.label || 'Translated'
                                                : session.metadata?.language
                                                    ? `${session.metadata.language.charAt(0).toUpperCase() + session.metadata.language.slice(1)} (Auto)`
                                                    : 'Lang'}
                                        </span>
                                        <ChevronDown className="h-3 w-3" />
                                    </button>

                                    <AnimatePresence>
                                        {showLangMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                                transition={{ duration: 0.12 }}
                                                className="absolute top-full right-0 mt-1 z-50 w-48 max-h-64 overflow-y-auto rounded-xl border border-[hsl(var(--border))] bg-surface-bright shadow-xl"
                                            >
                                                {isTranslated && (
                                                    <button
                                                        onClick={handleRestoreOriginal}
                                                        className="w-full text-left px-3 py-2 text-sm text-[hsl(var(--primary))] font-medium hover:bg-white/10 transition flex items-center gap-2 border-b border-[hsl(var(--border))]"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Restore Original
                                                    </button>
                                                )}
                                                {LANGUAGES.map(lang => (
                                                    <button
                                                        key={lang.code}
                                                        onClick={() => handleTranslate(lang.code)}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition ${
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

                    {/* Scrollable transcript body */}
                    <div ref={transcriptContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                        {isProcessing ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4">
                                <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--primary))]" />
                                <div className="text-center">
                                    <p className="text-sm font-medium">
                                        {session.status === 'processing' ? 'Preparing transcription...' : 'Transcribing video...'}
                                    </p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">This may take a minute.</p>
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
                            <div className="space-y-1">
                                {filteredTranscript.map((seg, idx) => {
                                    const active = isActiveSegment(seg);
                                    const isActiveMatch = !!searchQuery.trim() && idx === matchIndex;
                                    const segAnnotations = annotations.filter(a =>
                                        a.startTimestamp !== undefined &&
                                        Math.abs(a.startTimestamp - seg.start) < 1
                                    );
                                    return (
                                        <div key={`${seg.start}-${idx}`} className="group">
                                            <div
                                                ref={el => {
                                                    if (el) segmentRefsMap.current.set(seg.start, el);
                                                    else segmentRefsMap.current.delete(seg.start);
                                                }}
                                                data-match-idx={idx}
                                                onClick={() => seekTo(seg.start)}
                                                className={`flex gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200 relative ${
                                                    active
                                                        ? 'bg-pink-500/10 border-l-2 border-pink-500 shadow-[0_0_15px_rgba(219,39,119,0.1)]'
                                                        : isActiveMatch
                                                            ? 'bg-yellow-500/10 border-l-2 border-yellow-500/60 shadow-[0_0_12px_rgba(234,179,8,0.08)]'
                                                            : 'hover:bg-white/5 border-l-2 border-transparent'
                                                }`}
                                            >
                                                <span className={`flex-shrink-0 font-mono text-sm w-12 pt-0.5 ${
                                                    active ? 'text-[hsl(var(--primary))] font-bold' : isActiveMatch ? 'text-yellow-400 font-semibold' : 'text-secondary'
                                                }`}>
                                                    {formatTime(seg.start)}
                                                </span>
                                                <span className={`flex-1 text-sm transition-colors ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                    {renderHighlightedText(seg.text, searchQuery)}
                                                </span>
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

                                            {segAnnotations.map(ann => (
                                                <div key={ann._id} className="ml-16 mt-1 mb-2 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-sm">
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

                                            {showAnnotationPopup?.segIdx === idx && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="ml-16 mt-2 mb-2 rounded-xl border border-[hsl(var(--border))] bg-surface p-3 shadow-lg"
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
                                                            className="flex-1 bg-surface-container-highest border border-none rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500/50 text-white"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleAddAnnotation(seg.start)}
                                                            disabled={!annotationNote.trim()}
                                                            className="bg-pink-500 text-white rounded-lg px-3 py-2 text-sm disabled:opacity-40 hover:bg-pink-400"
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setShowAnnotationPopup(null)}
                                                            className="p-2 rounded-lg hover:bg-white/10 text-[hsl(var(--muted-foreground))]"
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

                    {/* Transcript footer */}
                    {hasTranscript && (
                        <div className="border-t border-[hsl(var(--border))] px-4 py-3 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))] bg-surface-container-highest/20 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <Type className="h-3.5 w-3.5" />
                                    {wordCount.toLocaleString()} words
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Hash className="h-3.5 w-3.5" />
                                    {charCount.toLocaleString()} chars
                                </span>
                            </div>
                            <button
                                onClick={() => setAutoScroll(!autoScroll)}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition uppercase tracking-widest font-bold text-[10px] ${
                                    autoScroll
                                        ? 'text-pink-400 bg-pink-500/10'
                                        : 'hover:text-white'
                                }`}
                            >
                                {autoScroll ? 'Auto-Sync Active' : 'Auto-Sync Off'}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* RIGHT COLUMN: Info card + Notes list + Actions + Chat */}
            <section className="lg:col-span-7 flex flex-col gap-4 pb-24">

                {/* Info Card */}
                <div className="glass-panel p-5 rounded-xl flex flex-col gap-3 flex-shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {isEditingTitle ? (
                            <input
                                autoFocus
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onBlur={handleUpdateTitle}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                                className="text-xl font-bold font-headline tracking-tight text-on-surface bg-transparent border-b border-[hsl(var(--primary))] outline-none px-1 py-0.5 flex-1"
                            />
                        ) : (
                            <h1
                                onClick={() => { setEditedTitle(session.title); setIsEditingTitle(true); }}
                                className="text-xl font-bold font-headline tracking-tight text-on-surface hover:text-[hsl(var(--primary))] cursor-pointer transition-colors flex items-center gap-2 group/title"
                                title="Click to edit"
                            >
                                {session.title}
                                <Edit2 className="h-4 w-4 opacity-0 group-hover/title:opacity-100 transition-opacity text-[hsl(var(--primary))]" />
                            </h1>
                        )}
                        {/* Status + Share inline */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {!isShared ? (
                                <button
                                    onClick={handleShareSession}
                                    disabled={sharing || !isReady}
                                    className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-300 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                                    {sharing ? 'Sharing...' : 'Share'}
                                </button>
                            ) : (
                                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                                    <Link className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                                    <span className="text-xs text-emerald-300 max-w-[120px] truncate font-mono">{shareUrl}</span>
                                    <button onClick={handleCopyShareUrl} className="p-0.5 rounded hover:bg-emerald-500/20 transition">
                                        {copiedShare ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-emerald-400" />}
                                    </button>
                                    <button onClick={handleRevokeShare} className="p-0.5 rounded hover:bg-red-500/20 transition text-slate-500 hover:text-red-400">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide border ${
                                session.status === 'ready'
                                    ? 'bg-secondary-container/20 text-secondary border-secondary/20'
                                    : session.status === 'failed'
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1 border-t border-[hsl(var(--border))]/50">
                        {session.videoType === 'youtube' && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-black/20 px-2 py-1 rounded-md">
                                <Youtube className="h-3 w-3 text-red-500" />
                                <span>YouTube</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs border border-[hsl(var(--border))] text-slate-400 px-2 py-1 rounded-md">
                            <Clock className="h-3 w-3" />
                            <span>
                                {session.duration
                                    ? `${Math.floor(session.duration / 60)}:${(session.duration % 60).toString().padStart(2, '0')}`
                                    : 'Unknown length'}
                            </span>
                        </div>
                        {session.metadata?.language && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 px-2 py-1 rounded-md bg-black/20">
                                <Globe2 className="h-3 w-3 text-[hsl(var(--primary))]" />
                                <span className="uppercase">{session.metadata.language}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    {ACTION_BUTTONS.map(({ type, label, icon: Icon }) => (
                        <button
                            key={type}
                            onClick={() => {
                                const existing = notes.find(n => n.type === type && n.persona === selectedPersona);
                                if (existing) {
                                    setActiveNote(existing);
                                } else {
                                    generateNote(type);
                                }
                            }}
                            disabled={generating !== null || !isReady || !hasTranscript}
                            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary-container to-primary text-white font-bold shadow-[0_0_20px_rgba(219,39,119,0.2)] hover:shadow-[0_0_30px_rgba(219,39,119,0.4)] active:scale-95 transition-all duration-300 group disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                            <span className="flex items-center gap-3">
                                {generating === type ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Icon className="h-5 w-5" />
                                )}
                                {generating === type ? `Generating ${label}...` : label}
                            </span>
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    ))}
                    {generating && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-xs text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 rounded-lg px-3 py-2 mt-[-8px] justify-center"
                        >
                            <Sparkles className="h-3 w-3 animate-pulse" />
                            AI is generating your {generating.replace('_', ' ')}...
                        </motion.div>
                    )}
                </div>

                {/* Advanced Note Generation Options */}
                <div className="bg-surface-container-highest/30 border border-pink-900/20 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowAdvancedOptions(show => !show)}
                        className="w-full flex items-center justify-between p-3.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-slate-300">
                            <Settings2 className="h-4 w-4 text-pink-400" />
                            Advanced Options
                            {(selectedPersona !== 'detailed' || topicFocus || noteStartTime || noteEndTime) && (
                                <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded-full font-bold">Active</span>
                            )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showAdvancedOptions && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-2 border-t border-pink-900/20 space-y-3">

                                    {/* Persona */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Persona</label>
                                        <select
                                            value={selectedPersona}
                                            onChange={e => setSelectedPersona(e.target.value)}
                                            className="w-full bg-surface-container-highest/80 border border-pink-900/20 rounded-lg py-2 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition"
                                        >
                                            {PERSONAS.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Custom prompt — only shown when persona=custom */}
                                    {selectedPersona === 'custom' && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Custom Instructions</label>
                                            <textarea
                                                value={customPromptText}
                                                onChange={e => setCustomPromptText(e.target.value)}
                                                placeholder="e.g. Focus only on code examples and technical implementation..."
                                                rows={3}
                                                className="w-full bg-surface-container-highest/80 border border-pink-900/20 rounded-lg py-2 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-pink-500/50 resize-none transition placeholder-slate-600"
                                            />
                                        </div>
                                    )}

                                    {/* Topic Focus */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Topic Focus</label>
                                        <input
                                            type="text"
                                            value={topicFocus}
                                            onChange={e => setTopicFocus(e.target.value)}
                                            placeholder="e.g. React hooks, neural networks..."
                                            className="w-full bg-surface-container-highest/80 border border-pink-900/20 rounded-lg py-2 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition placeholder-slate-600"
                                        />
                                    </div>

                                    {/* Time Range */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Time Range (MM:SS)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={noteStartTime}
                                                onChange={e => setNoteStartTime(e.target.value)}
                                                placeholder="00:00"
                                                className="flex-1 bg-surface-container-highest/80 border border-pink-900/20 rounded-lg py-2 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-mono transition placeholder-slate-600"
                                            />
                                            <span className="text-slate-600 text-xs font-medium">to</span>
                                            <input
                                                type="text"
                                                value={noteEndTime}
                                                onChange={e => setNoteEndTime(e.target.value)}
                                                placeholder="end"
                                                className="flex-1 bg-surface-container-highest/80 border border-pink-900/20 rounded-lg py-2 px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-mono transition placeholder-slate-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Reset link */}
                                    {(selectedPersona !== 'detailed' || topicFocus || noteStartTime || noteEndTime || customPromptText) && (
                                        <button
                                            onClick={() => {
                                                setSelectedPersona('detailed');
                                                setCustomPromptText('');
                                                setTopicFocus('');
                                                setNoteStartTime('');
                                                setNoteEndTime('');
                                            }}
                                            className="text-xs text-slate-600 hover:text-pink-400 transition-colors"
                                        >
                                            ↩ Reset to defaults
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Batch Generate Panel */}
                <div className="bg-surface-container-highest/30 border border-pink-900/20 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setShowBatchPanel(show => !show)}
                        className="w-full flex items-center justify-between p-3.5 text-sm font-semibold hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-2 text-slate-300">
                            <SquareStack className="h-4 w-4 text-pink-400" />
                            Batch Generate
                            {batchSelected.size > 0 && (
                                <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded-full font-bold">{batchSelected.size} selected</span>
                            )}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showBatchPanel ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showBatchPanel && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-4 pt-2 border-t border-pink-900/20 space-y-3">
                                    <p className="text-xs text-slate-500">Select note types to generate all at once using your current Advanced Options settings.</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ACTION_BUTTONS.map(({ type, label, icon: Icon }) => {
                                            const sel = batchSelected.has(type);
                                            const status = batchStatus[type];
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setBatchSelected(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(type)) next.delete(type); else next.add(type);
                                                            return next;
                                                        });
                                                    }}
                                                    disabled={batchRunning}
                                                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                                                        sel
                                                            ? 'bg-pink-500/15 border-pink-500/40 text-pink-300'
                                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                                                    } disabled:cursor-not-allowed`}
                                                >
                                                    {status === 'running' ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-400" />
                                                    ) : status === 'done' ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                    ) : status === 'error' ? (
                                                        <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                                    ) : (
                                                        <Icon className="h-3.5 w-3.5" />
                                                    )}
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleBatchGenerate}
                                            disabled={batchSelected.size === 0 || batchRunning || !isReady || !hasTranscript}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white text-sm font-bold shadow-lg hover:shadow-pink-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                            {batchRunning ? 'Generating...' : `Generate ${batchSelected.size || 'Selected'}`}
                                        </button>
                                        {batchSelected.size > 0 && !batchRunning && (
                                            <button
                                                onClick={() => { setBatchSelected(new Set()); setBatchStatus({}); }}
                                                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-500 hover:text-white text-xs transition"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Download Report */}
                <button
                    onClick={handleDownloadReport}
                    disabled={!isReady || !hasTranscript}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-surface-container-highest/50 border border-pink-900/20 text-on-surface/80 font-semibold hover:bg-pink-500/10 hover:border-pink-500/30 hover:text-pink-300 active:scale-95 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <FileDown className="h-4 w-4" />
                    Download Full Report (PDF)
                </button>

                {/* Generated Notes — collapsible, bottom of right column */}
                {notes.length > 0 && (
                    <div className="glass-panel rounded-xl overflow-hidden flex-shrink-0">
                        <button
                            onClick={() => setShowNotesPanel(p => !p)}
                            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-[hsl(var(--primary))]" />
                                <span className="text-sm font-semibold">Generated Notes</span>
                                <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded-full font-bold">{notes.length}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${showNotesPanel ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                            {showNotesPanel && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="px-4 pb-4 border-t border-[hsl(var(--border))]/50 pt-3 space-y-2 max-h-56 overflow-y-auto">
                                        {notes.map(note => (
                                            <div
                                                key={note._id}
                                                onClick={() => setActiveNote(note)}
                                                className="group p-3 rounded-lg border border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/5 cursor-pointer transition-all text-sm flex gap-3 items-start"
                                            >
                                                <div className="mt-0.5 p-1.5 rounded bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                                                    {(() => { const Icon = ACTION_BUTTONS.find(a => a.type === note.type)?.icon ?? FileText; return <Icon className="h-3.5 w-3.5" />; })()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{note.title}</p>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate">
                                                        {note.type.replace('_', ' ')} &middot; {new Date(note.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteNote(note._id); }}
                                                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 text-[hsl(var(--muted-foreground))] transition-all"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            {/* Floating Chat FAB — fixed bottom-right */}
            <AnimatePresence>
                {!chatFloating && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                        onClick={() => setChatFloating(true)}
                        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full bg-gradient-to-r from-pink-600 to-rose-500 text-white font-bold shadow-[0_8px_32px_rgba(219,39,119,0.45)] hover:shadow-[0_8px_40px_rgba(219,39,119,0.65)] hover:scale-105 active:scale-95 transition-all duration-200"
                        title="Open AI Assistant"
                    >
                        <MessageSquare className="h-5 w-5" />
                        <span className="text-sm">AI Assistant</span>
                        {chatMessages.length > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-pink-600 text-[10px] font-black flex items-center justify-center shadow-md">
                                {chatMessages.length > 9 ? '9+' : chatMessages.length}
                            </span>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>
        </main>
        </>
    );

}



// ─── Chat Floating Modal ─────────────────────────────────────────

function ChatModal({
    messages, sending, input, isReady, onInputChange, onSend, onClear, onSeek, onClose,
}: {
    messages: ChatMessage[];
    sending: boolean;
    input: string;
    isReady: boolean;
    onInputChange: (v: string) => void;
    onSend: (e: React.FormEvent) => void;
    onClear: () => void;
    onSeek: (s: number) => void;
    onClose: () => void;
}) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-2xl h-[80vh] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl shadow-black/60 overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">AI Assistant</h3>
                            <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                                Online
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {messages.length > 0 && (
                            <button
                                onClick={onClear}
                                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                            >
                                <Eraser className="h-3 w-3" />
                                Clear
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/10 transition border border-[hsl(var(--border))]"
                            title="Close (Esc)"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex h-full items-center justify-center opacity-40 flex-col gap-3">
                            <MessageSquare className="h-10 w-10 text-pink-400" />
                            <p className="text-sm text-center px-8">Ask the AI anything about this video's transcript</p>
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg._id} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`py-2.5 px-4 rounded-2xl text-sm max-w-[85%] border ${
                                msg.role === 'user'
                                    ? 'bg-slate-800/80 text-on-surface rounded-tr-none border-slate-700/50'
                                    : 'bg-pink-500/10 text-pink-100 rounded-tl-none border-pink-500/20 backdrop-blur-sm'
                            }`}>
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                </div>
                            </div>
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {msg.sources.map((src, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { onSeek(src.startTimestamp); onClose(); }}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-mono hover:bg-pink-500/40 transition"
                                        >
                                            {formatTime(src.startTimestamp)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {sending && (
                        <div className="flex items-start gap-2">
                            <div className="py-2.5 px-4 rounded-2xl rounded-tl-none border border-pink-500/20 bg-pink-500/10">
                                <div className="flex gap-1 items-center h-4">
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <form onSubmit={onSend} className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => onInputChange(e.target.value)}
                            placeholder="Ask anything about the video..."
                            disabled={!isReady}
                            autoFocus
                            className="w-full bg-surface-container-highest/50 border-none rounded-full py-3 pl-5 pr-12 text-sm text-on-surface focus:ring-2 focus:ring-pink-500/50 placeholder-slate-500 transition-all disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={sending || !input.trim() || !isReady}
                            className="absolute right-2 p-2 bg-pink-500 text-white rounded-full hover:bg-pink-400 active:scale-90 transition-all shadow-lg shadow-pink-500/20 disabled:opacity-50 disabled:grayscale"
                        >
                            {sending
                                ? <Loader2 className="h-5 w-5 animate-spin" />
                                : <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                            }
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}

// ─── Note Modal Overlay ──────────────────────────────────────────

function NoteModal({
    note, onClose, onExport, onSeek, onDelete, onUpdate, onRegenerate, isRegenerating,
}: {
    note: Note;
    onClose: () => void;
    onExport: (noteId: string, format: string) => void;
    onSeek: (seconds: number) => void;
    onDelete: (noteId: string) => void;
    onUpdate: (noteId: string, content: string) => Promise<void>;
    onRegenerate: () => void;
    isRegenerating: boolean;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(note.content);
    const [isSaving, setIsSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showStudyMode, setShowStudyMode] = useState(false);

    useEffect(() => {
        setEditContent(note.content);
        setIsEditing(false);
    }, [note.content]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSave = async () => {
        if (!editContent.trim()) return;
        setIsSaving(true);
        try {
            await onUpdate(note._id, editContent);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(note.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = () => {
        onDelete(note._id);
        onClose();
    };

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

    const NoteIcon = ACTION_BUTTONS.find(a => a.type === note.type)?.icon ?? FileText;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl shadow-black/60 overflow-hidden"
                ref={containerRef}
            >
                {showStudyMode && (
                    <FlashcardStudyMode note={note} onClose={() => setShowStudyMode(false)} />
                )}

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[hsl(var(--border))] flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex-shrink-0">
                            <NoteIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                            <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                {note.type.replace('_', ' ')} · {new Date(note.createdAt).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => { setIsEditing(false); setEditContent(note.content); }}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition disabled:opacity-50"
                                >
                                    <X className="h-3.5 w-3.5" /> Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white bg-[hsl(var(--primary))] hover:opacity-90 transition disabled:opacity-50 font-medium"
                                >
                                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>

                                <button
                                    onClick={onRegenerate}
                                    disabled={isRegenerating}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition disabled:opacity-50"
                                >
                                    {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                                    Regenerate
                                </button>

                                {note.type === 'flashcards' && (
                                    <button
                                        onClick={() => setShowStudyMode(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/20 hover:bg-pink-500/30 transition"
                                    >
                                        <GraduationCap className="h-3.5 w-3.5" /> Study Mode
                                    </button>
                                )}

                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition"
                                    title="Edit"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                {['md', 'html'].map(fmt => (
                                    <button
                                        key={fmt}
                                        onClick={() => onExport(note._id, fmt)}
                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
                                        title={`Export as .${fmt}`}
                                    >
                                        <Download className="h-3 w-3" />.{fmt}
                                    </button>
                                ))}

                                <button
                                    onClick={handleDelete}
                                    className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition"
                                    title="Delete"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-white hover:bg-white/10 transition ml-1 border border-[hsl(var(--border))]"
                                    title="Close (Esc)"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto px-8 py-6 ${isEditing ? 'flex flex-col' : ''}`}>
                    {isEditing ? (
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            disabled={isSaving}
                            className="flex-1 w-full bg-[hsl(var(--background))]/50 border border-[hsl(var(--border))] rounded-xl p-4 text-[hsl(var(--foreground))] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all min-h-[400px] disabled:opacity-50"
                            placeholder="Write your notes here in Markdown..."
                        />
                    ) : note.type === 'flashcards' && parseFlashcards(note.content).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parseFlashcards(note.content).map(card => (
                                <div key={card.id} className="bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] rounded-xl p-5 shadow-sm">
                                    <h4 className="font-bold text-pink-400 mb-2 text-sm uppercase tracking-wider">Q: {card.question}</h4>
                                    <div className="text-[hsl(var(--foreground))] text-sm leading-relaxed prose prose-sm prose-invert max-w-none">
                                        <ReactMarkdown>{card.answer}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
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
                                                        onClick={() => { onSeek(secs); onClose(); }}
                                                        className="text-[hsl(var(--accent))] hover:underline font-mono text-xs bg-[hsl(var(--accent))]/10 px-1.5 py-0.5 rounded"
                                                    >
                                                        {children}
                                                    </button>
                                                );
                                            }
                                            return <a href={href} target="_blank" rel="noopener" className="text-[hsl(var(--primary))] hover:text-[hsl(var(--accent))]">{children}</a>;
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
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}