import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Session } from '@/types';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';
import {
    Youtube,
    Upload,
    Loader2,
    Trash2,
    ExternalLink,
    Clock,
    AlertCircle,
    CheckCircle,
    X,
    Plus,
    Video,
    Sparkles,
    Download,
} from 'lucide-react';

const POLL_INTERVAL = 4000;

export function DashboardPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const { state: uploadState, processVideo, reset: resetUpload, abort: abortUpload } =
        useVideoProcessor();

    const fetchSessions = useCallback(async () => {
        console.log('[Dashboard] Fetching sessions...');
        try {
            const res = await api.get<ApiResponse<Session[]>>('/sessions');
            console.log(`[Dashboard] Fetched ${res.data.data.length} sessions`, res.data.data.map(s => ({ id: s._id, title: s.title, status: s.status })));
            setSessions(res.data.data);
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to fetch sessions';
            console.error(`[Dashboard] Failed to fetch sessions: ${msg}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    useEffect(() => {
        const hasProcessing = sessions.some(
            (s) => s.status === 'processing' || s.status === 'transcribing'
        );
        if (!hasProcessing) return;
        console.log('[Dashboard] Active processing sessions detected, starting poll interval');
        const interval = setInterval(fetchSessions, POLL_INTERVAL);
        return () => {
            console.log('[Dashboard] Clearing poll interval');
            clearInterval(interval);
        };
    }, [sessions, fetchSessions]);

    useEffect(() => {
        if (uploadState.stage === 'done' && uploadState.sessionId) {
            console.log('[Dashboard] Upload complete, sessionId:', uploadState.sessionId);
            toast.success('Upload complete! Session is being processed.');
            fetchSessions();
        }
        if (uploadState.stage !== 'idle') {
            console.log(`[Dashboard] Upload state: stage=${uploadState.stage}, progress=${uploadState.progress}%, chunks=${uploadState.chunksUploaded}/${uploadState.totalChunks}`, uploadState.error ? `error=${uploadState.error}` : '');
        }
    }, [uploadState.stage, uploadState.sessionId, uploadState.progress, uploadState.chunksUploaded, fetchSessions]);

    const handleYouTubeSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!youtubeUrl.trim()) return;
        console.log('[Dashboard] YouTube submit:', youtubeUrl);
        setCreating(true);
        setError('');

        try {
            // Check if session already exists for this URL
            const checkRes = await api.get<ApiResponse<Session | null>>('/sessions/find-by-url', {
                params: { videoUrl: youtubeUrl }
            });
            
            if (checkRes.data.data) {
                // Session exists, navigate to it
                toast.info('Video already processed! Opening existing session.');
                navigate(`/session/${checkRes.data.data._id}`);
                setYoutubeUrl('');
                return;
            }

            const res = await api.post<ApiResponse<Session>>('/sessions/youtube', {
                videoUrl: youtubeUrl,
            });
            console.log('[Dashboard] YouTube session created:', { id: res.data.data._id, title: res.data.data.title, status: res.data.data.status });
            setSessions((prev) => [res.data.data, ...prev]);
            setYoutubeUrl('');
            toast.success('YouTube session created!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to create session';
            console.error(`[Dashboard] YouTube session creation failed: ${msg}`);
            setError(msg);
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        console.log('[Dashboard] File selected:', { name: file.name, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, type: file.type });
        e.target.value = '';
        setError('');
        toast.info(`Processing ${file.name}...`);
        const sessionId = await processVideo(file, file.name);
        console.log('[Dashboard] File upload result, sessionId:', sessionId);
        if (sessionId) {
            await fetchSessions();
        }
    };

    const handleDelete = async (sessionId: string) => {
        if (!confirm('Delete this session and all its notes?')) return;
        console.log('[Dashboard] Deleting session:', sessionId);
        try {
            await api.delete(`/sessions/${sessionId}`);
            console.log('[Dashboard] Session deleted:', sessionId);
            setSessions((prev) => prev.filter((s) => s._id !== sessionId));
            toast.success('Session deleted');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to delete session';
            console.error(`[Dashboard] Failed to delete session: ${msg}`);
            toast.error(msg);
        }
    };

    const handleDownloadReport = async (sessionId: string, sessionTitle: string) => {
        toast.info('Generating report... This may take a moment.');
        try {
            const res = await api.get(`/sessions/${sessionId}/report`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, '_')}_Report.pdf`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Report downloaded!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to generate report';
            console.error(`[Dashboard] Download report failed: ${msg}`);
            toast.error(msg);
        }
    };

    const extractYouTubeId = (url?: string): string | null => {
        if (!url) return null;
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
    };

    const statusConfig = (status: Session['status']) => {
        switch (status) {
            case 'processing':
            case 'transcribing':
                return {
                    icon: <Loader2 className="h-4 w-4 animate-spin" />,
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10',
                    label: status === 'processing' ? 'Processing' : 'Transcribing',
                };
            case 'ready':
                return {
                    icon: <CheckCircle className="h-4 w-4" />,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-500/10',
                    label: 'Ready',
                };
            case 'failed':
                return {
                    icon: <AlertCircle className="h-4 w-4" />,
                    color: 'text-red-400',
                    bg: 'bg-red-500/10',
                    label: 'Failed',
                };
            default:
                return {
                    icon: <Clock className="h-4 w-4" />,
                    color: 'text-[hsl(var(--muted-foreground))]',
                    bg: 'bg-[hsl(var(--muted))]/50',
                    label: status,
                };
        }
    };

    const isUploading =
        uploadState.stage !== 'idle' &&
        uploadState.stage !== 'done' &&
        uploadState.stage !== 'error';

    const progressStages = ['loading-ffmpeg', 'extracting-audio', 'chunking', 'uploading', 'completing'];
    const currentStageIdx = progressStages.indexOf(uploadState.stage);

    return (
        <div className="mx-auto max-w-6xl px-6 py-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold">
                    <span className="text-gradient">Dashboard</span>
                </h1>
                <p className="mt-1 text-[hsl(var(--muted-foreground))]">
                    Paste a YouTube link or upload a video to get started
                </p>
            </motion.div>

            {/* Input Section */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-8 grid gap-6 md:grid-cols-2"
            >
                {/* YouTube URL */}
                <div className="card p-6 card-hover">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10">
                            <Youtube className="h-5 w-5 text-red-400" />
                        </div>
                        <h3 className="font-semibold">YouTube URL</h3>
                    </div>
                    <form onSubmit={handleYouTubeSubmit} className="flex gap-2">
                        <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                        />
                        <button
                            type="submit"
                            disabled={creating || !youtubeUrl.trim()}
                            className="btn-primary rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                        >
                            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
                        </button>
                    </form>
                </div>

                {/* File Upload */}
                <div className="card p-6 card-hover">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10">
                            <Upload className="h-5 w-5 text-[hsl(var(--primary))]" />
                        </div>
                        <h3 className="font-semibold">Upload Video</h3>
                    </div>

                    <AnimatePresence mode="wait">
                        {isUploading ? (
                            <motion.div
                                key="progress"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium flex items-center gap-2">
                                        <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--primary))] animate-pulse-soft" />
                                        {uploadState.message}
                                    </span>
                                    <button
                                        onClick={abortUpload}
                                        className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 transition"
                                        title="Cancel"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="relative h-2.5 w-full rounded-full bg-[hsl(var(--secondary))] overflow-hidden">
                                    <motion.div
                                        className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--primary))]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${uploadState.progress}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-1">
                                        {progressStages.map((stage, i) => (
                                            <div
                                                key={stage}
                                                className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                                                    i <= currentStageIdx
                                                        ? 'bg-[hsl(var(--primary))]'
                                                        : 'bg-[hsl(var(--secondary))]'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                                        {uploadState.totalChunks > 0 && (
                                            <span>{uploadState.chunksUploaded}/{uploadState.totalChunks} chunks</span>
                                        )}
                                        <span className="font-medium text-[hsl(var(--primary))]">
                                            {uploadState.progress}%
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="picker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[hsl(var(--border))] p-6 hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--primary))]/5 transition-all duration-300">
                                    <input
                                        type="file"
                                        accept="video/*,audio/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] group-hover:bg-[hsl(var(--primary))]/10 transition mb-2">
                                        <Video className="h-5 w-5 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition" />
                                    </div>
                                    <span className="text-sm text-[hsl(var(--muted-foreground))] text-center">
                                        Click to upload MP4, WebM, MKV, MP3, etc.
                                    </span>
                                    <span className="text-xs text-[hsl(var(--muted-foreground))]/60 mt-1">
                                        Max 512 MB &middot; Audio extracted in-browser
                                    </span>
                                </label>
                                {uploadState.stage === 'done' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2"
                                    >
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        Upload complete!
                                        {uploadState.sessionId && (
                                            <button
                                                onClick={() => navigate(`/session/${uploadState.sessionId}`)}
                                                className="underline hover:text-emerald-400 ml-auto"
                                            >
                                                Open session
                                            </button>
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
                {(error || uploadState.error) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 flex items-center justify-between rounded-xl bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 p-3 text-sm text-[hsl(var(--destructive))]"
                    >
                        <span>{error || uploadState.error}</span>
                        <button
                            onClick={() => { setError(''); resetUpload(); }}
                            className="text-xs underline hover:opacity-80"
                        >
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sessions List */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-10"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Your Sessions</h2>
                    {sessions.some((s) => s.status === 'processing' || s.status === 'transcribing') && (
                        <span className="flex items-center gap-1.5 text-xs text-amber-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Processing...
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--primary))]" />
                            <span className="text-sm text-[hsl(var(--muted-foreground))]">Loading sessions...</span>
                        </div>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="card p-12 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 mx-auto mb-4">
                            <Plus className="h-6 w-6 text-[hsl(var(--primary))]" />
                        </div>
                        <p className="text-[hsl(var(--muted-foreground))]">
                            No sessions yet. Create one above!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                        {sessions.map((session) => {
                            const status = statusConfig(session.status);
                            const videoId = extractYouTubeId(session.videoUrl);
                            const thumbnailUrl = session.thumbnailUrl || 
                                (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);
                            
                            return (
                                <motion.div
                                    key={session._id}
                                    layout
                                    className="card overflow-hidden card-hover group"
                                >
                                    {/* Thumbnail */}
                                    <div 
                                        className="relative aspect-video bg-[hsl(var(--secondary))] cursor-pointer"
                                        onClick={() => {
                                            if (session.status !== 'failed') {
                                                navigate(`/session/${session._id}`);
                                            }
                                        }}
                                    >
                                        {thumbnailUrl ? (
                                            <img 
                                                src={thumbnailUrl} 
                                                alt={session.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
                                            </div>
                                        )}
                                        
                                        {/* Status indicator */}
                                        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${status.bg} ${status.color} backdrop-blur-sm`}>
                                            {status.icon}
                                            <span>{status.label}</span>
                                        </div>
                                        
                                        {/* Duration badge */}
                                        {session.duration && (
                                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded text-xs font-medium">
                                                {Math.floor(session.duration / 60)}:{String(Math.floor(session.duration % 60)).padStart(2, '0')}
                                            </div>
                                        )}
                                        
                                        {/* Video type badge */}
                                        <div className={`absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium backdrop-blur-sm ${
                                            session.videoType === 'youtube'
                                                ? 'bg-red-500/80 text-white'
                                                : 'bg-blue-500/80 text-white'
                                        }`}>
                                            {session.videoType === 'youtube' ? (
                                                <Youtube className="h-3 w-3" />
                                            ) : (
                                                <Upload className="h-3 w-3" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 
                                            className="font-semibold text-sm line-clamp-2 cursor-pointer hover:text-[hsl(var(--primary))] transition"
                                            onClick={() => {
                                                if (session.status !== 'failed') {
                                                    navigate(`/session/${session._id}`);
                                                }
                                            }}
                                        >
                                            {session.title}
                                        </h3>
                                        <div className="mt-2 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                                            <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        
                                        {/* Action buttons */}
                                        <div className="mt-3 flex items-center gap-2">
                                            <button
                                                onClick={() => handleDownloadReport(session._id, session.title)}
                                                disabled={session.status !== 'ready'}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--primary))]/10 hover:text-[hsl(var(--primary))] transition text-sm font-medium disabled:opacity-40 disabled:hover:bg-[hsl(var(--secondary))] disabled:hover:text-[hsl(var(--foreground))]"
                                                title="Download complete report"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (session.status !== 'failed') {
                                                        navigate(`/session/${session._id}`);
                                                    }
                                                }}
                                                disabled={session.status === 'failed'}
                                                className="flex-1 btn-primary rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40"
                                            >
                                                Go to transcript
                                            </button>
                                            {session.videoUrl && (
                                                <a
                                                    href={session.videoUrl}
                                                    target="_blank"
                                                    rel="noopener"
                                                    className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] transition"
                                                    title="Open video"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <button
                                                onClick={() => handleDelete(session._id)}
                                                className="p-2 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10 transition"
                                                title="Delete session"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
