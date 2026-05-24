import nimKeyManager from '../nimKeyManager.service';
import serverConfig from '@config/server.config';

jest.mock('@config/server.config', () => ({
    __esModule: true,
    default: {
        NVIDIA_API_KEY: 'test-key-1',
        NVIDIA_API_KEYS: 'test-key-2,test-key-3',
    },
}));

describe('NIM Key Manager Service', () => {
    beforeEach(() => {
        // Reset the key manager before each test by exploiting the initialization logic
        // This ensures a clean state
        (nimKeyManager as any).keys = [];
        (nimKeyManager as any).currentIndex = 0;
        (nimKeyManager as any).clientCache.clear();
        
        // Re-initialize manually
        const initialKey = serverConfig.NVIDIA_API_KEY;
        const additionalKeys = serverConfig.NVIDIA_API_KEYS
            ? serverConfig.NVIDIA_API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0)
            : [];
            
        const allKeys = Array.from(new Set([initialKey, ...additionalKeys].filter(Boolean)));
        (nimKeyManager as any).keys = allKeys.map((key, i) => ({
            key,
            label: `key-${i+1}`,
            active: true,
            creditExhausted: false,
            exhaustedAt: null,
            refillAt: null,
            requestsUsed: 0,
            lastUsed: null,
            lastError: null
        }));
    });

    it('should initialize with the correct number of keys', () => {
        const status = nimKeyManager.getStatus();
        expect(status.total).toBe(3);
        expect(status.active).toBe(3);
        expect(status.rateLimited).toBe(0);
    });

    it('should get a key successfully', () => {
        const { apiKey } = nimKeyManager.getRawKey();
        expect(apiKey).toBe('test-key-1');
    });

    it('should round-robin keys if no rate limits exist', () => {
        const key1 = nimKeyManager.getRawKey().apiKey;
        const key2 = nimKeyManager.getRawKey().apiKey;
        const key3 = nimKeyManager.getRawKey().apiKey;
        const key4 = nimKeyManager.getRawKey().apiKey;

        expect(key1).toBe('test-key-1');
        expect(key2).toBe('test-key-2');
        expect(key3).toBe('test-key-3');
        expect(key4).toBe('test-key-1');
    });

    it('should mark a key as rate limited and skip it', () => {
        const { apiKey, keyRef } = nimKeyManager.getRawKey();
        expect(apiKey).toBe('test-key-1');

        nimKeyManager.markRateLimited(keyRef, new Error('Too many requests'));
        
        const status = nimKeyManager.getStatus();
        expect(status.rateLimited).toBe(1);
        expect(status.active).toBe(2);

        // Next key should be test-key-2
        const key2 = nimKeyManager.getRawKey().apiKey;
        expect(key2).toBe('test-key-2');
        
        // Next should be test-key-3
        const key3 = nimKeyManager.getRawKey().apiKey;
        expect(key3).toBe('test-key-3');
        
        // Next should loop back to test-key-2 because test-key-1 is rate limited
        const key4 = nimKeyManager.getRawKey().apiKey;
        expect(key4).toBe('test-key-2');
    });

    it('should dynamically add and remove keys', () => {
        nimKeyManager.addKey('test-key-4');
        expect(nimKeyManager.getStatus().total).toBe(4);

        nimKeyManager.removeKey('test-key-2');
        expect(nimKeyManager.getStatus().total).toBe(3);

        const keys = [
            nimKeyManager.getRawKey().apiKey,
            nimKeyManager.getRawKey().apiKey,
            nimKeyManager.getRawKey().apiKey,
        ];
        
        expect(keys).toContain('test-key-1');
        expect(keys).toContain('test-key-3');
        expect(keys).toContain('test-key-4');
        expect(keys).not.toContain('test-key-2');
    });
});
