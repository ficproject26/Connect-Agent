export { BANK_SPECIFIC_RULES, getBankRule, validateBankAccount, sanitizeAccountNumber, maskAccountNumber } from './formValidation';
export declare const BANK_ACCOUNT_REGEX: RegExp;
export declare const BANK_ACCOUNT_ERROR_MESSAGE = "Account number must contain 8\u201320 numeric digits.";
export declare const isValidAccountNumber: (acc: string | number | undefined | null, bankName?: string) => boolean;
//# sourceMappingURL=bankValidation.d.ts.map