"use strict";
/**
 * Connect App — Global Form Validation Utility (Backend)
 * Consistent validation rules across Customer, Vendor, Agent, Manager, Admin, and Sub Admin endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMax18DobString = exports.isAtLeast18YearsOld = exports.calculateAge = exports.isValidIfsc = exports.formatIfsc = exports.IFSC_REGEX = exports.maskAccountNumber = exports.validateBankAccount = exports.sanitizeAccountNumber = exports.getBankRule = exports.BANK_SPECIFIC_RULES = exports.isValidPan = exports.formatPan = exports.PAN_REGEX = exports.maskAadhaar = exports.isValidAadhaar = exports.sanitizeAadhaar = exports.AADHAAR_REGEX = exports.isValidPassword = exports.validatePassword = exports.PASSWORD_REGEX = exports.isValidIndianMobile = exports.sanitizeIndianMobile = exports.INDIAN_MOBILE_REGEX = exports.isValidEmail = exports.normalizeEmail = exports.EMAIL_REGEX = exports.isValidName = exports.formatName = void 0;
// -------------------------------------------------------------
// 1. NAME VALIDATION & FORMATTING
// -------------------------------------------------------------
/**
 * Automatically capitalizes the first alphabetic character of each word.
 * Preserves spaces between words.
 * Prevents leading spaces.
 * Example: 'rathika' -> 'Rathika', 'rathika rani' -> 'Rathika Rani', 'dr. a.p.j. abdul kalam' -> 'Dr. A.P.J. Abdul Kalam'
 */
