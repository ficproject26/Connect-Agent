"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeAccountNumber = exports.isValidAccountNumber = exports.BANK_ACCOUNT_ERROR_MESSAGE = exports.BANK_ACCOUNT_REGEX = void 0;
exports.BANK_ACCOUNT_REGEX = /^\d{8,20}$/;
exports.BANK_ACCOUNT_ERROR_MESSAGE = 'Account number must contain 8–20 digits.';
const isValidAccountNumber = (acc) => {
    if (!acc)
        return false;
    const clean = String(acc).trim();
    return exports.BANK_ACCOUNT_REGEX.test(clean);
};
exports.isValidAccountNumber = isValidAccountNumber;
const sanitizeAccountNumber = (value) => {
    if (!value)
        return '';
    return String(value).replace(/\D/g, '').slice(0, 20);
};
exports.sanitizeAccountNumber = sanitizeAccountNumber;
//# sourceMappingURL=bankValidation.js.map