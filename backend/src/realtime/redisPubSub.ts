import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { RealtimeEvent } from './eventTypes';

export const GLOBAL_REDIS_CHANNEL = 'connect:global:events';

class RedisPubSubManager {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private localEmitter: EventEmitter = new EventEmitter();
  private isRedisConnected: boolean = false;
  private seenEvents: Map<string, number> = new Map(); // eventId -> timestamp
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Observability metrics
  private metrics = {
    eventsPublished: 0,
    eventsReceived: 0,
    duplicatesDropped: 0,
    lastEventTime: null as string | null,
    startedAt: new Date().toISOString()
  };

  constructor() {
    this.initClients();
    this.startDedupCleanup();
  }

  private initClients() {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (redisUrl || redisHost) {
      try {
        const createClient = (role: string) => {
          const client = redisUrl
            ? new Redis(redisUrl, {
                maxRetriesPerRequest: 2,
                connectTimeout: 3000,
                lazyConnect: false,
                retryStrategy: (times) => (times > 5 ? null : Math.min(times * 300, 2000))
              })
            : new Redis({
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
        this.subscriber.subscribe(GLOBAL_REDIS_CHANNEL, (err, count) => {
          if (err) {
            console.warn('[RedisPubSub] Failed to subscribe to channel:', err.message);
          } else {
            console.log(`[RedisPubSub] Subscribed to channel "${GLOBAL_REDIS_CHANNEL}" (${count} channels)`);
          }
        });

        // Dispatch incoming Redis messages
        this.subscriber.on('message', (channel, message) => {
          if (channel === GLOBAL_REDIS_CHANNEL) {
            this.handleIncomingRawMessage(message);
          }
        });
      } catch (err: any) {
        console.warn('[RedisPubSub] Redis setup failed, operating on in-memory Pub/Sub:', err.message);
        this.publisher = null;
        this.subscriber = null;
        this.isRedisConnected = false;
      }
    } else {
      console.log('[RedisPubSub] No Redis broker configured. Running with in-memory distributed Pub/Sub.');
    }
  }

  private startDedupCleanup() {
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
  private handleIncomingRawMessage(raw: string) {
    try {
      const event: RealtimeEvent = JSON.parse(raw);
      if (!event || !event.eventId) return;

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
    } catch (err) {
      console.error('[RedisPubSub] Error parsing incoming realtime event:', err);
    }
  }

  /**
   * Publish an event to the global channel.
   * If Redis is active, publishes via Redis so ALL backend instances receive it.
   * Also delivers locally.
   */
  public async publish(event: RealtimeEvent): Promise<boolean> {
    try {
      const payload = JSON.stringify(event);
      this.metrics.eventsPublished++;
      this.metrics.lastEventTime = new Date().toISOString();

      // Record in local dedup map
      this.seenEvents.set(event.eventId, Date.now());

      let publishedToRedis = false;
      if (this.isRedisConnected && this.publisher) {
        try {
          await this.publisher.publish(GLOBAL_REDIS_CHANNEL, payload);
          publishedToRedis = true;
        } catch (err: any) {
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
    } catch (err: any) {
      console.error('[RedisPubSub] Publish error:', err.message);
      return false;
    }
  }

  /**
   * Subscribe to events delivered to this backend node.
   */
  public onEvent(callback: (event: RealtimeEvent) => void): () => void {
    this.localEmitter.on('event', callback);
    return () => {
      this.localEmitter.off('event', callback);
    };
  }

  /**
   * Status and observability check
   */
  public getStatus() {
    return {
      status: this.isRedisConnected ? 'redis_pubsub' : 'in_memory_pubsub',
      isRedisConnected: this.isRedisConnected,
      channel: GLOBAL_REDIS_CHANNEL,
      metrics: { ...this.metrics },
      trackedEventsInWindow: this.seenEvents.size
    };
  }
}

export const redisPubSub = new RedisPubSubManager();
export default redisPubSub;
