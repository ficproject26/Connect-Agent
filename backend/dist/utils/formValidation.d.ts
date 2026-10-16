/**
 * Connect App — Global Form Validation Utility (Backend)
 * Consistent validation rules across Customer, Vendor, Agent, Manager, Admin, and Sub Admin endpoints.
 */
/**
 * Automatically capitalizes the first alphabetic character of each word.
 * Preserves spaces between words.
 * Prevents leading spaces.
 * Example: 'rathika' -> 'Rathika', 'rathika rani' -> 'Rathika Rani', 'dr. a.p.j. abdul kalam' -> 'Dr. A.P.J. Abdul Kalam'
 */
export declare const formatName: (value: string) => string;
/**
 * Validates personal and business names:
 * - 2 to 100 characters
 * - Supports alphabetic characters (including Unicode/regional languages), spaces, dots, hyphens, and apostrophes
 * - Rejects values containing only spaces or invalid characters
 */
export declare const isValidName: (value: string, minLength?: number, maxLength?: number) => boolean;
export declare const EMAIL_REGEX: RegExp;
export declare const normalizeEmail: (email: string) => string;
export declare const isValidEmail: (email: string) => boolean;
export declare const INDIAN_MOBILE_REGEX: RegExp;
export declare const sanitizeIndianMobile: (val: string) => string;
export declare const isValidIndianMobile: (val: string) => boolean;
export declare const PASSWORD_REGEX: RegExp;
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}
export declare const validatePassword: (password: string) => PasswordValidationResult;
export declare const isValidPassword: (password: string) => boolean;
export declare const AADHAAR_REGEX: RegExp;
export declare const sanitizeAadhaar: (val: string) => string;
export declare const isValidAadhaar: (val: string) => boolean;
export declare const maskAadhaar: (val: string) => string;
export declare const PAN_REGEX: RegExp;
export declare const formatPan: (val: string) => string;
export declare const isValidPan: (val: string) => boolean;
export interface BankRule {
    name: string;
    minLen: number;
    maxLen: number;
    exactLen?: number;
    description: string;
}
export declare const BANK_SPECIFIC_RULES: Record<string, BankRule>;
export declare const getBankRule: (bankName?: string) => BankRule | null;
export declare const sanitizeAccountNumber: (value: string | number | undefined | null) => string;
export declare const validateBankAccount: (accountNumber: string | number | undefined | null, bankName?: string) => {
    valid: boolean;
    error?: string;
};
export declare const maskAccountNumber: (acc: string | number | undefined | null) => string;
export declare const IFSC_REGEX: RegExp;
export declare const formatIfsc: (val: string) => string;
export declare const isValidIfsc: (val: string) => boolean;
export declare const calculateAge: (dob: Date | string) => number;
export declare const isAtLeast18YearsOld: (dob: Date | string) => boolean;
export declare const getMax18DobString: () => string;
//# sourceMappingURL=formValidation.d.ts.map