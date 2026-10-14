export interface TerritoryScope {
    role: string;
    state: string;
    district: string;
    division: string;
    pincode: string;
    agentId: string;
}
/**
 * Invalidate cached territory scope when agent details change
 */
export declare function invalidateAgentTerritoryScope(agentId: string): Promise<void>;
/**
 * Fetch territory scope of the authenticated agent.
 * Checks cache first, then Agent model and fallback users collection using tight projections.
 */
export declare function getAgentTerritoryScope(agentId: string, email?: string): Promise<TerritoryScope | null>;
/**
 * Fetch authoritative pincodes assigned to a division from Admin Pincode Management DB
 */
export declare function getDivisionPincodes(divisionName: string): Promise<string[]>;
/**
 * Build territory filter for Agent model and agent directory queries.
 * Strictly enforces State -> District -> Division -> Pincode visibility hierarchy.
 * Returns { _id: null } when required territory information is missing.
 */
export declare function buildTerritoryFilter(scope: TerritoryScope | null, divisionPincodes?: string[]): Record<string, any>;
/**
 * Build territory filter for Vendor queries.
 * Strictly enforces State -> District -> Division -> Pincode vendor isolation.
 */
export declare function buildVendorScopeFilter(scope: TerritoryScope | null, divisionPincodes?: string[]): Record<string, any>;
//# sourceMappingURL=territoryScope.d.ts.map