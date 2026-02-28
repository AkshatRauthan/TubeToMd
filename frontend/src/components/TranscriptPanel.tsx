import { useRef, useEffect } from 'react';
import type { TranscriptSegment } from '@/types';

interface TranscriptPanelProps {
    transcript: TranscriptSegment[];
    currentTime: number;
    onSeek: (seconds: number) => void;
}

export function TranscriptPanel({ transcript, currentTime, onSeek }: TranscriptPanelProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activeRef.current && containerRef.current) {
            activeRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentTime]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isActive = (seg: TranscriptSegment) => {
        return currentTime >= seg.start && currentTime < seg.start + seg.duration;
    };

    if (transcript.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
                No transcript available
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-full overflow-y-auto p-4 space-y-0.5">
            {transcript.map((seg, idx) => {
                const active = isActive(seg);
                return (
                    <div
                        key={idx}
                        ref={active ? activeRef : undefined}
                        onClick={() => onSeek(seg.start)}
                        className={`flex gap-3 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 text-sm ${
                            active
                                ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--foreground))] border-l-2 border-[hsl(var(--primary))]'
                                : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] border-l-2 border-transparent'
                        }`}
                    >
                        <span className={`flex-shrink-0 font-mono text-xs w-10 pt-0.5 ${
                            active ? 'text-[hsl(var(--accent))]' : 'text-[hsl(var(--primary))]/60'
                        }`}>
                            {formatTime(seg.start)}
                        </span>
                        <span className="flex-1">{seg.text}</span>
                    </div>
                );
            })}
        </div>
    );
}
