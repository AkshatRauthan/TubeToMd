import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import nimKeyManager from '@services/nimKeyManager.service';
import serverConfig from '@config/server.config';
import ImageQuota from '@models/imageQuota.model';
import CustomError from '@errors/custom.error';
import { StatusCodes } from 'http-status-codes';

interface GenerateImageOptions {
    prompt: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    seed?: number;
}

interface GeneratedImage {
    relativeUrl: string;   // e.g. /uploads/generated/<file>.png
    absolutePath: string;
    model: string;
    promptHash: string;
}

const IMAGE_SUBDIR = 'generated';

function utcDayKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function ensureUploadDir(): string {
    const dir = path.resolve(serverConfig.UPLOAD_DIR, IMAGE_SUBDIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function buildBody(model: string, opts: GenerateImageOptions): Record<string, any> {
    const aspectRatio = opts.aspectRatio || '16:9';
    const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);

    if (model.startsWith('black-forest-labs/flux')) {
        return {
            prompt: opts.prompt,
            cfg_scale: 0,
            aspect_ratio: aspectRatio,
            seed,
            steps: 4,
            mode: 'base',
        };
    }

    if (model.startsWith('stabilityai/stable-diffusion-3')) {
        return {
            prompt: opts.prompt,
            cfg_scale: 5,
            aspect_ratio: aspectRatio,
            seed,
            steps: 50,
            negative_prompt: '',
        };
    }

    // Generic fallback shape
    return { prompt: opts.prompt, seed, aspect_ratio: aspectRatio };
}

function extractBase64(payload: any): string | null {
    if (!payload) return null;
    if (typeof payload.image === 'string') return payload.image;
    if (Array.isArray(payload.artifacts) && payload.artifacts[0]?.base64) {
        return payload.artifacts[0].base64;
    }
    if (Array.isArray(payload.images) && typeof payload.images[0] === 'string') {
        return payload.images[0];
    }
    if (Array.isArray(payload.data) && payload.data[0]?.b64_json) {
        return payload.data[0].b64_json;
    }
    return null;
}

class ImageService {
    /**
     * Per-user daily quota. Atomically increment if under cap; otherwise throw.
     */
    private async consumeQuota(userId: string): Promise<void> {
        const cap = serverConfig.IMAGE_GEN_DAILY_QUOTA_PER_USER;
        if (cap <= 0) return;

        const day = utcDayKey();
        const result = await ImageQuota.findOneAndUpdate(
            { userId, day, count: { $lt: cap } },
            { $inc: { count: 1 }, $setOnInsert: { userId, day } },
            { new: true, upsert: true }
        ).catch(async (err: any) => {
            // Duplicate-key on upsert race → quota likely full; re-check
            if (err?.code === 11000) {
                const existing = await ImageQuota.findOne({ userId, day });
                if (existing && existing.count >= cap) return null;
                // If row exists but under cap, retry the increment once
                return ImageQuota.findOneAndUpdate(
                    { userId, day, count: { $lt: cap } },
                    { $inc: { count: 1 } },
                    { new: true }
                );
            }
            throw err;
        });

        if (!result) {
            throw new CustomError(
                `Daily image generation limit reached (${cap}/day). Try again tomorrow.`,
                StatusCodes.TOO_MANY_REQUESTS
            );
        }
    }

    private async callNimImage(
        model: string,
        body: Record<string, any>,
        apiKey: string
    ): Promise<string> {
        const url = `${serverConfig.NVIDIA_IMAGE_BASE_URL}/genai/${model}`;
        const res = await axios.post(url, body, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            timeout: 60_000,
            validateStatus: () => true,
        });

        if (res.status >= 400) {
            const err: any = new Error(
                `NIM image API error ${res.status}: ${JSON.stringify(res.data).slice(0, 300)}`
            );
            err.status = res.status;
            err.response = res;
            throw err;
        }

        const base64 = extractBase64(res.data);
        if (!base64) {
            throw new Error(`NIM image API returned no base64 payload for model ${model}`);
        }
        return base64;
    }

    /**
     * Generate an image. Tries primary model, then fallback model,
     * rotating keys on rate-limit / credit exhaustion.
     */
    async generate(userId: string, opts: GenerateImageOptions): Promise<GeneratedImage> {
        await this.consumeQuota(userId);

        const primary = serverConfig.NVIDIA_MODEL_IMAGE;
        const fallback = serverConfig.NVIDIA_MODEL_IMAGE_FALLBACK;
        const modelChain = primary === fallback ? [primary] : [primary, fallback];

        const totalKeys = Math.max(nimKeyManager.getStatus().total, 1);
        let lastError: any;
        let chosenModel = primary;
        let base64: string | null = null;

        outer: for (let attempt = 0; attempt < totalKeys; attempt++) {
            const { apiKey, keyRef } = nimKeyManager.getRawKey();
            let keyDead = false;

            for (const model of modelChain) {
                try {
                    base64 = await this.callNimImage(model, buildBody(model, opts), apiKey);
                    chosenModel = model;
                    break outer;
                } catch (error: any) {
                    lastError = error;
                    const status = error?.status;
                    const msg = String(error?.message || error);

                    if (status === 402 || /insufficient.*credit|payment required/i.test(msg)) {
                        nimKeyManager.markCreditExhausted(keyRef, error);
                        keyDead = true;
                        break;
                    }
                    if (status === 429 || /rate.?limit|too many requests/i.test(msg)) {
                        console.warn(`[ImageService] ${model} rate-limited on key ${keyRef.label}, trying next model.`);
                        continue;
                    }
                    if (status === 401 || status === 403) {
                        throw new CustomError(
                            'Image AI service authentication error.',
                            StatusCodes.SERVICE_UNAVAILABLE
                        );
                    }
                    console.warn(`[ImageService] ${model} failed: ${msg.slice(0, 200)}`);
                    continue;
                }
            }

            if (!keyDead && !base64) {
                nimKeyManager.markRateLimited(keyRef, lastError);
            }
        }

        if (!base64) {
            console.error('[ImageService] all attempts failed:', lastError);
            throw new CustomError(
                'Failed to generate image. AI service unavailable.',
                StatusCodes.SERVICE_UNAVAILABLE
            );
        }

        const dir = ensureUploadDir();
        const promptHash = crypto.createHash('sha256').update(opts.prompt).digest('hex').slice(0, 16);
        const filename = `${Date.now()}-${promptHash}.png`;
        const absolutePath = path.join(dir, filename);
        fs.writeFileSync(absolutePath, Buffer.from(base64, 'base64'));

        return {
            relativeUrl: `/uploads/${IMAGE_SUBDIR}/${filename}`,
            absolutePath,
            model: chosenModel,
            promptHash,
        };
    }

    /**
     * Build a sensible image prompt from a note's content.
     */
    buildCoverPrompt(noteTitle: string, noteContent: string): string {
        const snippet = noteContent.replace(/```[\s\S]*?```/g, '').replace(/[#*_`>\-]/g, ' ').trim().slice(0, 600);
        return `A clean, modern cover illustration for study notes titled "${noteTitle}". The notes are about: ${snippet}. Style: minimalist, editorial, soft gradients, professional, no text overlays.`;
    }
}

export default new ImageService();
