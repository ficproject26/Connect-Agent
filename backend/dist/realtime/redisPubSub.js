"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisPubSub = exports.GLOBAL_REDIS_CHANNEL = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
exports.GLOBAL_REDIS_CHANNEL = 'connect:global:events';
class RedisPubSubManager {
    constructor() {
        this.publisher = null;
        this.subscriber = null;
        this.localEmitter = new events_1.EventEmitter();
        this.isRedisConnected = false;
        this.seenEvents = new Map(); // eventId -> timestamp
        this.cleanupInterval = null;
        // Observability metrics
        this.metrics = {
            eventsPublished: 0,
            eventsReceived: 0,
            duplicatesDropped: 0,
            lastEventTime: null,
            startedAt: new Date().toISOString()
        };
        this.initClients();
        this.startDedupCleanup();
    }
    initClients() {
        const redisUrl = process.env.REDIS_URL;
        const redisHost = process.env.REDIS_HOST;
        if (redisUrl || redisHost) {
            try {
                const createClient = (role) => {
                    const client = redisUrl
                        ? new ioredis_1.default(redisUrl, {
                            maxRetriesPerRequest: 2,
                            connectTimeout: 3000,
                            lazyConnect: false,
                            retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000))
                        })
                        : new ioredis_1.default({
                            host: redisHost || '127.0.0.1',
                            port: parseInt(process.env.REDIS_PORT || '6379', 10),
                            password: process.env.REDIS_PASSWORD || undefined,
                            maxRetriesPerRequest: 2,
                            connectTimeout: 3000,
                            lazyConnect: false,
                            retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000))
                        });
                    client.on('connect', () => {
                        this.isRedisConnected = true;
                        console.log(`[RedisPubSub:${role}] Connected to Redis broker.`);
                    });
                    client.on('error', (err) => {
                        this.isRedisConnected = false;
                        // Silent fallback to avoid unhandled crash
                    });
                    client.on('close', () => {
                        this.isRedisConnected = false;
                    });
                    return client;
                };
                this.publisher = createClient('Publisher');
                this.subscriber = createClient('Subscriber');
                // Subscribe to global channel on subscriber client
                this.subscriber.subscribe(exports.GLOBAL_REDIS_CHANNEL, (err, count) => {
                    if (err) {
                        console.warn('[RedisPubSub] Failed to subscribe to channel:', err.message);
                    }
                    else {
                        console.log(`[RedisPubSub] Subscribed to channel "${exports.GLOBAL_REDIS_CHANNEL}" (${count} channels)`);
                    }
                });
                // Dispatch incoming Redis messages
                this.subscriber.on('message', (channel, message) => {
                    if (channel === exports.GLOBAL_REDIS_CHANNEL) {
                        this.handleIncomingRawMessage(message);
                    }
                });
            }
            catch (err) {
                console.warn('[RedisPubSub] Redis setup failed, operating on in-memory Pub/Sub:', err.message);
                this.publisher = null;
                this.subscriber = null;
                this.isRedisConnected = false;
            }
        }
        else {
            console.log('[RedisPubSub] No Redis broker configured. Running with in-memory distributed Pub/Sub.');
        }
    }
    startDedupCleanup() {
        this.cleanupInterval = setInterval(() => {
            const cutoff = Date.now() - 60000; // 60-second dedup retention
            for (const [eventId, ts] of this.seenEvents.entries()) {
                if (ts < cutoff) {
                    this.seenEvents.delete(eventId);
                }
            }
        }, 30000);
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    /**
     * Process raw message from Redis or in-memory bus, apply deduplication,
     * and emit to local subscribers.
     */
    handleIncomingRawMessage(raw) {
        try {
            const event = JSON.parse(raw);
            if (!event || !event.eventId)
                return;
            // Event deduplication check
            if (this.seenEvents.has(event.eventId)) {
                this.metrics.duplicatesDropped++;
                return;
            }
            this.seenEvents.set(event.eventId, Date.now());
            this.metrics.eventsReceived++;
            this.metrics.lastEventTime = new Date().toISOString();
            // Emit to local node listeners (WebSocket server)
            this.localEmitter.emit('event', event);
        }
        catch (err) {
            console.error('[RedisPubSub] Error parsing incoming realtime event:', err);
        }
    }
    /**
     * Publish an event to the global channel.
     * If Redis is active, publishes via Redis so ALL backend instances receive it.
     * Also delivers locally.
     */
    async publish(event) {
        try {
            const payload = JSON.stringify(event);
            this.metrics.eventsPublished++;
            this.metrics.lastEventTime = new Date().toISOString();
            // Record in local dedup map
            this.seenEvents.set(event.eventId, Date.now());
            let publishedToRedis = false;
            if (this.isRedisConnected && this.publisher) {
                try {
                    await this.publisher.publish(exports.GLOBAL_REDIS_CHANNEL, payload);
                    publishedToRedis = true;
                }
                catch (err) {
                    console.warn('[RedisPubSub] Redis publish failed, falling back to local dispatch:', err.message);
                }
            }
            // If not published via Redis (or in local dev fallback), dispatch locally
            if (!publishedToRedis) {
                // Asynchronous micro-tick to avoid blocking the API call stack
                setImmediate(() => {
                    this.localEmitter.emit('event', event);
                });
            }
            return true;
        }
        catch (err) {
            console.error('[RedisPubSub] Publish error:', err.message);
            return false;
        }
    }
    /**
     * Subscribe to events delivered to this backend node.
     */
    onEvent(callback) {
        this.localEmitter.on('event', callback);
        return () => {
            this.localEmitter.off('event', callback);
        };
    }
    /**
     * Status and observability check
     */
    getStatus() {
        return {
            status: this.isRedisConnected ? 'redis_pubsub' : 'in_memory_pubsub',
            isRedisConnected: this.isRedisConnected,
            channel: exports.GLOBAL_REDIS_CHANNEL,
            metrics: { ...this.metrics },
            trackedEventsInWindow: this.seenEvents.size
        };
    }
}
exports.redisPubSub = new RedisPubSubManager();
exports.default = exports.redisPubSub;
//# sourceMappingURL=redisPubSub.js.map