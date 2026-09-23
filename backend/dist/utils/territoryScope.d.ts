export interface TerritoryScope {
    role: string;
    state: string;
    district: string;
    division: string;
    pincode: string;
    agentId: string;
}
/**
 * Fetch territory scope of the authenticated agent.
 * Checks both Agent model and fallback users collection.
 */
export declare function getAgentTerritoryScope(agentId: string): Promise<TerritoryScope | null>;
/**
 * Build territory filter for Agent model and agent directory queries.
 * Strictly enforces State -> District -> Division -> Pincode visibility hierarchy.
 * Returns { _id: null } when required territory information is missing.
 */
export declare function buildTerritoryFilter(scope: TerritoryScope | null): Record<string, any>;
/**
 * Build territory filter for Vendor queries.
 * Strictly enforces State -> District -> Division -> Pincode vendor isolation.
 */
export declare function buildVendorScopeFilter(scope: TerritoryScope | null): Record<string, any>;
//# sourceMappingURL=territoryScope.d.ts.map