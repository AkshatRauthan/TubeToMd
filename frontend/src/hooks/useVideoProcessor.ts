import { useState, useCallback, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import api from '@/lib/api';
import type { ApiResponse } from '@/types';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512 MB
const MAX_DURATION = 3600; // 1 hour in seconds
const CHUNK_DURATION = 300; // 5 minutes in seconds

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface ProcessingState {
    /** Overall stage of the pipeline */
    stage:
        | 'idle'
        | 'loading-ffmpeg'
        | 'extracting-audio'
        | 'chunking'
        | 'uploading'
        | 'completing'
        | 'done'
        | 'error';
    /** Human-readable status message */
    message: string;
    /** 0-100 overall progress */
    progress: number;
    /** Number of chunks uploaded so far */
    chunksUploaded: number;
    /** Total number of chunks */
    totalChunks: number;
    /** Session ID (available after init) */
    sessionId: string | null;
    /** Error message if stage === 'error' */
    error: string | null;
}

const INITIAL_STATE: ProcessingState = {
    stage: 'idle',
    message: '',
    progress: 0,
    chunksUploaded: 0,
    totalChunks: 0,
    sessionId: null,
    error: null,
};

// ──────────────────────────────────────────────
// Singleton FFmpeg instance
// ──────────────────────────────────────────────

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

async function getFFmpeg(): Promise<FFmpeg> {
    if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

    ffmpegInstance = new FFmpeg();

    // Load FFmpeg WASM from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpegInstance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    ffmpegLoaded = true;
    return ffmpegInstance;
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useVideoProcessor() {
    const [state, setState] = useState<ProcessingState>(INITIAL_STATE);
    const abortRef = useRef(false);

    const update = (partial: Partial<ProcessingState>) =>
        setState((prev) => ({ ...prev, ...partial }));

    /**
     * Reset the processor to idle state.
     */
    const reset = useCallback(() => {
        abortRef.current = false;
        setState(INITIAL_STATE);
    }, []);

    /**
     * Abort the current processing pipeline.
     */
    const abort = useCallback(() => {
        abortRef.current = true;
        update({ stage: 'error', error: 'Cancelled by user' });
    }, []);

    /**
     * Main pipeline: validate → extract audio → chunk → upload → complete.
     * Returns the session ID on success, or null on failure.
     */
    const processVideo = useCallback(
        async (file: File, title?: string): Promise<string | null> => {
            abortRef.current = false;
            setState(INITIAL_STATE);

            try {
                // ── Validate ──
                if (file.size > MAX_FILE_SIZE) {
                    throw new Error(
                        `File too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max is 512 MB.`
                    );
                }

                // ── Load FFmpeg ──
                update({ stage: 'loading-ffmpeg', message: 'Loading FFmpeg...', progress: 5 });
                const ffmpeg = await getFFmpeg();
                if (abortRef.current) return null;

                // ── Write file to FFmpeg virtual FS ──
                update({
                    stage: 'extracting-audio',
                    message: 'Extracting audio from video...',
                    progress: 10,
                });
                const inputName = 'input' + getExtension(file.name);
                await ffmpeg.writeFile(inputName, await fetchFile(file));

                // ── Get duration ──
                // Extract a full audio file first (mono 16kHz WAV — optimal for Whisper)
                const audioName = 'audio.wav';
                await ffmpeg.exec([
                    '-i', inputName,
                    '-vn',              // no video
                    '-acodec', 'pcm_s16le',
                    '-ar', '16000',     // 16kHz
                    '-ac', '1',         // mono
                    '-y',
                    audioName,
                ]);
                if (abortRef.current) return null;

                // Probe duration from the extracted audio
                const audioData = await ffmpeg.readFile(audioName);
                const audioBlob = new Blob([new Uint8Array(audioData as Uint8Array)], { type: 'audio/wav' });
                const duration = await getAudioDuration(audioBlob);

                if (duration > MAX_DURATION) {
                    throw new Error(
                        `Video is too long (${Math.ceil(duration / 60)} min). Max is 60 min.`
                    );
                }

                // Free the original video from FFmpeg FS
                await ffmpeg.deleteFile(inputName);

                update({
                    stage: 'chunking',
                    message: 'Splitting audio into chunks...',
                    progress: 25,
                });

                // ── Calculate chunks ──
                const totalChunks = Math.ceil(duration / CHUNK_DURATION);

                // ── Init upload session on backend ──
                const initRes = await api.post<
                    ApiResponse<{ sessionId: string; totalChunks: number }>
                >('/sessions/upload/init', {
                    filename: file.name,
                    totalChunks,
                    title: title || file.name,
                    duration,
                });
                const sessionId = initRes.data.data.sessionId;

                update({
                    stage: 'uploading',
                    message: `Uploading 0/${totalChunks} chunks...`,
                    progress: 30,
                    totalChunks,
                    sessionId,
                });

                // ── Split & upload chunks ──
                // We split into WAV chunks, upload each, then delete from FS (GC).
                const CONCURRENCY = 3; // parallel uploads
                let uploaded = 0;

                // @ts-expect-error – used in the chunking loop below
                const uploadChunk = async (index: number) => {
                    if (abortRef.current) return;

                    const startSec = index * CHUNK_DURATION;
                    const chunkName = `chunk_${index}.wav`;

                    // Extract chunk from full audio
                    await ffmpeg.exec([
                        '-i', audioName,
                        '-ss', String(startSec),
                        '-t', String(CHUNK_DURATION),
                        '-acodec', 'pcm_s16le',
                        '-ar', '16000',
                        '-ac', '1',
                        '-y',
                        chunkName,
                    ]);

                    // Read chunk data
                    const chunkData = await ffmpeg.readFile(chunkName);
                    const chunkBlob = new Blob([new Uint8Array(chunkData as Uint8Array)], { type: 'audio/wav' });

                    // Delete chunk from FFmpeg FS immediately (garbage collection)
                    await ffmpeg.deleteFile(chunkName);

                    // Upload to backend
                    const formData = new FormData();
                    formData.append('chunk', chunkBlob, `chunk_${index}.wav`);
                    formData.append('session_id', sessionId);
                    formData.append('chunk_index', String(index));
                    formData.append('chunk_offset', String(startSec));

                    await api.post('/sessions/upload/chunk', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        timeout: 300000, // 5 min per chunk
                    });

                    uploaded++;
                    const progressPct = 30 + Math.round((uploaded / totalChunks) * 60);
                    update({
                        chunksUploaded: uploaded,
                        message: `Uploading ${uploaded}/${totalChunks} chunks...`,
                        progress: progressPct,
                    });
                };

                // Process chunks with concurrency limit
                // We need sequential FFmpeg operations (single-threaded WASM),
                // but can parallelise the network upload part.
                // Strategy: extract sequentially, upload in parallel batches.
                const chunkBlobs: { index: number; blob: Blob; startSec: number }[] = [];

                for (let i = 0; i < totalChunks; i++) {
                    if (abortRef.current) return null;

                    const startSec = i * CHUNK_DURATION;
                    const chunkName = `chunk_${i}.wav`;

                    await ffmpeg.exec([
                        '-i', audioName,
                        '-ss', String(startSec),
                        '-t', String(CHUNK_DURATION),
                        '-acodec', 'pcm_s16le',
                        '-ar', '16000',
                        '-ac', '1',
                        '-y',
                        chunkName,
                    ]);

                    const chunkData = await ffmpeg.readFile(chunkName);
                    const chunkBlob = new Blob([new Uint8Array(chunkData as Uint8Array)], { type: 'audio/wav' });
                    await ffmpeg.deleteFile(chunkName); // GC from FFmpeg FS

                    chunkBlobs.push({ index: i, blob: chunkBlob, startSec });

                    update({
                        message: `Preparing chunks... ${i + 1}/${totalChunks}`,
                        progress: 25 + Math.round(((i + 1) / totalChunks) * 10),
                    });
                }

                // Delete full audio from FFmpeg FS (GC)
                await ffmpeg.deleteFile(audioName);

                // Upload chunks in parallel batches
                update({
                    stage: 'uploading',
                    message: `Uploading 0/${totalChunks} chunks...`,
                    progress: 35,
                });

                for (let batch = 0; batch < chunkBlobs.length; batch += CONCURRENCY) {
                    if (abortRef.current) return null;

                    const batchItems = chunkBlobs.slice(batch, batch + CONCURRENCY);
                    await Promise.all(
                        batchItems.map(async ({ index, blob, startSec }) => {
                            const formData = new FormData();
                            formData.append('chunk', blob, `chunk_${index}.wav`);
                            formData.append('session_id', sessionId);
                            formData.append('chunk_index', String(index));
                            formData.append('chunk_offset', String(startSec));

                            await api.post('/sessions/upload/chunk', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                                timeout: 300000,
                            });

                            uploaded++;
                            const pct = 35 + Math.round((uploaded / totalChunks) * 55);
                            update({
                                chunksUploaded: uploaded,
                                message: `Transcribing ${uploaded}/${totalChunks} chunks...`,
                                progress: pct,
                            });
                        })
                    );

                    // GC: release blob references after upload
                    batchItems.forEach((item) => {
                        (item as any).blob = null;
                    });
                }

                if (abortRef.current) return null;

                // ── Complete ──
                update({
                    stage: 'completing',
                    message: 'Merging transcriptions and generating embeddings...',
                    progress: 92,
                });

                await api.post('/sessions/upload/complete', { session_id: sessionId });

                update({
                    stage: 'done',
                    message: 'Processing complete!',
                    progress: 100,
                });

                return sessionId;
            } catch (err: any) {
                const msg = err.response?.data?.message || err.message || 'Processing failed';
                update({ stage: 'error', error: msg, message: msg });
                return null;
            }
        },
        []
    );

    return { state, processVideo, reset, abort };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot >= 0 ? filename.slice(dot) : '.mp4';
}

function getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(audio.duration);
        };
        audio.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to read audio duration'));
        };
        audio.src = url;
    });
}
