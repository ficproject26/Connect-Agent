"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
exports.publishEntityEvent = publishEntityEvent;
const redisPubSub_1 = __importDefault(require("./redisPubSub"));
const cache_service_1 = __importDefault(require("../services/cache.service"));
class EventBus {
    /**
     * Generates a collision-resistant unique event ID with timestamp prefix.
     */
    generateEventId() {
        const timePart = Date.now().toString(36);
        const randPart = Math.random().toString(36).substring(2, 9);
        return `evt_${timePart}_${randPart}`;
    }
    /**
     * Automatically invalidates relevant backend caches when an entity is modified.
     */
    async invalidateEntityCache(entity, entityId, scope) {
        try {
            // Invalidate general entity query cache
            await cache_service_1.default.delByPrefix(`${entity}:`);
            await cache_service_1.default.delByPrefix(`list:${entity}`);
            // Invalidate specific entity ID cache
            if (entityId) {
                await cache_service_1.default.del(`${entity}:${entityId}`);
            }
            // Invalidate dashboard metrics caches if entity impacts KPIs
            if (['vendor', 'target', 'agent', 'wallet', 'ticket'].includes(entity)) {
                await cache_service_1.default.delByPrefix('dashboard:');
                await cache_service_1.default.delByPrefix('stats:');
                await cache_service_1.default.delByPrefix('leaderboard:');
            }
            // Invalidate territory scoped queries
            if (scope?.state) {
                await cache_service_1.default.delByPrefix(`territory:${scope.state}`);
            }
            if (scope?.district) {
                await cache_service_1.default.delByPrefix(`territory:${scope.district}`);
            }
        }
        catch (err) {
            console.warn('[EventBus] Cache invalidation warning:', err.message);
        }
    }
    /**
     * Main entry point to emit real-time state changes.
     * MUST be called strictly after database operations successfully resolve.
     */
    async publish(options) {
        const startTime = performance.now();
        const fullEvent = {
            eventId: this.generateEventId(),
            event: options.event || `ENTITY_${options.action.toUpperCase()}`,
            entity: options.entity,
            entityId: options.entityId,
            action: options.action,
            timestamp: new Date().toISOString(),
            version: options.version || Date.now(),
            scope: options.scope,
            data: options.data
        };
        // 1. Invalidate backend cache
        this.invalidateEntityCache(fullEvent.entity, fullEvent.entityId, fullEvent.scope).catch(() => { });
        // 2. Publish to Redis Pub/Sub (and distributed subscribers)
        try {
            await redisPubSub_1.default.publish(fullEvent);
            const elapsedMs = (performance.now() - startTime).toFixed(2);
            console.log(`[RealtimeEventBus] Published ${fullEvent.event} (${fullEvent.entity}:${fullEvent.entityId}) action=${fullEvent.action} in ${elapsedMs}ms`);
        }
        catch (err) {
            console.error('[RealtimeEventBus] Failed to publish event:', err.message);
        }
        return fullEvent;
    }
}
exports.eventBus = new EventBus();
exports.default = exports.eventBus;
/**
 * Convenience helper for publishing an entity change event.
 */
async function publishEntityEvent(options) {
    return exports.eventBus.publish(options);
}
//# sourceMappingURL=eventBus.js.map