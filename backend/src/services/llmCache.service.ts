import crypto from 'crypto';
import LlmCache from '@models/llmCache.model';

const TTL_BY_OPERATION: Record<string, number> = {
    'generate notes': 24 * 60 * 60 * 1000,
    'translate transcript': 7 * 24 * 60 * 60 * 1000,
    'answer question': 60 * 60 * 1000,
    default: 60 * 60 * 1000,
};

class LlmCacheService {
    private buildKey(model: string, prompt: string, operation: string): string {
        const hash = crypto
            .createHash('sha256')
            .update(`${model}::${operation}::${prompt}`)
            .digest('hex');
        return hash;
    }

    async get(model: string, prompt: string, operation: string): Promise<string | null> {
        try {
            const cacheKey = this.buildKey(model, prompt, operation);
            const entry = await LlmCache.findOne({ cacheKey }).lean();
            if (!entry) return null;
            if (entry.expiresAt.getTime() < Date.now()) return null;
            return entry.response;
        } catch (err) {
            console.warn('[LlmCache] get failed:', err);
            return null;
        }
    }

    async set(
        model: string,
        prompt: string,
        operation: string,
        response: string
    ): Promise<void> {
        try {
            const cacheKey = this.buildKey(model, prompt, operation);
            const ttlMs = TTL_BY_OPERATION[operation] ?? TTL_BY_OPERATION.default;
            const expiresAt = new Date(Date.now() + ttlMs);

            await LlmCache.updateOne(
                { cacheKey },
                { $set: { cacheKey, modelName: model, operation, response, expiresAt } },
                { upsert: true }
            );
        } catch (err) {
            console.warn('[LlmCache] set failed:', err);
        }
    }
}

export default new LlmCacheService();
