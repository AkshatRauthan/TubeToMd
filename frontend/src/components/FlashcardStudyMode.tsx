import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, RotateCcw } from 'lucide-react';
import type { Note } from '@/types';

export interface Flashcard {
    id: number;
    question: string;
    answer: string;
}

export function parseFlashcards(content: string): Flashcard[] {
    const cards: Flashcard[] = [];

    // Format 1: ## Card N\n**Q:** ...\n**A:** ...
    const cardSections = content.split(/##\s+Card\s+\d+/i).filter(Boolean);
    if (cardSections.length > 1) {
        cardSections.forEach((block, i) => {
            const qMatch = block.match(/\*\*Q:\*\*\s*([\s\S]+?)(?=\*\*A:\*\*)/);
            const aMatch = block.match(/\*\*A:\*\*\s*([\s\S]+?)(?=\n\n##|\n##|$)/);
            if (qMatch && aMatch) {
                cards.push({
                    id: i + 1,
                    question: qMatch[1].trim(),
                    answer: aMatch[1].trim().replace(/\n+$/, ''),
                });
            }
        });
    }

    // Format 2: inline Q/A pairs without card headers
    if (cards.length === 0) {
        const qaRegex = /\*\*Q:\*\*\s*([\s\S]+?)\s*\n\s*\*\*A:\*\*\s*([\s\S]+?)(?=\n\s*\n\s*\*\*Q:\*\*|\n\s*\*\*Q:\*\*|$)/g;
        let match;
        let id = 1;
        while ((match = qaRegex.exec(content)) !== null) {
            cards.push({ id: id++, question: match[1].trim(), answer: match[2].trim() });
        }
    }

    return cards;
}

export function FlashcardStudyMode({ note, onClose }: { note: Note; onClose: () => void }) {
    const allCards = parseFlashcards(note.content);
    const [order, setOrder] = useState<number[]>(() => allCards.map((_, i) => i));
    const [currentIdx, setCurrentIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [knownIds, setKnownIds] = useState<Set<number>>(new Set());

    const cards = order.map(i => allCards[i]).filter(Boolean);
    const currentCard = cards[currentIdx];
    const progress = cards.length > 1 ? (currentIdx / (cards.length - 1)) * 100 : 100;

    const next = useCallback(() => {
        if (currentIdx < cards.length - 1) {
            setCurrentIdx(i => i + 1);
            setFlipped(false);
        }
    }, [currentIdx, cards.length]);

    const prev = useCallback(() => {
        if (currentIdx > 0) {
            setCurrentIdx(i => i - 1);
            setFlipped(false);
        }
    }, [currentIdx]);

    const shuffle = useCallback(() => {
        setOrder(prev => [...prev].sort(() => Math.random() - 0.5));
        setCurrentIdx(0);
        setFlipped(false);
    }, []);

    const reset = useCallback(() => {
        setOrder(allCards.map((_, i) => i));
        setCurrentIdx(0);
        setFlipped(false);
        setKnownIds(new Set());
    }, [allCards]);

    const markKnown = useCallback(() => {
        if (currentCard) setKnownIds(prev => new Set([...prev, currentCard.id]));
        next();
    }, [currentCard, next]);

    if (allCards.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                <div className="bg-[#1a1f2f] border border-pink-900/30 rounded-2xl p-10 text-center max-w-sm mx-4 shadow-2xl">
                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                        Could not parse any flashcards from this note. Make sure the note was generated using the <span className="text-pink-400 font-semibold">Flash Cards</span> type.
                    </p>
                    <button onClick={onClose} className="px-6 py-2.5 bg-pink-500 hover:bg-pink-400 text-white rounded-xl font-semibold transition-all">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#0b0f1e] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Notes
                </button>

                <div className="text-center">
                    <h2 className="font-bold text-sm text-white">{note.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        <span className="text-emerald-400 font-semibold">{knownIds.size}</span> known
                        {' · '}
                        <span className="text-slate-300 font-semibold">{cards.length - knownIds.size}</span> to review
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={shuffle}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Shuffle cards"
                    >
                        <Shuffle className="h-4 w-4" />
                    </button>
                    <button
                        onClick={reset}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Reset progress"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5">
                <motion.div
                    className="h-full bg-gradient-to-r from-pink-600 to-rose-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            </div>

            {/* Card count */}
            <p className="text-center text-sm text-slate-500 py-3">
                Card <span className="text-white font-bold">{currentIdx + 1}</span> of <span className="text-white font-bold">{cards.length}</span>
            </p>

            {/* Card Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 gap-6">
                <div style={{ perspective: '1200px' }} className="w-full max-w-2xl">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`card-${currentIdx}-${order[currentIdx]}`}
                            initial={{ opacity: 0, x: 60, scale: 0.96 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -60, scale: 0.96 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            <div
                                className="relative w-full cursor-pointer select-none"
                                style={{ height: '300px' }}
                                onClick={() => setFlipped(f => !f)}
                            >
                                <motion.div
                                    style={{
                                        transformStyle: 'preserve-3d',
                                        width: '100%',
                                        height: '100%',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                    }}
                                    animate={{ rotateY: flipped ? 180 : 0 }}
                                    transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                                >
                                    {/* Front — Question */}
                                    <div
                                        style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2f] border border-pink-900/30 rounded-2xl p-8 shadow-2xl"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-pink-400/60 mb-6">Question</span>
                                        <p className="text-xl font-semibold text-center text-white leading-relaxed">
                                            {currentCard?.question}
                                        </p>
                                        <span className="text-xs text-slate-600 mt-8 select-none">Click to reveal answer</span>
                                    </div>

                                    {/* Back — Answer */}
                                    <div
                                        style={{
                                            backfaceVisibility: 'hidden',
                                            WebkitBackfaceVisibility: 'hidden',
                                            transform: 'rotateY(180deg)',
                                        }}
                                        className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d1f17] border border-emerald-900/30 rounded-2xl p-8 shadow-2xl"
                                    >
                                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400/60 mb-6">Answer</span>
                                        <div className="text-lg text-center text-slate-200 leading-relaxed overflow-y-auto max-h-48 w-full">
                                            {currentCard?.answer}
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Action buttons — shown after flipping */}
                <AnimatePresence>
                    {flipped && (
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 14 }}
                            transition={{ duration: 0.2 }}
                            className="flex items-center gap-3"
                        >
                            <button
                                onClick={() => { setFlipped(false); next(); }}
                                className="px-6 py-2.5 rounded-xl bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25 font-semibold text-sm transition-all"
                            >
                                Still Learning
                            </button>
                            <button
                                onClick={markKnown}
                                className="px-6 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 font-semibold text-sm transition-all"
                            >
                                ✓ Got It!
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation footer */}
            <div className="flex items-center justify-between px-8 py-4 border-t border-white/5">
                <button
                    onClick={prev}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </button>

                {/* Dot indicators */}
                <div className="flex gap-1.5 items-center max-w-xs overflow-hidden">
                    {cards.slice(0, 25).map((card, i) => (
                        <button
                            key={i}
                            onClick={() => { setCurrentIdx(i); setFlipped(false); }}
                            className={`rounded-full transition-all duration-300 flex-shrink-0 ${
                                i === currentIdx
                                    ? 'w-5 h-2.5 bg-pink-500'
                                    : knownIds.has(card.id)
                                        ? 'w-2 h-2 bg-emerald-500/70'
                                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                            }`}
                        />
                    ))}
                    {cards.length > 25 && (
                        <span className="text-xs text-slate-500 ml-1">+{cards.length - 25}</span>
                    )}
                </div>

                <button
                    onClick={next}
                    disabled={currentIdx >= cards.length - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-medium"
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
