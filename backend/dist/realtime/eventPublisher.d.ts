export declare const GLOBAL_CHANNEL = "connect:events:global";
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
export declare function publishEntityEvent({ entity, action, entityId, data, scope, meta }: PublishEventOptions): Promise<{
    eventId: string;
    event: string;
    entity: string;
    entityId: string;
    action: string;
    timestamp: string;
    version: number;
    data: any;
    scope: {
        stateId: any;
        districtId: any;
        divisionId: any;
        pincodeId: any;
        targetUserId: any;
        role: string | null;
    };
    meta: {
        source: string;
        emittedAt: number;
    };
} | null>;
//# sourceMappingURL=eventPublisher.d.ts.map