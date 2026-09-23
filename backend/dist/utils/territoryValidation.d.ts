export interface TerritoryScope {
    role: string;
    state: string;
    district: string;
    division: string;
    pincode: string;
    agentId: string;
}
export interface LocationEntry {
    state: string;
    division: string;
    district: string;
    taluk: string;
    postOffice: string;
}
export declare const PINCODE_DIRECTORY: Record<string, LocationEntry>;
/**
 * Validate that the requested vendor territory belongs to the agent's jurisdiction.
 */
export declare function validateAgentJurisdiction(scope: TerritoryScope, vendor: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
}): {
    valid: boolean;
    error?: string;
};
/**
 * Validate geographic consistency across the address fields.
 */
export declare function validateGeographicConsistency(vendor: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
}): {
    consistent: boolean;
    error?: string;
};
/**
 * Validate input fields (Phone, Email, PAN, Aadhaar, Pincode).
 */
export declare function validateVendorFieldFormats(data: {
    phone?: string;
    email?: string;
    panNumber?: string;
    aadhaarNumber?: string;
    pincode?: string;
}): {
    valid: boolean;
    error?: string;
};
//# sourceMappingURL=territoryValidation.d.ts.map