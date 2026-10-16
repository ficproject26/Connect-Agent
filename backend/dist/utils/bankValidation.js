"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidAccountNumber = exports.BANK_ACCOUNT_ERROR_MESSAGE = exports.BANK_ACCOUNT_REGEX = exports.maskAccountNumber = exports.sanitizeAccountNumber = exports.validateBankAccount = exports.getBankRule = exports.BANK_SPECIFIC_RULES = void 0;
var formValidation_1 = require("./formValidation");
Object.defineProperty(exports, "BANK_SPECIFIC_RULES", { enumerable: true, get: function () { return formValidation_1.BANK_SPECIFIC_RULES; } });
Object.defineProperty(exports, "getBankRule", { enumerable: true, get: function () { return formValidation_1.getBankRule; } });
Object.defineProperty(exports, "validateBankAccount", { enumerable: true, get: function () { return formValidation_1.validateBankAccount; } });
Object.defineProperty(exports, "sanitizeAccountNumber", { enumerable: true, get: function () { return formValidation_1.sanitizeAccountNumber; } });
Object.defineProperty(exports, "maskAccountNumber", { enumerable: true, get: function () { return formValidation_1.maskAccountNumber; } });
const formValidation_2 = require("./formValidation");
exports.BANK_ACCOUNT_REGEX = /^\d{8,20}$/;
exports.BANK_ACCOUNT_ERROR_MESSAGE = 'Account number must contain 8–20 numeric digits.';
const isValidAccountNumber = (acc, bankName) => {
    if (!acc)
        return false;
    return (0, formValidation_2.validateBankAccount)(acc, bankName).valid;
};
exports.isValidAccountNumber = isValidAccountNumber;
//# sourceMappingURL=bankValidation.js.map