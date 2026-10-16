export const BANK_ACCOUNT_REGEX = /^\d{8,20}$/;
export const BANK_ACCOUNT_ERROR_MESSAGE = 'Account number must contain 8–20 digits.';

/**
 * Validates a bank account number:
 * - Numeric digits 0-9 only
 * - 8 to 20 digits length
 * - Preserves leading zeros
 */
export const isValidAccountNumber = (acc: string | number | undefined | null): boolean => {
  if (!acc) return false;
  const clean = String(acc).trim();
  return BANK_ACCOUNT_REGEX.test(clean);
};

/**
 * Sanitizes input for account number:
 * - Strips non-digit characters
 * - Caps at maximum 20 digits
 */
export const sanitizeAccountNumber = (value: string): string => {
  return String(value || '').replace(/\D/g, '').slice(0, 20);
};
