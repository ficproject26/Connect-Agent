import { TerritoryScope } from './territoryScope';
/**
 * Validate that the requested vendor territory belongs to the agent's authorized jurisdiction.
 * Verifies against the agent's assigned scope and the central Admin Pincode Management database.
 */
export declare function validateAgentJurisdiction(scope: TerritoryScope, vendor: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
}): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Validate geographic consistency across the address fields using Admin Pincode Management DB.
 */
export declare function validateGeographicConsistency(vendor: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
}): Promise<{
    consistent: boolean;
    error?: string;
    canonicalData?: any;
}>;
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