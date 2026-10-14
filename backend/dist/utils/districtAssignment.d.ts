/**
 * Validates whether an active approved District Agent is already assigned to a given district.
 * Enforces strictly maximum 1 active District Agent assignment per district.
 */
export declare function checkExistingDistrictAssignment(state: string, district: string, districtId?: string, excludeAgentId?: string, excludeEmail?: string): Promise<{
    exists: boolean;
    agent?: any;
}>;
//# sourceMappingURL=districtAssignment.d.ts.map