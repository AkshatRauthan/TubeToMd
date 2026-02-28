import { useState, useRef, useEffect, type FormEvent } from 'react';
import api from '@/lib/api';
import type { ApiResponse, ChatMessage } from '@/types';
import { Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ChatPanelProps {
    sessionId: string;
    onSeek: (seconds: number) => void;
}

export function ChatPanel({ sessionId, onSeek }: ChatPanelProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchHistory();
    }, [sessionId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await api.get<ApiResponse<ChatMessage[]>>(`/chat/${sessionId}`);
            setMessages(res.data.data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || sending) return;

        const userMsg = input;
        setInput('');
        setSending(true);

        const tempUserMsg: ChatMessage = {
            _id: `temp-${Date.now()}`,
            sessionId,
            role: 'user',
            content: userMsg,
            createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            const res = await api.post<ApiResponse<ChatMessage>>(`/chat/${sessionId}`, {
                message: userMsg,
            });
            setMessages((prev) => [
                ...prev.filter((m) => m._id !== tempUserMsg._id),
                { ...tempUserMsg, _id: `sent-${Date.now()}` },
                res.data.data,
            ]);
        } catch {
            toast.error('Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const clearHistory = async () => {
        try {
            await api.delete(`/chat/${sessionId}`);
            setMessages([]);
            toast.success('Chat cleared');
        } catch {
            toast.error('Failed to clear history');
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border))]">
                <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-[hsl(var(--primary))]" />
                    Ask questions about the video
                </span>
                {messages.length > 0 && (
                    <button
                        onClick={clearHistory}
                        className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-[hsl(var(--destructive))]/10 transition"
                    >
                        <Trash2 className="h-3 w-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-[hsl(var(--primary))]" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 mx-auto mb-3">
                            <Sparkles className="h-5 w-5 text-[hsl(var(--primary))]" />
                        </div>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                            Ask anything about this video. AI will search the transcript and
                            provide answers with timestamp references.
                        </p>
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <motion.div
                                key={msg._id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                                        msg.role === 'user'
                                            ? 'bg-[hsl(var(--primary))] text-white rounded-br-sm'
                                            : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-bl-sm'
                                    }`}
                                >
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm prose-invert max-w-none">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}

                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {msg.sources.map((source, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => onSeek(source.startTimestamp)}
                                                    className="text-xs px-2 py-0.5 rounded-lg bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/25 transition font-mono"
                                                >
                                                    {formatTime(source.startTimestamp)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form
                onSubmit={sendMessage}
                className="border-t border-[hsl(var(--border))] p-4 flex gap-2"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about the video..."
                    className="flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--secondary))] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-all"
                />
                <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="btn-primary rounded-xl p-2.5 disabled:opacity-40 transition"
                >
                    {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </button>
            </form>
        </div>
    );
}
