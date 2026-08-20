export interface TerritoryScope {
    role: string;
    state: string;
    district: string;
    division: string;
    pincode: string;
    agentId: string;
}
export declare function getAgentTerritoryScope(agentId: string): Promise<TerritoryScope | null>;
export declare function buildTerritoryFilter(scope: TerritoryScope | null): Record<string, any>;
export declare function buildVendorScopeFilter(scope: TerritoryScope | null): Record<string, any>;
//# sourceMappingURL=territoryScope.d.ts.map