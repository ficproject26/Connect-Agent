"use strict";
// Centralized Backend Territory & Input Validation Helper for Vendor Onboarding
Object.defineProperty(exports, "__esModule", { value: true });
exports.PINCODE_DIRECTORY = void 0;
exports.validateAgentJurisdiction = validateAgentJurisdiction;
exports.validateGeographicConsistency = validateGeographicConsistency;
exports.validateVendorFieldFormats = validateVendorFieldFormats;
exports.PINCODE_DIRECTORY = {
    // Tamil Nadu - Dharmapuri District
    "636903": { state: "Tamil Nadu", division: "Harur Division", district: "Dharmapuri", taluk: "Harur", postOffice: "Harur Head Post Office" },
    "636906": { state: "Tamil Nadu", division: "Harur Division", district: "Dharmapuri", taluk: "Harur", postOffice: "Morappur Sub Post Office" },
    "636902": { state: "Tamil Nadu", division: "Harur Division", district: "Dharmapuri", taluk: "Harur", postOffice: "Kambainallur Post Office" },
    "636701": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Dharmapuri", taluk: "Dharmapuri", postOffice: "Dharmapuri Head Post Office" },
    "636702": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Dharmapuri", taluk: "Dharmapuri", postOffice: "Collectorate Post Office" },
    "636703": { state: "Tamil Nadu", division: "Dharmapuri Division", district: "Dharmapuri", taluk: "Dharmapuri", postOffice: "Adhiyamankottai Post Office" },
    "636808": { state: "Tamil Nadu", division: "Palacode Division", district: "Dharmapuri", taluk: "Palacode", postOffice: "Palacode Head Post Office" },
    "636809": { state: "Tamil Nadu", division: "Palacode Division", district: "Dharmapuri", taluk: "Palacode", postOffice: "Marandahalli Post Office" },
    // Tamil Nadu - Krishnagiri District
    "635109": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", taluk: "Hosur", postOffice: "Hosur Head Post Office" },
    "635110": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", taluk: "Hosur", postOffice: "Sipcot Industrial Post Office" },
    "635126": { state: "Tamil Nadu", division: "Hosur Division", district: "Krishnagiri", taluk: "Hosur", postOffice: "Mathigiri Post Office" },
    "635001": { state: "Tamil Nadu", division: "Krishnagiri Division", district: "Krishnagiri", taluk: "Krishnagiri", postOffice: "Krishnagiri Head Post Office" },
    "635002": { state: "Tamil Nadu", division: "Krishnagiri Division", district: "Krishnagiri", taluk: "Krishnagiri", postOffice: "Kattivasanpet Post Office" },
    "635107": { state: "Tamil Nadu", division: "Denkanikottai Division", district: "Krishnagiri", taluk: "Denkanikottai", postOffice: "Denkanikottai Post Office" },
    "635114": { state: "Tamil Nadu", division: "Denkanikottai Division", district: "Krishnagiri", taluk: "Denkanikottai", postOffice: "Thally Post Office" },
    "635206": { state: "Tamil Nadu", division: "Pochampalli Division", district: "Krishnagiri", taluk: "Pochampalli", postOffice: "Pochampalli Post Office" },
    // Tamil Nadu - Salem District
    "636001": { state: "Tamil Nadu", division: "Salem Urban Division", district: "Salem", taluk: "Salem", postOffice: "Salem Head Post Office" },
    "636002": { state: "Tamil Nadu", division: "Salem Urban Division", district: "Salem", taluk: "Salem", postOffice: "Shevapet Post Office" },
    "636007": { state: "Tamil Nadu", division: "Salem West Division", district: "Salem", taluk: "Salem West", postOffice: "Karuppur Post Office" },
    "636008": { state: "Tamil Nadu", division: "Salem West Division", district: "Salem", taluk: "Salem West", postOffice: "Suramangalam Post Office" },
    "636112": { state: "Tamil Nadu", division: "Attur Division", district: "Salem", taluk: "Attur", postOffice: "Attur Post Office" },
    "636113": { state: "Tamil Nadu", division: "Attur Division", district: "Salem", taluk: "Attur", postOffice: "Thalaivasal Post Office" },
    // Tamil Nadu - Chennai District
    "600001": { state: "Tamil Nadu", division: "Chennai Central Division", district: "Chennai", taluk: "Chennai Central", postOffice: "Chennai G.P.O." },
    "600002": { state: "Tamil Nadu", division: "Chennai Central Division", district: "Chennai", taluk: "Chennai Central", postOffice: "Anna Salai Post Office" },
    "600010": { state: "Tamil Nadu", division: "Chennai North Division", district: "Chennai", taluk: "Kilpauk", postOffice: "Kilpauk Post Office" },
    "600028": { state: "Tamil Nadu", division: "Chennai South Division", district: "Chennai", taluk: "Mylapore", postOffice: "R.A. Puram Post Office" },
    // Andhra Pradesh - NTR District
    "520001": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Vijayawada Head Post Office" },
    "520002": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Governorpet Post Office" },
    "520003": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Labbipet Post Office" },
    "520010": { state: "Andhra Pradesh", division: "Vijayawada Central Division", district: "NTR District", taluk: "Vijayawada Urban", postOffice: "Patamata Post Office" },
    "521235": { state: "Andhra Pradesh", division: "Tiruvuru Division", district: "NTR District", taluk: "Tiruvuru", postOffice: "Tiruvuru Post Office" },
    "521185": { state: "Andhra Pradesh", division: "Nandigama Division", district: "NTR District", taluk: "Nandigama", postOffice: "Nandigama Post Office" },
    // Andhra Pradesh - Visakhapatnam District
    "530001": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "Visakhapatnam Head Post Office" },
    "530016": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "Dwarakanagar Post Office" },
    "530017": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "MVP Colony Post Office" },
    "530026": { state: "Andhra Pradesh", division: "Vizag City Division", district: "Visakhapatnam", taluk: "Visakhapatnam Urban", postOffice: "Gajuwaka Post Office" },
    "531001": { state: "Andhra Pradesh", division: "Anakapalle Division", district: "Visakhapatnam", taluk: "Anakapalle", postOffice: "Anakapalle Head Post Office" },
    "531163": { state: "Andhra Pradesh", division: "Bheemunipatnam Division", district: "Visakhapatnam", taluk: "Bheemunipatnam", postOffice: "Bheemunipatnam Post Office" },
    // Andhra Pradesh - Guntur District
    "522001": { state: "Andhra Pradesh", division: "Guntur Urban Division", district: "Guntur", taluk: "Guntur Urban", postOffice: "Guntur Head Post Office" },
    "522002": { state: "Andhra Pradesh", division: "Guntur Urban Division", district: "Guntur", taluk: "Guntur Urban", postOffice: "Arundalpet Post Office" },
    "522201": { state: "Andhra Pradesh", division: "Tenali Division", district: "Guntur", taluk: "Tenali", postOffice: "Tenali Head Post Office" },
    "522601": { state: "Andhra Pradesh", division: "Narasaraopet Division", district: "Guntur", taluk: "Narasaraopet", postOffice: "Narasaraopet Post Office" },
    // Andhra Pradesh - Tirupati District
    "517501": { state: "Andhra Pradesh", division: "Tirupati Urban Division", district: "Tirupati", taluk: "Tirupati Urban", postOffice: "Tirupati Head Post Office" },
    "517507": { state: "Andhra Pradesh", division: "Tirupati Urban Division", district: "Tirupati", taluk: "Tirupati Urban", postOffice: "Tirumala Post Office" },
    "517644": { state: "Andhra Pradesh", division: "Srikalahasti Division", district: "Tirupati", taluk: "Srikalahasti", postOffice: "Srikalahasti Post Office" },
    "524101": { state: "Andhra Pradesh", division: "Gudur Division", district: "Tirupati", taluk: "Gudur", postOffice: "Gudur Post Office" },
    // Andhra Pradesh - Nellore District
    "524001": { state: "Andhra Pradesh", division: "Nellore Division", district: "Nellore", taluk: "Nellore", postOffice: "Nellore Head Post Office" },
    "524201": { state: "Andhra Pradesh", division: "Kavali Division", district: "Nellore", taluk: "Kavali", postOffice: "Kavali Post Office" },
    // Andhra Pradesh - Kurnool District
    "518001": { state: "Andhra Pradesh", division: "Kurnool Urban Division", district: "Kurnool", taluk: "Kurnool", postOffice: "Kurnool Head Post Office" },
    "518301": { state: "Andhra Pradesh", division: "Adoni Division", district: "Kurnool", taluk: "Adoni", postOffice: "Adoni Post Office" },
    "518501": { state: "Andhra Pradesh", division: "Nandyal Division", district: "Kurnool", taluk: "Nandyal", postOffice: "Nandyal Post Office" },
    // Andhra Pradesh - Anantapur District
    "515001": { state: "Andhra Pradesh", division: "Anantapur Urban Division", district: "Anantapur", taluk: "Anantapur", postOffice: "Anantapur Head Post Office" },
    "515671": { state: "Andhra Pradesh", division: "Dharmavaram Division", district: "Anantapur", taluk: "Dharmavaram", postOffice: "Dharmavaram Post Office" },
    "515201": { state: "Andhra Pradesh", division: "Hindupur Division", district: "Anantapur", taluk: "Hindupur", postOffice: "Hindupur Post Office" },
    // Karnataka - Bengaluru Urban
    "560001": { state: "Karnataka", division: "Bengaluru South Division", district: "Bengaluru Urban", taluk: "Bengaluru South", postOffice: "Bengaluru G.P.O." },
    "560002": { state: "Karnataka", division: "Bengaluru South Division", district: "Bengaluru Urban", taluk: "Bengaluru South", postOffice: "City Market Post Office" },
    "560003": { state: "Karnataka", division: "Bengaluru North Division", district: "Bengaluru Urban", taluk: "Bengaluru North", postOffice: "Malleshwaram Post Office" },
    "560008": { state: "Karnataka", division: "Bengaluru East Division", district: "Bengaluru Urban", taluk: "Bengaluru East", postOffice: "Halasuru Post Office" },
    "560010": { state: "Karnataka", division: "Bengaluru West Division", district: "Bengaluru Urban", taluk: "Bengaluru West", postOffice: "Rajajinagar Post Office" },
    "560072": { state: "Karnataka", division: "Bengaluru West Division", district: "Bengaluru Urban", taluk: "Bengaluru West", postOffice: "Nagarbhavi Post Office" },
    "560100": { state: "Karnataka", division: "Electronic City Division", district: "Bengaluru Urban", taluk: "Anekal", postOffice: "Electronic City Post Office" },
    "560066": { state: "Karnataka", division: "Whitefield Division", district: "Bengaluru Urban", taluk: "KR Puram", postOffice: "Whitefield Post Office" },
    // Telangana - Hyderabad
    "500001": { state: "Telangana", division: "Hyderabad Central Division", district: "Hyderabad", taluk: "Nampally", postOffice: "Hyderabad G.P.O." },
    "500002": { state: "Telangana", division: "Charminar Division", district: "Hyderabad", taluk: "Charminar", postOffice: "Charminar Post Office" },
    "500003": { state: "Telangana", division: "Secunderabad Division", district: "Hyderabad", taluk: "Secunderabad", postOffice: "Secunderabad Head Post Office" },
    "500081": { state: "Telangana", division: "Cyberabad Division", district: "Hyderabad", taluk: "Serilingampally", postOffice: "Madhapur Post Office" }
};
const normalize = (val) => (val || '').trim().toLowerCase().replace(' district', '').replace(' division', '');
/**
 * Validate that the requested vendor territory belongs to the agent's jurisdiction.
 */
