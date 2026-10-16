/**
 * Connect App — Global Form Validation Utility (Frontend)
 * Consistent validation rules across Customer, Vendor, Agent, Manager, Admin, and Sub Admin forms.
 */

// -------------------------------------------------------------
// 1. NAME VALIDATION & FORMATTING
// -------------------------------------------------------------

/**
 * Automatically capitalizes the first alphabetic character of each word.
 * Preserves spaces between words.
 * Prevents leading spaces.
 * Example: 'rathika' -> 'Rathika', 'rathika rani' -> 'Rathika Rani', 'dr. a.p.j. abdul kalam' -> 'Dr. A.P.J. Abdul Kalam'
 */
export const formatName = (value: string): string => {
  if (!value) return '';
  const trimmedLeading = value.replace(/^\s+/, '');
  return trimmedLeading.replace(/(?:^|[\s.'\-])\p{L}/gu, (char) => char.toUpperCase());
};

/**
 * Validates personal and business names:
 * - 2 to 100 characters
 * - Supports alphabetic characters (including Unicode/regional languages), spaces, dots, hyphens, and apostrophes
 * - Rejects values containing only spaces or invalid characters
 */
export const isValidName = (value: string, minLength = 2, maxLength = 100): boolean => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) return false;
  // Unicode-aware regex for letters and punctuation in legitimate names
  const nameRegex = /^[\p{L}\p{M}]+(?:[.'\s\-][\p{L}\p{M}]+)*$/u;
  return nameRegex.test(trimmed);
};

// -------------------------------------------------------------
// 2. EMAIL VALIDATION & NORMALIZATION
// -------------------------------------------------------------

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const normalizeEmail = (email: string): string => {
  return String(email || '').toLowerCase().trim();
};

export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.includes(' ')) return false;
  const atMatches = trimmed.match(/@/g);
  if (!atMatches || atMatches.length !== 1) return false;
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const domainParts = parts[1].split('.');
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) return false;
  return EMAIL_REGEX.test(trimmed);
};

// -------------------------------------------------------------
// 3. INDIAN MOBILE NUMBER VALIDATION
// -------------------------------------------------------------

export const INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/;

export const sanitizeIndianMobile = (val: string): string => {
  if (!val) return '';
  let clean = String(val).trim().replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    clean = clean.slice(2);
  }
  return clean.slice(0, 10);
};

export const isValidIndianMobile = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  const withoutPlus = trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  if (/\D/.test(withoutPlus)) return false;

  let digits = withoutPlus;
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10) return false;
  return INDIAN_MOBILE_REGEX.test(digits);
};

// -------------------------------------------------------------
// 4. PASSWORD VALIDATION
// -------------------------------------------------------------

export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{6,}$/;

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];
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

export const isValidPassword = (password: string): boolean => {
  return PASSWORD_REGEX.test(password || '');
};

// -------------------------------------------------------------
// 5. AADHAAR NUMBER VALIDATION & MASKING
// -------------------------------------------------------------

export const AADHAAR_REGEX = /^[0-9]{12}$/;

export const sanitizeAadhaar = (val: string): string => {
  return String(val || '').replace(/\D/g, '').slice(0, 12);
};

export const isValidAadhaar = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  return AADHAAR_REGEX.test(trimmed);
};

export const maskAadhaar = (val: string): string => {
  const clean = sanitizeAadhaar(val);
  if (clean.length !== 12) return val;
  return `XXXX-XXXX-${clean.slice(-4)}`;
};

// -------------------------------------------------------------
// 6. PAN CARD VALIDATION & FORMATTING
// -------------------------------------------------------------

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export const formatPan = (val: string): string => {
  return String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
};

export const isValidPan = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim().toUpperCase();
  return PAN_REGEX.test(trimmed);
};

// -------------------------------------------------------------
// 7. BANK ACCOUNT NUMBER VALIDATION
// -------------------------------------------------------------

export interface BankRule {
  name: string;
  minLen: number;
  maxLen: number;
  exactLen?: number;
  description: string;
}

export const BANK_SPECIFIC_RULES: Record<string, BankRule> = {
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

export const getBankRule = (bankName?: string): BankRule | null => {
  if (!bankName) return null;
  const lower = bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.includes('sbi') || lower.includes('statebank')) return BANK_SPECIFIC_RULES.sbi;
  if (lower.includes('hdfc')) return BANK_SPECIFIC_RULES.hdfc;
  if (lower.includes('icici')) return BANK_SPECIFIC_RULES.icici;
  if (lower.includes('axis')) return BANK_SPECIFIC_RULES.axis;
  if (lower.includes('pnb') || lower.includes('punjabnational')) return BANK_SPECIFIC_RULES.pnb;
  if (lower.includes('baroda') || lower.includes('bob')) return BANK_SPECIFIC_RULES.bob;
  if (lower.includes('canara')) return BANK_SPECIFIC_RULES.canara;
  if (lower.includes('unionbank') || lower.includes('union')) return BANK_SPECIFIC_RULES.union;
  if (lower.includes('kotak')) return BANK_SPECIFIC_RULES.kotak;
  if (lower.includes('indianbank')) return BANK_SPECIFIC_RULES.indian;
  return null;
};

export const sanitizeAccountNumber = (value: string | number | undefined | null): string => {
  if (!value) return '';
  return String(value).replace(/\D/g, '').slice(0, 20);
};

export const validateBankAccount = (
  accountNumber: string | number | undefined | null,
  bankName?: string
): { valid: boolean; error?: string } => {
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

  const rule = getBankRule(bankName);
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

export const maskAccountNumber = (acc: string | number | undefined | null): string => {
  if (!acc) return '';
  const clean = String(acc).trim();
  if (clean.length <= 4) return clean;
  const last4 = clean.slice(-4);
  return `${'•'.repeat(Math.max(clean.length - 4, 4))}${last4}`;
};

// -------------------------------------------------------------
// 8. IFSC CODE VALIDATION & FORMATTING
// -------------------------------------------------------------

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const formatIfsc = (val: string): string => {
  return String(val || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
};

export const isValidIfsc = (val: string): boolean => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim().toUpperCase();
  return IFSC_REGEX.test(trimmed);
};

// -------------------------------------------------------------
// 9. DATE OF BIRTH & MINIMUM AGE (18 YEARS)
// -------------------------------------------------------------

export const calculateAge = (dob: Date | string): number => {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return -1;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const isAtLeast18YearsOld = (dob: Date | string): boolean => {
  const age = calculateAge(dob);
  return age >= 18;
};

export const getMax18DobString = (): string => {
  const today = new Date();
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return cutoff.toISOString().split('T')[0];
};