const formatName = (value) => {
    if (!value)
        return '';
    const trimmedLeading = value.replace(/^\s+/, '');
    return trimmedLeading.replace(/(?:^|[\s.'\-])\p{L}/gu, (char) => char.toUpperCase());
};
exports.formatName = formatName;
/**
 * Validates personal and business names:
 * - 2 to 100 characters
 * - Supports alphabetic characters (including Unicode/regional languages), spaces, dots, hyphens, and apostrophes
 * - Rejects values containing only spaces or invalid characters
 */
const isValidName = (value, minLength = 2, maxLength = 100) => {
    if (!value || typeof value !== 'string')
        return false;
    const trimmed = value.trim();
    if (trimmed.length < minLength || trimmed.length > maxLength)
        return false;
    // Unicode-aware regex for letters and punctuation in legitimate names
    const nameRegex = /^[\p{L}\p{M}]+(?:[.'\s\-][\p{L}\p{M}]+)*$/u;
    return nameRegex.test(trimmed);
};
exports.isValidName = isValidName;
// -------------------------------------------------------------
// 2. EMAIL VALIDATION & NORMALIZATION
// -------------------------------------------------------------
exports.EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const normalizeEmail = (email) => {
    return String(email || '').toLowerCase().trim();
};
exports.normalizeEmail = normalizeEmail;
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string')
        return false;
    const trimmed = email.trim();
    if (trimmed.includes(' '))
        return false;
    const atMatches = trimmed.match(/@/g);
    if (!atMatches || atMatches.length !== 1)
        return false;
    const parts = trimmed.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1])
        return false;
    const domainParts = parts[1].split('.');
    if (domainParts.length < 2)
        return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2)
        return false;
    return exports.EMAIL_REGEX.test(trimmed);
};
exports.isValidEmail = isValidEmail;
// -------------------------------------------------------------
// 3. INDIAN MOBILE NUMBER VALIDATION
// -------------------------------------------------------------
exports.INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const sanitizeIndianMobile = (val) => {
    if (!val)
        return '';
    let clean = String(val).trim().replace(/\D/g, '');
    if (clean.length === 12 && clean.startsWith('91')) {
        clean = clean.slice(2);
    }
    return clean.slice(0, 10);
};
exports.sanitizeIndianMobile = sanitizeIndianMobile;
const isValidIndianMobile = (val) => {
    if (!val || typeof val !== 'string')
        return false;
    const trimmed = val.trim();
    const withoutPlus = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
    if (/\D/.test(withoutPlus))
        return false;
    let digits = withoutPlus;
    if (digits.length === 12 && digits.startsWith('91')) {
        digits = digits.slice(2);
    }
    if (digits.length !== 10)
        return false;
    return exports.INDIAN_MOBILE_REGEX.test(digits);
};
exports.isValidIndianMobile = isValidIndianMobile;
// -------------------------------------------------------------
// 4. PASSWORD VALIDATION
// -------------------------------------------------------------
exports.PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{6,}$/;
const validatePassword = (password) => {
    const errors = [];
    if (!password || password.length < 6) {
        errors.push('Password must be at least 6 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter (A-Z).');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one numeric digit (0-9).');
    }
    if (!/[^A-Za-z0-9\s]/.test(password)) {
        errors.push('Password must contain at least one special character (e.g. !@#$%^&*).');
    }
    return {
        valid: errors.length === 0,
        errors
    };
};
exports.validatePassword = validatePassword;
const isValidPassword = (password) => {
    return exports.PASSWORD_REGEX.test(password || '');
};
exports.isValidPassword = isValidPassword;
// -------------------------------------------------------------
// 5. AADHAAR NUMBER VALIDATION & MASKING
// -------------------------------------------------------------
exports.AADHAAR_REGEX = /^[0-9]{12}$/;
const sanitizeAadhaar = (val) => {
    return String(val || '').replace(/\D/g, '').slice(0, 12);
};
exports.sanitizeAadhaar = sanitizeAadhaar;
const isValidAadhaar = (val) => {
    if (!val || typeof val !== 'string')
        return false;
    const trimmed = val.trim();
    return exports.AADHAAR_REGEX.test(trimmed);
};
exports.isValidAadhaar = isValidAadhaar;
const maskAadhaar = (val) => {
    const clean = (0, exports.sanitizeAadhaar)(val);
    if (clean.length !== 12)
        return val;
    return `XXXX-XXXX-${clean.slice(-4)}`;
};
exports.maskAadhaar = maskAadhaar;
// -------------------------------------------------------------
// 6. PAN CARD VALIDATION & FORMATTING
// -------------------------------------------------------------
exports.PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const formatPan = (val) => {
    return String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};
exports.formatPan = formatPan;
const isValidPan = (val) => {
    if (!val || typeof val !== 'string')
        return false;
    const trimmed = val.trim().toUpperCase();
    return exports.PAN_REGEX.test(trimmed);
};
exports.isValidPan = isValidPan;
exports.BANK_SPECIFIC_RULES = {
    sbi: {
        name: 'State Bank of India',
        minLen: 11,
        maxLen: 17,
        description: 'SBI account numbers are typically 11 digits (or up to 17 digits with system zeros).'
    },
    hdfc: {
        name: 'HDFC Bank',
        minLen: 14,
        maxLen: 14,
        exactLen: 14,
        description: 'HDFC Bank account numbers are exactly 14 digits.'
    },
    icici: {
        name: 'ICICI Bank',
        minLen: 12,
        maxLen: 12,
        exactLen: 12,
        description: 'ICICI Bank account numbers are exactly 12 digits.'
    },
    axis: {
        name: 'Axis Bank',
        minLen: 15,
        maxLen: 15,
        exactLen: 15,
        description: 'Axis Bank account numbers are exactly 15 digits.'
    },
    pnb: {
        name: 'Punjab National Bank',
        minLen: 16,
        maxLen: 16,
        exactLen: 16,
        description: 'PNB account numbers are exactly 16 digits.'
    },
    bob: {
        name: 'Bank of Baroda',
        minLen: 14,
        maxLen: 14,
        exactLen: 14,
        description: 'Bank of Baroda account numbers are exactly 14 digits.'
    },
    canara: {
        name: 'Canara Bank',
        minLen: 13,
        maxLen: 13,
        exactLen: 13,
        description: 'Canara Bank account numbers are exactly 13 digits.'
    },
    union: {
        name: 'Union Bank of India',
        minLen: 15,
        maxLen: 15,
        exactLen: 15,
        description: 'Union Bank account numbers are exactly 15 digits.'
    },
    kotak: {
        name: 'Kotak Mahindra Bank',
        minLen: 10,
        maxLen: 10,
        exactLen: 10,
        description: 'Kotak Mahindra Bank account numbers are exactly 10 digits.'
    },
    indian: {
        name: 'Indian Bank',
        minLen: 9,
        maxLen: 10,
        description: 'Indian Bank account numbers are 9 to 10 digits.'
    }
};
const getBankRule = (bankName) => {
    if (!bankName)
        return null;
    const lower = bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (lower.includes('sbi') || lower.includes('statebank'))
        return exports.BANK_SPECIFIC_RULES.sbi;
    if (lower.includes('hdfc'))
        return exports.BANK_SPECIFIC_RULES.hdfc;
    if (lower.includes('icici'))
        return exports.BANK_SPECIFIC_RULES.icici;
    if (lower.includes('axis'))
        return exports.BANK_SPECIFIC_RULES.axis;
    if (lower.includes('pnb') || lower.includes('punjabnational'))
        return exports.BANK_SPECIFIC_RULES.pnb;
    if (lower.includes('baroda') || lower.includes('bob'))
        return exports.BANK_SPECIFIC_RULES.bob;
    if (lower.includes('canara'))
        return exports.BANK_SPECIFIC_RULES.canara;
    if (lower.includes('unionbank') || lower.includes('union'))
        return exports.BANK_SPECIFIC_RULES.union;
    if (lower.includes('kotak'))
        return exports.BANK_SPECIFIC_RULES.kotak;
    if (lower.includes('indianbank'))
        return exports.BANK_SPECIFIC_RULES.indian;
    return null;
};
exports.getBankRule = getBankRule;
const sanitizeAccountNumber = (value) => {
    if (!value)
        return '';
    return String(value).replace(/\D/g, '').slice(0, 20);
};
exports.sanitizeAccountNumber = sanitizeAccountNumber;
const validateBankAccount = (accountNumber, bankName) => {
    if (!accountNumber) {
        return { valid: false, error: 'Account number is required.' };
    }
    const strVal = String(accountNumber).trim();
    if (/\D/.test(strVal)) {
        return { valid: false, error: 'Account number must contain numeric digits only.' };
    }
    if (strVal.length < 8 || strVal.length > 20) {
        return { valid: false, error: 'Account number must contain 8–20 numeric digits.' };
    }
    const rule = (0, exports.getBankRule)(bankName);
    if (rule) {
        if (rule.exactLen && strVal.length !== rule.exactLen) {
            return {
                valid: false,
                error: `${rule.name} account number must be exactly ${rule.exactLen} digits (entered: ${strVal.length}).`
            };
        }
        if (strVal.length < rule.minLen || strVal.length > rule.maxLen) {
            return {
                valid: false,
                error: `${rule.name} account number must be between ${rule.minLen} and ${rule.maxLen} digits.`
            };
        }
    }
    return { valid: true };
};
exports.validateBankAccount = validateBankAccount;
const maskAccountNumber = (acc) => {
    if (!acc)
        return '';
    const clean = String(acc).trim();
    if (clean.length <= 4)
        return clean;
    const last4 = clean.slice(-4);
    return `${'•'.repeat(Math.max(clean.length - 4, 4))}${last4}`;
};
exports.maskAccountNumber = maskAccountNumber;
// -------------------------------------------------------------
// 8. IFSC CODE VALIDATION & FORMATTING
// -------------------------------------------------------------
exports.IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const formatIfsc = (val) => {
    return String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
};
exports.formatIfsc = formatIfsc;
const isValidIfsc = (val) => {
    if (!val || typeof val !== 'string')
        return false;
    const trimmed = val.trim().toUpperCase();
    return exports.IFSC_REGEX.test(trimmed);
};
exports.isValidIfsc = isValidIfsc;
// -------------------------------------------------------------
// 9. DATE OF BIRTH & MINIMUM AGE (18 YEARS)
// -------------------------------------------------------------
const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime()))
        return -1;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};
exports.calculateAge = calculateAge;
const isAtLeast18YearsOld = (dob) => {
    const age = (0, exports.calculateAge)(dob);
    return age >= 18;
};
exports.isAtLeast18YearsOld = isAtLeast18YearsOld;
const getMax18DobString = () => {
    const today = new Date();
    const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return cutoff.toISOString().split('T')[0];
};
exports.getMax18DobString = getMax18DobString;
//# sourceMappingURL=formValidation.js.map