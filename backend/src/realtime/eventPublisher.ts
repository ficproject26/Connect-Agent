import { redisBroker } from './redisClient';

export const GLOBAL_CHANNEL = 'connect:events:global';

const recentEvents = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - 3000;
  for (const [key, timestamp] of recentEvents.entries()) {
    if (timestamp < cutoff) recentEvents.delete(key);
  }
}, 5000).unref();

export interface PublishEventOptions {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  entityId: string | number;
  data: any;
  scope?: {
    stateId?: string | null;
    districtId?: string | null;
    divisionId?: string | null;
    pincodeId?: string | null;
    targetUserId?: string | null;
    role?: string | null;
    [key: string]: any;
  };
  meta?: Record<string, any>;
}

export async function publishEntityEvent({
  entity,
  action,
  entityId,
  data,
  scope = {},
  meta = {}
}: PublishEventOptions) {
  if (!entity || !action || !entityId) return null;

  const startTime = Date.now();
  const eventName = `${String(entity).toUpperCase()}_${String(action).toUpperCase()}`;
  const strEntityId = String(entityId);

  const dedupKey = `${eventName}:${strEntityId}:${JSON.stringify(scope)}`;
  const lastPublished = recentEvents.get(dedupKey);
  if (lastPublished && (startTime - lastPublished) < 1000) {
    return null;
  }
  recentEvents.set(dedupKey, startTime);

  const eventPayload = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    event: eventName,
    entity: String(entity).toLowerCase(),
    entityId: strEntityId,
    action: String(action).toLowerCase(),
    timestamp: new Date().toISOString(),
    version: Date.now(),
    data: data || {},
    scope: {
      stateId: scope.stateId || scope.state || null,
      districtId: scope.districtId || scope.district || null,
      divisionId: scope.divisionId || scope.division || null,
      pincodeId: scope.pincodeId || scope.pincode || null,
      targetUserId: scope.targetUserId || scope.agentId || null,
      role: scope.role || null
    },
    meta: {
      source: 'agent-backend',
      emittedAt: startTime,
      ...meta
    }
  };

  try {
    await redisBroker.publish(GLOBAL_CHANNEL, eventPayload);
    const duration = Date.now() - startTime;
    console.log(`📡 [Agent Realtime Publisher] Broadcasted ${eventName} for ${entity}:${strEntityId} (${duration}ms)`);
    return eventPayload;
  } catch (err: any) {
    console.error(`❌ [Agent Realtime Publisher] Failed to publish ${eventName}:`, err.message);
    return null;
  }
}
