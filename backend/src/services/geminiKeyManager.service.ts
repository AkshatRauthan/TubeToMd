import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

/**
 * Represents a single Gemini API key with its state.
 */
interface GeminiKey {
    key: string;
    label: string;
    active: boolean;
    exhaustedAt: number | null;   // epoch ms when it was marked exhausted
    refillAt: number | null;      // epoch ms when it should be reactivated
    requestsUsed: number;
    lastUsed: number | null;
}

/**
 * Manages a circular queue of Gemini API keys.
 * When a key hits rate-limit / quota errors the manager flags it inactive
 * and auto-reactivates it once the refill window has elapsed.
 *
 * Keys are persisted in-memory (survives restarts via initial load from env).
 *
 * Thread-safety note: Node.js is single-threaded so no mutex is needed.
 */
class GeminiKeyManager {
    private keys: GeminiKey[] = [];
    private currentIndex = 0;

    // Cache of GoogleGenerativeAI instances per key (so we don't recreate them)
    private clientCache = new Map<string, GoogleGenerativeAI>();

    // Default refill window: Gemini free-tier resets per-minute (60 s) and
    // per-day. We use 65 seconds as a safe per-minute cooldown.
    private static DEFAULT_REFILL_MS = 65_000; // 65 seconds

    constructor() {
        // Bootstrap keys from env variable(s)
        this.loadFromEnv();

        // Background timer to reactivate keys whose refill window has passed
        setInterval(() => this.reactivateKeys(), 10_000); // every 10 s
    }

    // ─── Bootstrap ──────────────────────────────────────────────

    /**
     * Load initial keys from environment.
     * Supports:
     *   GEMINI_API_KEY          — single key (legacy)
     *   GEMINI_API_KEYS         — comma-separated list of keys
     */
    private loadFromEnv(): void {
        const single = process.env.GEMINI_API_KEY;
        const multi = process.env.GEMINI_API_KEYS;

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
            rawKeys.unshift(single); // keep legacy key first
        }

        rawKeys.forEach((key, idx) => {
            this.addKey(key, `env-key-${idx + 1}`);
        });

        console.log(`🔑 [GeminiKeyManager] Loaded ${this.keys.length} API key(s)`);
    }

    // ─── Key CRUD ───────────────────────────────────────────────

    /**
     * Add a new key to the pool (idempotent — duplicate keys are ignored).
     */
    addKey(apiKey: string, label?: string): boolean {
        if (this.keys.some((k) => k.key === apiKey)) {
            return false; // duplicate
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

    /**
     * Remove a key from the pool.
     */
    removeKey(apiKey: string): boolean {
        const idx = this.keys.findIndex((k) => k.key === apiKey);
        if (idx === -1) return false;

        this.keys.splice(idx, 1);
        this.clientCache.delete(apiKey);

        // Reset index if it goes out of bounds
        if (this.currentIndex >= this.keys.length) {
            this.currentIndex = 0;
        }

        return true;
    }

    /**
     * Get status of all keys (safe — masks key values).
     */
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

    /**
     * Get the next available key in round-robin fashion.
     * Skips exhausted keys. Throws if no keys are available.
     */
    private getNextKey(): GeminiKey {
        if (this.keys.length === 0) {
            throw new Error(
                'No Gemini API keys configured. Add keys via GEMINI_API_KEY(S) env or the admin endpoint.'
            );
        }

        const totalKeys = this.keys.length;

        // Try all keys starting from currentIndex
        for (let attempts = 0; attempts < totalKeys; attempts++) {
            const idx = (this.currentIndex + attempts) % totalKeys;
            const key = this.keys[idx];

            if (key.active) {
                // Advance pointer past this key for next call
                this.currentIndex = (idx + 1) % totalKeys;
                key.requestsUsed++;
                key.lastUsed = Date.now();
                return key;
            }
        }

        // All keys exhausted — find earliest refill time
        const earliest = this.keys.reduce(
            (min, k) => (k.refillAt && k.refillAt < min ? k.refillAt : min),
            Infinity
        );
        const waitSeconds = earliest === Infinity ? '?' : Math.ceil((earliest - Date.now()) / 1000);

        throw new Error(
            `All ${totalKeys} Gemini API keys are rate-limited. Next key refills in ~${waitSeconds}s. Please wait.`
        );
    }

    // ─── Public API: get models ─────────────────────────────────

    /**
     * Get a `GenerativeModel` for text generation using the next available key.
     */
    getFlashModel(): { model: GenerativeModel; keyRef: GeminiKey } {
        const keyRef = this.getNextKey();
        const client = this.getClient(keyRef.key);
        return {
            model: client.getGenerativeModel({ model: 'gemini-2.0-flash' }),
            keyRef,
        };
    }

    /**
     * Get a `GenerativeModel` for embeddings using the next available key.
     */
    getEmbeddingModel(): { model: GenerativeModel; keyRef: GeminiKey } {
        const keyRef = this.getNextKey();
        const client = this.getClient(keyRef.key);
        return {
            model: client.getGenerativeModel({ model: 'text-embedding-004' }),
            keyRef,
        };
    }

    // ─── Exhaustion handling ────────────────────────────────────

    /**
     * Mark a key as exhausted after a rate-limit / quota error.
     * Parses the error to determine the refill window if available.
     */
    markExhausted(keyRef: GeminiKey, error?: any): void {
        keyRef.active = false;
        keyRef.exhaustedAt = Date.now();

        // Try to extract retry-after / refill duration from the error
        let refillMs = GeminiKeyManager.DEFAULT_REFILL_MS;

        if (error) {
            const errStr = String(error?.message || error);
            // Gemini often returns something like "retryDelay": "41s" or "Retry after 60 seconds"
            const retryMatch = errStr.match(/(\d+)\s*s(?:ec(?:ond)?s?)?/i);
            if (retryMatch) {
                const parsed = parseInt(retryMatch[1], 10);
                if (parsed > 0 && parsed < 86400) {
                    refillMs = (parsed + 5) * 1000; // +5s safety margin
                }
            }

            // Check for daily quota exhaustion (429 with large wait)
            if (
                errStr.includes('per day') ||
                errStr.includes('daily') ||
                errStr.includes('DAILY')
            ) {
                // Daily quota — wait 1 hour then retry (Gemini resets at midnight PT)
                refillMs = 3600_000; // 1 hour
            }
        }

        keyRef.refillAt = Date.now() + refillMs;

        const label = keyRef.label;
        const refillIn = Math.ceil(refillMs / 1000);
        console.warn(
            `⚠️  [GeminiKeyManager] Key "${label}" exhausted. Will reactivate in ${refillIn}s (at ${new Date(keyRef.refillAt).toISOString()})`
        );
    }

    // ─── Background reactivation ────────────────────────────────

    /**
     * Reactivate keys whose refill window has elapsed.
     * Called periodically by setInterval.
     */
    private reactivateKeys(): void {
        const now = Date.now();
        for (const key of this.keys) {
            if (!key.active && key.refillAt && now >= key.refillAt) {
                key.active = true;
                key.exhaustedAt = null;
                key.refillAt = null;
                console.log(
                    `✅ [GeminiKeyManager] Key "${key.label}" reactivated`
                );
            }
        }
    }

    // ─── Internal helpers ───────────────────────────────────────

    private getClient(apiKey: string): GoogleGenerativeAI {
        if (!this.clientCache.has(apiKey)) {
            this.clientCache.set(apiKey, new GoogleGenerativeAI(apiKey));
        }
        return this.clientCache.get(apiKey)!;
    }
}

// Singleton
const geminiKeyManager = new GeminiKeyManager();
export default geminiKeyManager;
