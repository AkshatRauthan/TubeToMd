import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApiResponse, Session } from '@/types';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';
import {
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
    Link as LinkIcon,
    ChevronRight,
    Search
} from 'lucide-react';

const POLL_INTERVAL = 4000;

export function DashboardPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [inputType, setInputType] = useState<'youtube' | 'upload'>('youtube');
    const [sessionSearch, setSessionSearch] = useState('');
    const navigate = useNavigate();

    const { state: uploadState, processVideo, reset: resetUpload, abort: abortUpload } =
        useVideoProcessor();

    const fetchSessions = useCallback(async () => {
        try {
            const res = await api.get<ApiResponse<Session[]>>('/sessions');
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
        const interval = setInterval(fetchSessions, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [sessions, fetchSessions]);

    useEffect(() => {
        if (uploadState.stage === 'done' && uploadState.sessionId) {
            toast.success('Upload complete! Session is being processed.');
            fetchSessions();
        }
    }, [uploadState.stage, uploadState.sessionId, uploadState.progress, uploadState.chunksUploaded, fetchSessions]);

    const handleYouTubeSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!youtubeUrl.trim()) return;
        setCreating(true);
        setError('');

        try {
            const checkRes = await api.get<ApiResponse<Session | null>>('/sessions/find-by-url', {
                params: { videoUrl: youtubeUrl }
            });
            
            if (checkRes.data.data) {
                toast.info('Video already processed! Opening existing session.');
                navigate(`/session/${checkRes.data.data._id}`);
                setYoutubeUrl('');
                return;
            }

            const res = await api.post<ApiResponse<Session>>('/sessions/youtube', {
                videoUrl: youtubeUrl,
            });
            setSessions((prev) => [res.data.data, ...prev]);
            setYoutubeUrl('');
            toast.success('YouTube session created!');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to create session';
            setError(msg);
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setError('');
        toast.info(`Processing ${file.name}...`);
        const sessionId = await processVideo(file, file.name);
        if (sessionId) {
            await fetchSessions();
        }
    };

    const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this session and all its notes?')) return;
        try {
            await api.delete(`/sessions/${sessionId}`);
            setSessions((prev) => prev.filter((s) => s._id !== sessionId));
            toast.success('Session deleted');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to delete session';
            toast.error(msg);
        }
    };

    const handleDownloadReport = async (sessionId: string, sessionTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
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
                    icon: <Loader2 className="h-3 w-3 animate-spin" />,
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/20',
                    label: status === 'processing' ? 'Processing' : 'Transcribing',
                };
            case 'ready':
                return {
                    icon: <CheckCircle className="h-3 w-3" />,
                    color: 'text-secondary',
                    bg: 'bg-secondary-container/20',
                    label: 'Ready',
                };
            case 'failed':
                return {
                    icon: <AlertCircle className="h-3 w-3" />,
                    color: 'text-error',
                    bg: 'bg-error-container/20',
                    label: 'Failed',
                };
            default:
                return {
                    icon: <Clock className="h-3 w-3" />,
                    color: 'text-on-surface-variant',
                    bg: 'bg-surface-container-highest/50',
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
        <main className="pt-32 pb-20 px-6 md:px-8 max-w-7xl mx-auto min-h-[calc(100vh-80px)]">
            {/* Header Section */}
            <header className="mb-12 relative">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-black tracking-tight text-on-surface mb-2 font-headline"
                >
                    Welcome back, Explorer
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-lg text-on-surface-variant/80 font-body"
                >
                    Ready to distill some knowledge today?
                </motion.p>
            </header>

            {/* Main Action Area (Hero Card) */}
            <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative mb-20"
            >
                <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(219,39,119,0.15)_0%,rgba(219,39,119,0)_70%)] blur-[40px] -z-10 -top-20 -left-20"></div>
                <div className="absolute w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(219,39,119,0.15)_0%,rgba(219,39,119,0)_70%)] blur-[40px] -z-10 -bottom-20 -right-20"></div>
                
                <div className="bg-surface-container/60 dark:bg-[#1a1f2f]/60 backdrop-blur-[20px] border border-outline-variant/15 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10">
                        <div>
                            <h2 className="text-3xl font-bold text-on-primary-container mb-2 font-headline">Create New Session</h2>
                            <p className="text-on-surface-variant/80">Convert complex videos into high-fidelity markdown notes instantly.</p>
                        </div>
                        <div className="flex bg-surface-container-highest/40 p-1 rounded-xl self-start">
                            <button 
                                onClick={() => setInputType('youtube')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${inputType === 'youtube' ? 'bg-primary-container text-white shadow-lg' : 'text-on-surface-variant hover:text-primary'}`}
                            >
                                YouTube URL
                            </button>
                            <button 
                                onClick={() => setInputType('upload')}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${inputType === 'upload' ? 'bg-primary-container text-white shadow-lg' : 'text-on-surface-variant hover:text-primary'}`}
                            >
                                Upload File
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <AnimatePresence mode="wait">
                            {inputType === 'youtube' ? (
                                <motion.form 
                                    key="youtube-form"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onSubmit={handleYouTubeSubmit} 
                                    className="space-y-6"
                                >
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-on-surface-variant/50">
                                            <LinkIcon className="h-6 w-6" />
                                        </div>
                                        <input 
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            className="w-full bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/50 rounded-xl py-5 pl-14 pr-6 text-lg placeholder:text-on-surface-variant/30 text-on-surface transition-all duration-300 shadow-inner" 
                                            placeholder="Paste YouTube URL here" 
                                            type="url"
                                            disabled={creating}
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            type="submit"
                                            disabled={creating || !youtubeUrl.trim()}
                                            className="px-10 py-4 rounded-xl bg-gradient-to-br from-primary-container to-primary text-on-primary font-bold text-lg flex items-center gap-3 hover:shadow-[0_0_25px_rgba(219,39,119,0.4)] transition-all duration-500 group disabled:opacity-50 disabled:hover:shadow-none"
                                        >
                                            {creating ? 'Processing...' : 'Process Video'}
                                            {creating ? (
                                                <Loader2 className="h-6 w-6 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                                            )}
                                        </button>
                                    </div>
                                </motion.form>
                            ) : (
                                <motion.div 
                                    key="upload-form"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    {isUploading ? (
                                        <div className="space-y-4 bg-surface-container-highest/30 rounded-xl p-8 border border-outline-variant/10">
                                            <div className="flex items-center justify-between text-lg">
                                                <span className="font-bold text-primary flex items-center gap-3">
                                                    <Sparkles className="h-5 w-5 animate-pulse" />
                                                    {uploadState.message}
                                                </span>
                                                <button
                                                    onClick={abortUpload}
                                                    className="p-2 rounded-lg text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition"
                                                    title="Cancel"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            </div>
                                            <div className="relative h-3 w-full rounded-full bg-surface-container overflow-hidden">
                                                <motion.div
                                                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary-container to-primary"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${uploadState.progress}%` }}
                                                    transition={{ duration: 0.3 }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <div className="flex gap-1.5">
                                                    {progressStages.map((stage, i) => (
                                                        <div
                                                            key={stage}
                                                            className={`h-1.5 w-6 rounded-full transition-all duration-300 ${
                                                                i <= currentStageIdx
                                                                    ? 'bg-primary'
                                                                    : 'bg-surface-container-highest'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <div className="flex gap-4 text-sm font-label text-on-surface-variant/70">
                                                    {uploadState.totalChunks > 0 && (
                                                        <span>{uploadState.chunksUploaded}/{uploadState.totalChunks} chunks</span>
                                                    )}
                                                    <span className="font-bold text-primary">
                                                        {uploadState.progress}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/30 py-16 px-6 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 bg-surface-container-highest/20">
                                            <input
                                                type="file"
                                                accept="video/*,audio/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                                disabled={isUploading}
                                            />
                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-container group-hover:bg-primary/10 transition-colors mb-4 shadow-lg">
                                                <Upload className="h-8 w-8 text-on-surface-variant/50 group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-lg font-bold text-on-surface text-center mb-2">
                                                Click to upload your file
                                            </span>
                                            <span className="text-sm font-label text-on-surface-variant/60">
                                                MP4, WebM, MKV, MP3 &middot; Max 512 MB &middot; Audio extracted locally
                                            </span>
                                        </label>
                                    )}
                                    {uploadState.stage === 'done' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 flex items-center justify-between font-label text-secondary bg-secondary-container/20 rounded-xl px-4 py-3 border border-secondary/20"
                                        >
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5" />
                                                <span>Upload complete! Generating notes...</span>
                                            </div>
                                            {uploadState.sessionId && (
                                                <button
                                                    onClick={() => navigate(`/session/${uploadState.sessionId}`)}
                                                    className="underline font-bold hover:text-white transition-colors"
                                                >
                                                    Open Session
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Error Handling */}
                        <AnimatePresence>
                            {(error || uploadState.error) && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-4 flex items-center justify-between rounded-xl bg-error-container/20 border border-error/20 p-4 font-label text-error">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle className="h-5 w-5" />
                                            <span>{error || uploadState.error}</span>
                                        </div>
                                        <button
                                            onClick={() => { setError(''); resetUpload(); }}
                                            className="p-1 hover:bg-error/20 rounded-md transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.section>

            {/* Recent Sessions */}
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold text-on-surface font-headline">Recent Sessions</h3>
                    {sessions.some((s) => s.status === 'processing' || s.status === 'transcribing') && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Processing Active
                        </span>
                    )}
                </div>

                {/* Session search bar */}
                {!loading && sessions.length > 0 && (
                    <div className="relative mb-6">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                        <input
                            type="text"
                            value={sessionSearch}
                            onChange={e => setSessionSearch(e.target.value)}
                            placeholder="Search sessions by title or URL..."
                            className="w-full bg-surface-container/60 dark:bg-[#1a1f2f]/60 border border-outline-variant/10 rounded-xl py-2.5 pl-10 pr-9 text-sm text-on-surface placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition-all"
                        />
                        {sessionSearch && (
                            <button
                                onClick={() => setSessionSearch('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <span className="text-on-surface-variant font-label">Loading your intelligence library...</span>
                        </div>
                    </div>
                ) : (sessions.length === 0 ? (
                    <div className="bg-surface-container/40 dark:bg-[#1a1f2f]/40 border border-outline-variant/10 rounded-2xl p-16 text-center shadow-lg">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                            <Plus className="h-10 w-10 text-primary" />
                        </div>
                        <h4 className="text-xl font-bold text-on-surface mb-2">No sessions yet</h4>
                        <p className="text-on-surface-variant">
                            Create your first session above by pasting a YouTube link or uploading a video.
                        </p>
                    </div>
                ) : (() => {
                    const filteredSessions = sessionSearch.trim()
                        ? sessions.filter(s =>
                            (s.title || '').toLowerCase().includes(sessionSearch.toLowerCase()) ||
                            (s.videoUrl || '').toLowerCase().includes(sessionSearch.toLowerCase())
                          )
                        : sessions;

                    if (filteredSessions.length === 0) {
                        return (
                            <div className="bg-surface-container/40 dark:bg-[#1a1f2f]/40 border border-outline-variant/10 rounded-2xl p-16 text-center shadow-lg">
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-500/10 mx-auto mb-4">
                                    <Search className="h-8 w-8 text-pink-400/50" />
                                </div>
                                <h4 className="text-lg font-bold text-on-surface mb-2">No sessions match</h4>
                                <p className="text-on-surface-variant text-sm">
                                    No sessions found for <span className="text-pink-400 font-medium">&ldquo;{sessionSearch}&rdquo;</span>.
                                </p>
                                <button
                                    onClick={() => setSessionSearch('')}
                                    className="mt-4 text-sm text-slate-500 hover:text-pink-400 transition-colors"
                                >
                                    Clear search
                                </button>
                            </div>
                        );
                    }

                    return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredSessions.map((session) => {
                            const status = statusConfig(session.status);
                            const videoId = extractYouTubeId(session.videoUrl);
                            const thumbnailUrl = session.thumbnailUrl || 
                                (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);
                            
                            return (
                                <motion.div
                                    key={session._id}
                                    layout
                                    className="bg-surface-container/60 dark:bg-[#1a1f2f]/60 backdrop-blur-md border border-outline-variant/10 rounded-xl overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(219,39,119,0.1)] transition-all duration-300 group cursor-pointer flex flex-col"
                                    onClick={() => {
                                        if (session.status !== 'failed') navigate(`/session/${session._id}`);
                                    }}
                                >
                                    <div className="aspect-video relative overflow-hidden bg-surface-container-high">
                                        {thumbnailUrl ? (
                                            <img 
                                                src={thumbnailUrl} 
                                                alt={session.title}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-surface-container-highest">
                                                <Video className="h-12 w-12 text-on-surface-variant/20" />
                                            </div>
                                        )}
                                        
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1322]/80 to-transparent opacity-60"></div>
                                        
                                        {session.duration && (
                                            <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white uppercase tracking-widest z-10">
                                                {Math.floor(session.duration / 60)}:{String(Math.floor(session.duration % 60)).padStart(2, '0')}
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                                session.videoType === 'youtube'
                                                    ? 'bg-secondary-container/20 text-secondary'
                                                    : 'bg-surface-container-highest/50 text-on-surface-variant'
                                            }`}>
                                                {session.videoType === 'youtube' ? 'YouTube' : 'Local'}
                                            </span>
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${status.bg} ${status.color}`}>
                                                {status.icon} {status.label}
                                            </span>
                                        </div>
                                        
                                        <h4 className="text-lg font-bold text-on-surface mb-2 line-clamp-2 group-hover:text-primary transition-colors pr-2 flex-1">
                                            {session.title || 'Untitled Session'}
                                        </h4>
                                        <p className="text-on-surface-variant/60 text-xs font-label uppercase tracking-wider mb-5">
                                            {new Date(session.createdAt).toLocaleDateString(undefined, {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })}
                                        </p>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-outline-variant/10">
                                            <div className="flex items-center gap-1">
                                                {session.videoUrl && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(session.videoUrl, '_blank', 'noopener');
                                                        }}
                                                        className="p-2 rounded-lg text-on-surface-variant/60 hover:text-white hover:bg-surface-container-highest transition-colors"
                                                        title="Open Source Video"
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => handleDownloadReport(session._id, session.title || 'Session', e)}
                                                    disabled={session.status !== 'ready'}
                                                    className="p-2 rounded-lg text-on-surface-variant/60 hover:text-white hover:bg-surface-container-highest transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title="Download Report"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(session._id, e)}
                                                    className="p-2 rounded-lg text-on-surface-variant/60 hover:text-error hover:bg-error-container/20 transition-colors"
                                                    title="Delete Session"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex -space-x-2 mr-2">
                                                <div className="w-7 h-7 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-primary">AI</div>
                                                <div className="w-7 h-7 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-secondary">MD</div>
                                                <ChevronRight className="h-5 w-5 ml-4 text-on-surface-variant/40 group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                    );
                })()
                )}
            </motion.section>
        </main>
    );
}

