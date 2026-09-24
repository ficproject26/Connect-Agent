import Redis from 'ioredis';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

class CacheService {
  private redisClient: Redis | null = null;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private isRedisConnected: boolean = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initRedis();
    this.startMemoryCleanup();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (redisUrl || redisHost) {
      try {
        const client = redisUrl
          ? new Redis(redisUrl, {
              maxRetriesPerRequest: 1,
              connectTimeout: 2000,
              retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000))
            })
          : new Redis({
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
      } catch (err) {
        console.warn('[CacheService] Redis init failed, using in-memory cache:', (err as any).message);
        this.redisClient = null;
        this.isRedisConnected = false;
      }
    } else {
      console.log('[CacheService] No Redis configuration detected. Using fast in-memory TTL cache.');
    }
  }

  private startMemoryCleanup() {
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

  public async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const raw = await this.redisClient.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
      }
    } catch {
      // Fallback to memory
    }

    // Check memory cache
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      }
    } catch {
      // Fallback to memory
    }

    // Always store in memory cache as well for ultra-fast local retrieval
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  public async del(key: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.del(key);
      }
    } catch {
      // Ignore Redis error
    }
    this.memoryCache.delete(key);
  }

  public async delByPrefix(prefix: string): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(`${prefix}*`);
        if (keys && keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }
    } catch {
      // Ignore Redis error
    }

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  public async flush(): Promise<void> {
    try {
      if (this.isRedisConnected && this.redisClient) {
        await this.redisClient.flushdb();
      }
    } catch {
      // Ignore
    }
    this.memoryCache.clear();
  }
}

export const cacheService = new CacheService();
export default cacheService;
