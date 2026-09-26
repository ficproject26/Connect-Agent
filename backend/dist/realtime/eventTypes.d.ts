/**
 * Realtime Event Types & Standards
 * Centralized schema for all event-driven real-time communication
 * across backend services, Redis Pub/Sub, and WebSocket clients.
 */
export type RealtimeAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'assigned' | 'transacted' | 'verified' | 'rejected' | 'completed' | string;
export type EntityName = 'agent' | 'vendor' | 'target' | 'wallet' | 'ticket' | 'notification' | 'attendance' | 'fieldVisit' | 'report' | 'territory' | 'system';
export interface EventScope {
    /** Geographic territory scoping */
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
    /** Role-based filtering */
    roles?: string[];
    /** Direct recipient agent ID */
    targetAgentId?: string;
    /** Senders can optionally be excluded from echo updates */
    excludeAgentId?: string;
    /** Explicit public broadcast flag */
    isPublic?: boolean;
}
export interface RealtimeEvent<T = any> {
    eventId: string;
    event: string;
    entity: EntityName | string;
    entityId: string;
    action: RealtimeAction;
    timestamp: string;
    version: number;
    scope?: EventScope;
    data?: T;
}
export interface ClientConnectionInfo {
    agentId: string;
    role: string;
    email: string;
    territory?: {
        state?: string;
        district?: string;
        division?: string;
        pincode?: string;
    };
    connectedAt: Date;
}
//# sourceMappingURL=eventTypes.d.ts.map