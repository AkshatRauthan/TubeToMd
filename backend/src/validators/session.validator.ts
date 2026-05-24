import { z } from 'zod';

const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

export const createYouTubeSessionSchema = z.object({
    videoUrl: z.string().url('Invalid URL').regex(youtubeRegex, 'Must be a valid YouTube URL'),
    title: z.string().max(200).optional(),
    startTime: z.number().min(0).optional(),
    endTime: z.number().min(0).optional(),
});

import serverConfig from '@config/server.config';

export const initUploadSessionSchema = z.object({
    filename: z.string().min(1, 'filename is required'),
    totalChunks: z.number().int().min(1).max(120),
    title: z.string().max(200).optional(),
    duration: z.number().min(0).max(serverConfig.MAX_VIDEO_DURATION_SECONDS, `Video duration cannot exceed ${serverConfig.MAX_VIDEO_DURATION_SECONDS} seconds`).optional(),
    checksum: z.string().min(8, 'checksum is required for deduplication').max(128).optional(),
});

export const updateSessionSchema = z.object({
    title: z.string().min(1, 'Title cannot be empty').max(200).trim(),
});

export const translateSessionSchema = z.object({
    targetLanguage: z.string().min(2, 'targetLanguage is required'),
});
