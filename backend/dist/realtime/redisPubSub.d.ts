import { RealtimeEvent } from './eventTypes';
export declare const GLOBAL_REDIS_CHANNEL = "connect:global:events";
declare class RedisPubSubManager {
    private publisher;
    private subscriber;
    private localEmitter;
    private isRedisConnected;
    private seenEvents;
    private cleanupInterval;
    private metrics;
    constructor();
    private initClients;
    private startDedupCleanup;
    /**
     * Process raw message from Redis or in-memory bus, apply deduplication,
     * and emit to local subscribers.
     */
    private handleIncomingRawMessage;
    /**
     * Publish an event to the global channel.
     * If Redis is active, publishes via Redis so ALL backend instances receive it.
     * Also delivers locally.
     */
    publish(event: RealtimeEvent): Promise<boolean>;
    /**
     * Subscribe to events delivered to this backend node.
     */
    onEvent(callback: (event: RealtimeEvent) => void): () => void;
    /**
     * Status and observability check
     */
    getStatus(): {
        status: string;
        isRedisConnected: boolean;
        channel: string;
        metrics: {
            eventsPublished: number;
            eventsReceived: number;
            duplicatesDropped: number;
            lastEventTime: string | null;
            startedAt: string;
        };
        trackedEventsInWindow: number;
    };
}
export declare const redisPubSub: RedisPubSubManager;
export default redisPubSub;
//# sourceMappingURL=redisPubSub.d.ts.map