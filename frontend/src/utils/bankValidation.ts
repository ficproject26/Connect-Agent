export {
  BANK_SPECIFIC_RULES,
  getBankRule,
  validateBankAccount,
  sanitizeAccountNumber,
  maskAccountNumber
} from './formValidation';

import { validateBankAccount } from './formValidation';

export const BANK_ACCOUNT_REGEX = /^\d{8,20}$/;
export const BANK_ACCOUNT_ERROR_MESSAGE = 'Account number must contain 8–20 numeric digits.';

export const isValidAccountNumber = (
  acc: string | number | undefined | null,
  bankName?: string
): boolean => {
  if (!acc) return false;
  return validateBankAccount(acc, bankName).valid;
};
