declare class CacheService {
    private redisClient;
    private memoryCache;
    private isRedisConnected;
    private cleanupInterval;
    constructor();
    private initRedis;
    private startMemoryCleanup;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    delByPrefix(prefix: string): Promise<void>;
    flush(): Promise<void>;
}
export declare const cacheService: CacheService;
export default cacheService;
//# sourceMappingURL=cache.service.d.ts.map