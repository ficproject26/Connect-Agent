"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class CacheService {
    constructor() {
        this.redisClient = null;
        this.memoryCache = new Map();
        this.isRedisConnected = false;
        this.cleanupInterval = null;
        this.initRedis();
        this.startMemoryCleanup();
    }
    initRedis() {
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST;
        if (redisUrl || redisHost) {
            try {
                const client = redisUrl
                    ? new ioredis_1.default(redisUrl, {
                        maxRetriesPerRequest: 1,
                        connectTimeout: 2000,
                        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000))
                    })
                    : new ioredis_1.default({
                        host: redisHost || '127.0.0.1',
                        port: parseInt(process.env.REDIS_PORT || '6379', 10),
                        password: process.env.REDIS_PASSWORD || undefined,
                        maxRetriesPerRequest: 1,
                        connectTimeout: 2000,
                        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000))
                    });
                client.on('connect', () => {
                    this.isRedisConnected = true;
                    console.log('[CacheService] Connected to Redis server.');
                });
                client.on('error', (err) => {
                    this.isRedisConnected = false;
                    // Silent fallback to in-memory, avoid spamming logs
                });
                client.on('close', () => {
                    this.isRedisConnected = false;
                });
                this.redisClient = client;
            }
            catch (err) {
                console.warn('[CacheService] Redis init failed, using in-memory cache:', err.message);
                this.redisClient = null;
                this.isRedisConnected = false;
            }
        }
        else {
            console.log('[CacheService] No Redis configuration detected. Using fast in-memory TTL cache.');
        }
    }
    startMemoryCleanup() {
        // Run memory cache expiration prune every 60 seconds
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.memoryCache.entries()) {
                if (entry.expiresAt <= now) {
                    this.memoryCache.delete(key);
                }
            }
        }, 60000);
        // Don't keep Node process alive just for the cleanup timer
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    async get(key) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                const raw = await this.redisClient.get(key);
                if (raw) {
                    return JSON.parse(raw);
                }
            }
        }
        catch {
            // Fallback to memory
        }
        // Check memory cache
        const entry = this.memoryCache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.memoryCache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlSeconds = 60) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
            }
        }
        catch {
            // Fallback to memory
        }
        // Always store in memory cache as well for ultra-fast local retrieval
        this.memoryCache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000
        });
    }
    async del(key) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                await this.redisClient.del(key);
            }
        }
        catch {
            // Ignore Redis error
        }
        this.memoryCache.delete(key);
    }
    async delByPrefix(prefix) {
        try {
            if (this.isRedisConnected && this.redisClient) {
                const keys = await this.redisClient.keys(`${prefix}*`);
                if (keys && keys.length > 0) {
                    await this.redisClient.del(...keys);
                }
            }
        }
        catch {
            // Ignore Redis error
        }
        for (const key of this.memoryCache.keys()) {
            if (key.startsWith(prefix)) {
                this.memoryCache.delete(key);
            }
        }
    }
    async flush() {
        try {
            if (this.isRedisConnected && this.redisClient) {
                await this.redisClient.flushdb();
            }
        }
        catch {
            // Ignore
        }
        this.memoryCache.clear();
    }
}
exports.cacheService = new CacheService();
exports.default = exports.cacheService;
//# sourceMappingURL=cache.service.js.map