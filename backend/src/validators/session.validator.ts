import { z } from 'zod';

export const createYouTubeSessionSchema = z.object({
    videoUrl: z.string().url('Invalid YouTube URL'),
    title: z.string().max(200).optional(),
    startTime: z.number().min(0).optional(),
    endTime: z.number().min(0).optional(),
});

export const initUploadSessionSchema = z.object({
    filename: z.string().min(1, 'filename is required'),
    totalChunks: z.number().int().min(1).max(120),
    title: z.string().max(200).optional(),
    duration: z.number().min(0).optional(),
});

export const updateSessionSchema = z.object({
    title: z.string().min(1, 'Title cannot be empty').max(200).trim(),
});

export const translateSessionSchema = z.object({
    targetLanguage: z.string().min(2, 'targetLanguage is required'),
});