function validateAgentJurisdiction(scope, vendor) {
    const role = (scope.role || 'pincode').toLowerCase();
    const vPincode = (vendor.pincode || '').trim();
    const vState = (vendor.state || '').trim();
    const vDistrict = (vendor.district || '').trim();
    const vDivision = (vendor.division || '').trim();
    // 1. PINCODE AGENT: Restricted to exact approved Pincode
    if (role === 'pincode') {
        if (scope.pincode && vPincode !== scope.pincode.trim()) {
            return {
                valid: false,
                error: `Pincode Agent is restricted to onboard vendors only in approved Pincode ${scope.pincode}. Requested Pincode: ${vPincode}`
            };
        }
        if (scope.state && vState && normalize(scope.state) !== normalize(vState)) {
            return {
                valid: false,
                error: `Pincode Agent is restricted to State ${scope.state}. Requested State: ${vState}`
            };
        }
        if (scope.district && vDistrict && normalize(scope.district) !== normalize(vDistrict)) {
            return {
                valid: false,
                error: `Pincode Agent is restricted to District ${scope.district}. Requested District: ${vDistrict}`
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
        // Verify Pincode belongs to Division if mapped in directory
        const dirEntry = exports.PINCODE_DIRECTORY[vPincode];
        if (dirEntry && scope.division && normalize(dirEntry.division) !== normalize(scope.division)) {
            return {
                valid: false,
                error: `Requested Pincode ${vPincode} belongs to ${dirEntry.division}, not your assigned Division ${scope.division}.`
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
        // Verify Pincode belongs to District if mapped in directory
        const dirEntry = exports.PINCODE_DIRECTORY[vPincode];
        if (dirEntry && scope.district && normalize(dirEntry.district) !== normalize(scope.district)) {
            return {
                valid: false,
                error: `Requested Pincode ${vPincode} belongs to ${dirEntry.district}, not your assigned District ${scope.district}.`
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
        // Verify Pincode belongs to State if mapped in directory
        const dirEntry = exports.PINCODE_DIRECTORY[vPincode];
        if (dirEntry && scope.state && normalize(dirEntry.state) !== normalize(scope.state)) {
            return {
                valid: false,
                error: `Requested Pincode ${vPincode} belongs to ${dirEntry.state}, not your assigned State ${scope.state}.`
            };
        }
        return { valid: true };
    }
    return { valid: true };
}
/**
 * Validate geographic consistency across the address fields.
 */
function validateGeographicConsistency(vendor) {
    const pin = (vendor.pincode || '').trim();
    const dirEntry = exports.PINCODE_DIRECTORY[pin];
    if (dirEntry) {
        if (vendor.state && normalize(dirEntry.state) !== normalize(vendor.state)) {
            return {
                consistent: false,
                error: `Geographic mismatch: Pincode ${pin} belongs to State '${dirEntry.state}', but '${vendor.state}' was provided.`
            };
        }
        if (vendor.district && normalize(dirEntry.district) !== normalize(vendor.district)) {
            return {
                consistent: false,
                error: `Geographic mismatch: Pincode ${pin} belongs to District '${dirEntry.district}', but '${vendor.district}' was provided.`
            };
        }
    }
    return { consistent: true };
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