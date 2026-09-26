import { RealtimeEvent, EntityName, RealtimeAction, EventScope } from './eventTypes';
import redisPubSub from './redisPubSub';
import cacheService from '../services/cache.service';

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

class EventBus {
  /**
   * Generates a collision-resistant unique event ID with timestamp prefix.
   */
  private generateEventId(): string {
    const timePart = Date.now().toString(36);
    const randPart = Math.random().toString(36).substring(2, 9);
    return `evt_${timePart}_${randPart}`;
  }

  /**
   * Automatically invalidates relevant backend caches when an entity is modified.
   */
  private async invalidateEntityCache(entity: string, entityId?: string, scope?: EventScope) {
    try {
      // Invalidate general entity query cache
      await cacheService.delByPrefix(`${entity}:`);
      await cacheService.delByPrefix(`list:${entity}`);

      // Invalidate specific entity ID cache
      if (entityId) {
        await cacheService.del(`${entity}:${entityId}`);
      }

      // Invalidate dashboard metrics caches if entity impacts KPIs
      if (['vendor', 'target', 'agent', 'wallet', 'ticket'].includes(entity)) {
        await cacheService.delByPrefix('dashboard:');
        await cacheService.delByPrefix('stats:');
        await cacheService.delByPrefix('leaderboard:');
      }

      // Invalidate territory scoped queries
      if (scope?.state) {
        await cacheService.delByPrefix(`territory:${scope.state}`);
      }
      if (scope?.district) {
        await cacheService.delByPrefix(`territory:${scope.district}`);
      }
    } catch (err: any) {
      console.warn('[EventBus] Cache invalidation warning:', err.message);
    }
  }

  /**
   * Main entry point to emit real-time state changes.
   * MUST be called strictly after database operations successfully resolve.
   */
  public async publish<T = any>(options: PublishEventOptions<T>): Promise<RealtimeEvent<T>> {
    const startTime = performance.now();

    const fullEvent: RealtimeEvent<T> = {
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
    this.invalidateEntityCache(fullEvent.entity, fullEvent.entityId, fullEvent.scope).catch(() => {});

    // 2. Publish to Redis Pub/Sub (and distributed subscribers)
    try {
      await redisPubSub.publish(fullEvent);
      const elapsedMs = (performance.now() - startTime).toFixed(2);
      console.log(
        `[RealtimeEventBus] Published ${fullEvent.event} (${fullEvent.entity}:${fullEvent.entityId}) action=${fullEvent.action} in ${elapsedMs}ms`
      );
    } catch (err: any) {
      console.error('[RealtimeEventBus] Failed to publish event:', err.message);
    }

    return fullEvent;
  }
}

export const eventBus = new EventBus();
export default eventBus;

/**
 * Convenience helper for publishing an entity change event.
 */
export async function publishEntityEvent<T = any>(options: PublishEventOptions<T>): Promise<RealtimeEvent<T>> {
  return eventBus.publish(options);
}
