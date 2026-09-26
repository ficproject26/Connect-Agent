import { RealtimeEvent, EntityName, RealtimeAction, EventScope } from './eventTypes';
export interface PublishEventOptions<T = any> {
    event?: string;
    entity: EntityName | string;
    entityId: string;
    action: RealtimeAction;
    scope?: EventScope;
    data?: T;
    version?: number;
    actorId?: string;
}
declare class EventBus {
    /**
     * Generates a collision-resistant unique event ID with timestamp prefix.
     */
    private generateEventId;
    /**
     * Automatically invalidates relevant backend caches when an entity is modified.
     */
    private invalidateEntityCache;
    /**
     * Main entry point to emit real-time state changes.
     * MUST be called strictly after database operations successfully resolve.
     */
    publish<T = any>(options: PublishEventOptions<T>): Promise<RealtimeEvent<T>>;
}
export declare const eventBus: EventBus;
export default eventBus;
/**
 * Convenience helper for publishing an entity change event.
 */
export declare function publishEntityEvent<T = any>(options: PublishEventOptions<T>): Promise<RealtimeEvent<T>>;
//# sourceMappingURL=eventBus.d.ts.map