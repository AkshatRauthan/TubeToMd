import { useEffect, useRef, useCallback } from 'react';
import type { Note } from '@/types';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { ArrowLeft, Download } from 'lucide-react';

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

interface NoteViewerProps {
    note: Note;
    onBack: () => void;
    onExport: (noteId: string, format: string) => void;
    onSeek: (seconds: number) => void;
}

export function NoteViewer({ note, onBack, onExport, onSeek }: NoteViewerProps) {
    const mermaidContainerRef = useRef<HTMLDivElement>(null);

    const renderMermaid = useCallback(async () => {
        if (!mermaidContainerRef.current) return;
        const mermaidBlocks = mermaidContainerRef.current.querySelectorAll('.mermaid-block');
        for (const block of mermaidBlocks) {
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
        if (note.mermaidCode) {
            renderMermaid();
        }
    }, [note.mermaidCode, renderMermaid]);

    const processContent = (content: string) => {
        return content.replace(
            /\[(\d+):(\d{2})\]/g,
            (_, mins, secs) => {
                const totalSeconds = parseInt(mins) * 60 + parseInt(secs);
                return `[${mins}:${secs}](timestamp:${totalSeconds})`;
            }
        );
    };

    return (
        <div className="h-full flex flex-col" ref={mermaidContainerRef}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
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
                            {note.type.replace('_', ' ')} &middot; {note.isEdited ? 'Edited' : 'Original'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {['md', 'html'].map((fmt) => (
                        <button
                            key={fmt}
                            onClick={() => onExport(note._id, fmt)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition"
                        >
                            <Download className="h-3 w-3" />
                            .{fmt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
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
                                return (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
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
