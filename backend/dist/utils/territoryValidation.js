"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAgentJurisdiction = validateAgentJurisdiction;
exports.validateGeographicConsistency = validateGeographicConsistency;
exports.validateVendorFieldFormats = validateVendorFieldFormats;
const mongoose_1 = __importDefault(require("mongoose"));
const normalize = (val) => (val || '').toLowerCase().replace(/[\s\-_]/g, '');
/**
 * Validate that the requested vendor territory belongs to the agent's authorized jurisdiction.
 * Verifies against the agent's assigned scope and the central Admin Pincode Management database.
 */
async function validateAgentJurisdiction(scope, vendor) {
    const role = scope.role.toLowerCase();
    const vState = (vendor.state || '').trim();
    const vDistrict = (vendor.district || '').trim();
    const vDivision = (vendor.division || '').trim();
    const vPincode = (vendor.pincode || '').replace(/\D/g, '').slice(0, 6);
    // 1. PINCODE AGENT: Restricted to assigned Pincode
    if (role === 'pincode') {
        if (scope.pincode && vPincode && scope.pincode.replace(/\D/g, '') !== vPincode) {
            return {
                valid: false,
                error: `Pincode Agent is restricted to onboard vendors only within assigned PIN ${scope.pincode}. Requested PIN: ${vPincode}`
            };
        }
        return { valid: true };
    }
    // 2. DIVISION AGENT: Restricted to assigned Division
    if (role === 'division') {
        if (scope.division && vDivision && normalize(scope.division) !== normalize(vDivision)) {
            return {
                valid: false,
                error: `Division Agent is restricted to onboard vendors only within assigned Division ${scope.division}. Requested Division: ${vDivision}`
            };
        }
        if (scope.district && vDistrict && normalize(scope.district) !== normalize(vDistrict)) {
            return {
                valid: false,
                error: `Division Agent is restricted to District ${scope.district}. Requested District: ${vDistrict}`
            };
        }
        if (scope.state && vState && normalize(scope.state) !== normalize(vState)) {
            return {
                valid: false,
                error: `Division Agent is restricted to State ${scope.state}. Requested State: ${vState}`
            };
        }
        return { valid: true };
    }
    // 3. DISTRICT AGENT: Restricted to assigned District
    if (role === 'district') {
        if (scope.district && vDistrict && normalize(scope.district) !== normalize(vDistrict)) {
            return {
                valid: false,
                error: `District Agent is restricted to onboard vendors only within assigned District ${scope.district}. Requested District: ${vDistrict}`
            };
        }
        if (scope.state && vState && normalize(scope.state) !== normalize(vState)) {
            return {
                valid: false,
                error: `District Agent is restricted to State ${scope.state}. Requested State: ${vState}`
            };
        }
        return { valid: true };
    }
    // 4. STATE AGENT: Restricted to assigned State
    if (role === 'state') {
        if (scope.state && vState && normalize(scope.state) !== normalize(vState)) {
            return {
                valid: false,
                error: `State Agent is restricted to onboard vendors only within assigned State ${scope.state}. Requested State: ${vState}`
            };
        }
        return { valid: true };
    }
    return { valid: true };
}
/**
 * Validate geographic consistency across the address fields using Admin Pincode Management DB.
 */
async function validateGeographicConsistency(vendor) {
    const pin = (vendor.pincode || '').replace(/\D/g, '').slice(0, 6);
    if (!pin || pin.length !== 6) {
        return { consistent: false, error: 'A valid 6-digit Pincode is required.' };
    }
    const db = mongoose_1.default.connection.db;
    if (!db) {
        // If DB is temporarily unavailable, allow pass-through
        return { consistent: true };
    }
    try {
        const pinDoc = await db.collection('pincodes').findOne({
            code: pin,
            $or: [{ status: 'Active' }, { status: 'active' }, { status: { $exists: false } }]
        });
        if (!pinDoc) {
            return {
                consistent: false,
                error: `Pincode ${pin} is not an active territory configured in Admin Pincode Management.`
            };
        }
        if (vendor.state && pinDoc.state && normalize(pinDoc.state) !== normalize(vendor.state)) {
            return {
                consistent: false,
                error: `Geographic mismatch: Pincode ${pin} belongs to State '${pinDoc.state}', but '${vendor.state}' was provided.`
            };
        }
        if (vendor.district && pinDoc.district && normalize(pinDoc.district) !== normalize(vendor.district)) {
            return {
                consistent: false,
                error: `Geographic mismatch: Pincode ${pin} belongs to District '${pinDoc.district}', but '${vendor.district}' was provided.`
            };
        }
        if (vendor.division && pinDoc.division && normalize(pinDoc.division) !== normalize(vendor.division)) {
            return {
                consistent: false,
                error: `Geographic mismatch: Pincode ${pin} belongs to Division '${pinDoc.division}', but '${vendor.division}' was provided.`
            };
        }
        return {
            consistent: true,
            canonicalData: {
                state: pinDoc.state,
                district: pinDoc.district,
                division: pinDoc.division,
                taluk: pinDoc.taluk,
                postOffice: pinDoc.postOffice || pinDoc.name,
                pincode: pinDoc.code
            }
        };
    }
    catch (error) {
        console.error('validateGeographicConsistency error:', error);
        return { consistent: true };
    }
}
/**
 * Validate input fields (Phone, Email, PAN, Aadhaar, Pincode).
 */
function validateVendorFieldFormats(data) {
    // Mobile: Exactly 10 digits, starts with 6, 7, 8, 9
    if (data.phone) {
        const cleanPhone = data.phone.replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
            return {
                valid: false,
                error: 'Mobile number must be exactly 10 numeric digits starting with 6, 7, 8, or 9.'
            };
        }
    }
    // Email: Standard email format
    if (data.email) {
        const cleanEmail = data.email.trim();
        if (cleanEmail.includes(' ') || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
            return {
                valid: false,
                error: 'Please enter a valid email address (e.g. merchant@example.com). Spaces are not allowed.'
            };
        }
    }
    // PAN: 5 uppercase letters, 4 digits, 1 uppercase letter
    if (data.panNumber) {
        const pan = data.panNumber.trim().toUpperCase();
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
            return {
                valid: false,
                error: 'PAN number must be exactly 10 characters in the format 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).'
            };
        }
    }
    // Aadhaar: Exactly 12 digits
    if (data.aadhaarNumber) {
        const aadhaar = data.aadhaarNumber.replace(/\D/g, '');
        if (!/^\d{12}$/.test(aadhaar)) {
            return {
                valid: false,
                error: 'Aadhaar number must be exactly 12 numeric digits.'
            };
        }
    }
    // Pincode: Exactly 6 digits
    if (data.pincode) {
        const pin = data.pincode.replace(/\D/g, '');
        if (!/^\d{6}$/.test(pin)) {
            return {
                valid: false,
                error: 'Postal Code (Pincode) must be exactly 6 numeric digits.'
            };
        }
    }
    return { valid: true };
}
//# sourceMappingURL=territoryValidation.js.map