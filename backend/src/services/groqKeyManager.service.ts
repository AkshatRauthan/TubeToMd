import Groq from 'groq-sdk';

/**
 * Represents a single Groq API key with its state.
 */
interface GroqKey {
    key: string;
    label: string;
    active: boolean;
    exhaustedAt: number | null;
    refillAt: number | null;
    requestsUsed: number;
    lastUsed: number | null;
}

/**
 * Manages a circular queue of Groq API keys.
 * When a key hits rate-limit / quota errors the manager flags it inactive
 * and auto-reactivates it once the refill window has elapsed.
 */
class GroqKeyManager {
    private keys: GroqKey[] = [];
    private currentIndex = 0;

    // Cache of Groq SDK instances per key
    private clientCache = new Map<string, Groq>();

    // Default refill window: Groq free tier is per-minute based
    private static DEFAULT_REFILL_MS = 65_000; // 65 seconds

    // Available models
    static MODELS = {
        FAST: 'llama-3.1-8b-instant',        // 14,400 RPD — bulk tasks
        QUALITY: 'llama-3.3-70b-versatile',   // 1,000 RPD — quality tasks
        WHISPER: 'whisper-large-v3-turbo',     // 2,000 RPD — transcription
    } as const;

    constructor() {
        this.loadFromEnv();
        // Background timer to reactivate keys whose refill window has passed
        setInterval(() => this.reactivateKeys(), 10_000);
    }

    // ─── Bootstrap ──────────────────────────────────────────────

    /**
     * Load initial keys from environment.
     * Supports:
     *   GROQ_API_KEY          — single key
     *   GROQ_API_KEYS         — comma-separated list of keys
     */
    private loadFromEnv(): void {
        const single = process.env.GROQ_API_KEY;
        const multi = process.env.GROQ_API_KEYS;

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
            this.addKey(key, `groq-key-${idx + 1}`);
        });

        console.log(`🔑 [GroqKeyManager] Loaded ${this.keys.length} API key(s)`);
    }

    // ─── Key CRUD ───────────────────────────────────────────────

    addKey(apiKey: string, label?: string): boolean {
        if (this.keys.some((k) => k.key === apiKey)) {
            return false;
        }

        this.keys.push({
            key: apiKey,
            label: label || `key-${this.keys.length + 1}`,
            active: true,
            exhaustedAt: null,
            refillAt: null,
            requestsUsed: 0,
            lastUsed: null,
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

    getStatus(): {
        total: number;
        active: number;
        exhausted: number;
        keys: {
            label: string;
            maskedKey: string;
            active: boolean;
            exhaustedAt: string | null;
            refillAt: string | null;
            requestsUsed: number;
            lastUsed: string | null;
        }[];
    } {
        return {
            total: this.keys.length,
            active: this.keys.filter((k) => k.active).length,
            exhausted: this.keys.filter((k) => !k.active).length,
            keys: this.keys.map((k) => ({
                label: k.label,
                maskedKey: k.key.slice(0, 6) + '...' + k.key.slice(-4),
                active: k.active,
                exhaustedAt: k.exhaustedAt ? new Date(k.exhaustedAt).toISOString() : null,
                refillAt: k.refillAt ? new Date(k.refillAt).toISOString() : null,
                requestsUsed: k.requestsUsed,
                lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : null,
            })),
        };
    }

    // ─── Circular Queue Selection ───────────────────────────────

    private getNextKey(): GroqKey {
        if (this.keys.length === 0) {
            throw new Error(
                'No Groq API keys configured. Add keys via GROQ_API_KEY(S) env or the admin endpoint.'
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

        const earliest = this.keys.reduce(
            (min, k) => (k.refillAt && k.refillAt < min ? k.refillAt : min),
            Infinity
        );
        const waitSeconds = earliest === Infinity ? '?' : Math.ceil((earliest - Date.now()) / 1000);

        throw new Error(
            `All ${totalKeys} Groq API keys are rate-limited. Next key refills in ~${waitSeconds}s. Please wait.`
        );
    }

    // ─── Public API: get client ─────────────────────────────────

    /**
     * Get a Groq client using the next available key.
     * Returns the client and key reference for exhaustion tracking.
     */
    getClient(): { client: Groq; keyRef: GroqKey } {
        const keyRef = this.getNextKey();
        if (!this.clientCache.has(keyRef.key)) {
            this.clientCache.set(keyRef.key, new Groq({ apiKey: keyRef.key }));
        }
        return {
            client: this.clientCache.get(keyRef.key)!,
            keyRef,
        };
    }

    // ─── Exhaustion handling ────────────────────────────────────

    markExhausted(keyRef: GroqKey, error?: any): void {
        keyRef.active = false;
        keyRef.exhaustedAt = Date.now();

        let refillMs = GroqKeyManager.DEFAULT_REFILL_MS;

        if (error) {
            const errStr = String(error?.message || error);
            // Groq returns retry-after headers; parse from error message
            const retryMatch = errStr.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);
            if (retryMatch) {
                const parsed = parseInt(retryMatch[1], 10);
                if (parsed > 0 && parsed < 86400) {
                    refillMs = (parsed + 5) * 1000;
                }
            }

            // Daily quota exhaustion
            if (
                errStr.includes('per day') ||
                errStr.includes('daily') ||
                errStr.includes('DAILY')
            ) {
                refillMs = 3600_000; // 1 hour
            }
        }

        keyRef.refillAt = Date.now() + refillMs;

        const label = keyRef.label;
        const refillIn = Math.ceil(refillMs / 1000);
        console.warn(
            `⚠️  [GroqKeyManager] Key "${label}" exhausted. Will reactivate in ${refillIn}s (at ${new Date(keyRef.refillAt).toISOString()})`
        );
    }

    // ─── Background reactivation ────────────────────────────────

    private reactivateKeys(): void {
        const now = Date.now();
        for (const key of this.keys) {
            if (!key.active && key.refillAt && now >= key.refillAt) {
                key.active = true;
                key.exhaustedAt = null;
                key.refillAt = null;
                console.log(
                    `✅ [GroqKeyManager] Key "${key.label}" reactivated`
                );
            }
        }
    }
}

// Singleton
const groqKeyManager = new GroqKeyManager();
export default groqKeyManager;
