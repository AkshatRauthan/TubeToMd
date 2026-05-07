import OpenAI from 'openai';
import serverConfig from '@config/server.config';

interface NimKey {
    key: string;
    label: string;
    active: boolean;
    creditExhausted: boolean; // hard kill — 402/insufficient credits
    exhaustedAt: number | null;
    refillAt: number | null;
    requestsUsed: number;
    lastUsed: number | null;
    lastError: string | null;
}

/**
 * NVIDIA NIM key pool manager.
 *
 * NIM differs from Groq's free tier in two important ways:
 *  1. Free credits are *lifetime* per account, not refilled per minute/day.
 *     A 402 / "insufficient credits" → key is dead until manually rotated.
 *  2. Per-minute rate-limits (~40 RPM/model) DO refill on a short window.
 *     Those are recoverable via short cooldown, like Groq.
 */
class NimKeyManager {
    private keys: NimKey[] = [];
    private currentIndex = 0;
    private clientCache = new Map<string, OpenAI>();

    private static DEFAULT_RATE_LIMIT_COOLDOWN_MS = 65_000;

    constructor() {
        this.loadFromEnv();
        setInterval(() => this.reactivateKeys(), 10_000);
    }

    private loadFromEnv(): void {
        const single = serverConfig.NVIDIA_API_KEY;
        const multi = serverConfig.NVIDIA_API_KEYS;

        const rawKeys: string[] = [];

        if (multi) {
            rawKeys.push(
                ...multi
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean)
            );
        }

        if (single && !rawKeys.includes(single)) {
            rawKeys.unshift(single);
        }

        rawKeys.forEach((key, idx) => {
            this.addKey(key, `nim-key-${idx + 1}`);
        });

        console.log(`🔑 [NimKeyManager] Loaded ${this.keys.length} NVIDIA NIM key(s)`);
    }

    addKey(apiKey: string, label?: string): boolean {
        if (this.keys.some((k) => k.key === apiKey)) {
            return false;
        }

        this.keys.push({
            key: apiKey,
            label: label || `key-${this.keys.length + 1}`,
            active: true,
            creditExhausted: false,
            exhaustedAt: null,
            refillAt: null,
            requestsUsed: 0,
            lastUsed: null,
            lastError: null,
        });

        return true;
    }

    removeKey(apiKey: string): boolean {
        const idx = this.keys.findIndex((k) => k.key === apiKey);
        if (idx === -1) return false;

        this.keys.splice(idx, 1);
        this.clientCache.delete(apiKey);

        if (this.currentIndex >= this.keys.length) {
            this.currentIndex = 0;
        }

        return true;
    }

    getStatus() {
        return {
            total: this.keys.length,
            active: this.keys.filter((k) => k.active).length,
            rateLimited: this.keys.filter((k) => !k.active && !k.creditExhausted).length,
            creditExhausted: this.keys.filter((k) => k.creditExhausted).length,
            keys: this.keys.map((k) => ({
                label: k.label,
                maskedKey: k.key.slice(0, 6) + '...' + k.key.slice(-4),
                active: k.active,
                creditExhausted: k.creditExhausted,
                exhaustedAt: k.exhaustedAt ? new Date(k.exhaustedAt).toISOString() : null,
                refillAt: k.refillAt ? new Date(k.refillAt).toISOString() : null,
                requestsUsed: k.requestsUsed,
                lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : null,
                lastError: k.lastError,
            })),
        };
    }

    private getNextKey(): NimKey {
        if (this.keys.length === 0) {
            throw new Error(
                'No NVIDIA NIM keys configured. Add keys via NVIDIA_API_KEY(S) env or the admin endpoint.'
            );
        }

        const totalKeys = this.keys.length;

        for (let attempts = 0; attempts < totalKeys; attempts++) {
            const idx = (this.currentIndex + attempts) % totalKeys;
            const key = this.keys[idx];

            if (key.active) {
                this.currentIndex = (idx + 1) % totalKeys;
                key.requestsUsed++;
                key.lastUsed = Date.now();
                return key;
            }
        }

        const recoverable = this.keys.filter((k) => !k.creditExhausted && k.refillAt);
        if (recoverable.length === 0) {
            throw new Error(
                `All ${totalKeys} NVIDIA NIM keys have exhausted their free credits. Add new keys via the admin endpoint.`
            );
        }

        const earliest = recoverable.reduce(
            (min, k) => (k.refillAt && k.refillAt < min ? k.refillAt : min),
            Infinity
        );
        const waitSeconds = earliest === Infinity ? '?' : Math.ceil((earliest - Date.now()) / 1000);

        throw new Error(
            `All ${totalKeys} NVIDIA NIM keys are rate-limited. Next key refills in ~${waitSeconds}s.`
        );
    }

    /**
     * Get an OpenAI-compatible client pointed at NIM, plus its key reference.
     */
    getClient(): { client: OpenAI; keyRef: NimKey } {
        const keyRef = this.getNextKey();
        if (!this.clientCache.has(keyRef.key)) {
            this.clientCache.set(
                keyRef.key,
                new OpenAI({
                    apiKey: keyRef.key,
                    baseURL: serverConfig.NVIDIA_BASE_URL,
                })
            );
        }
        return {
            client: this.clientCache.get(keyRef.key)!,
            keyRef,
        };
    }

    /**
     * Get the raw API key for use with non-OpenAI-shaped endpoints (e.g. image gen).
     */
    getRawKey(): { apiKey: string; keyRef: NimKey } {
        const keyRef = this.getNextKey();
        return { apiKey: keyRef.key, keyRef };
    }

    markRateLimited(keyRef: NimKey, error?: any): void {
        keyRef.active = false;
        keyRef.exhaustedAt = Date.now();
        keyRef.lastError = error ? String(error?.message || error).slice(0, 200) : null;

        let cooldownMs = NimKeyManager.DEFAULT_RATE_LIMIT_COOLDOWN_MS;

        if (error) {
            const errStr = String(error?.message || error);
            const retryMatch = errStr.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);
            if (retryMatch) {
                const parsed = parseInt(retryMatch[1], 10);
                if (parsed > 0 && parsed < 86400) {
                    cooldownMs = (parsed + 5) * 1000;
                }
            }
        }

        keyRef.refillAt = Date.now() + cooldownMs;
        console.warn(
            `⚠️  [NimKeyManager] Key "${keyRef.label}" rate-limited. Cooldown ${Math.ceil(cooldownMs / 1000)}s.`
        );
    }

    markCreditExhausted(keyRef: NimKey, error?: any): void {
        keyRef.active = false;
        keyRef.creditExhausted = true;
        keyRef.exhaustedAt = Date.now();
        keyRef.refillAt = null;
        keyRef.lastError = error ? String(error?.message || error).slice(0, 200) : null;

        console.error(
            `🛑 [NimKeyManager] Key "${keyRef.label}" out of free credits — permanently disabled until restart or manual re-add.`
        );
    }

    private reactivateKeys(): void {
        const now = Date.now();
        for (const key of this.keys) {
            if (!key.active && !key.creditExhausted && key.refillAt && now >= key.refillAt) {
                key.active = true;
                key.exhaustedAt = null;
                key.refillAt = null;
                console.log(`✅ [NimKeyManager] Key "${key.label}" reactivated after cooldown.`);
            }
        }
    }
}

const nimKeyManager = new NimKeyManager();
export default nimKeyManager;
export { NimKey };
