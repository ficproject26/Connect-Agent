"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = exports.dobSchema = exports.optionalPanSchema = exports.optionalAadhaarSchema = exports.passwordSchema = exports.optionalPhoneSchema = exports.phoneSchema = exports.emailSchema = exports.nameSchema = exports.indianMobileRegex = void 0;
const zod_1 = require("zod");
const formValidation_1 = require("../utils/formValidation");
exports.indianMobileRegex = /^[6-9][0-9]{9}$/;
exports.nameSchema = zod_1.z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .refine(val => (0, formValidation_1.isValidName)(val), { message: 'Name contains invalid characters. Please enter a valid name.' })
    .transform(val => (0, formValidation_1.formatName)(val));
exports.emailSchema = zod_1.z.string()
    .refine(val => (0, formValidation_1.isValidEmail)(val), { message: 'Please enter a valid email address (e.g. name@example.com).' })
    .transform(val => (0, formValidation_1.normalizeEmail)(val));
exports.phoneSchema = zod_1.z.string()
    .min(1, 'Mobile number is required.')
    .transform(val => (0, formValidation_1.sanitizeIndianMobile)(val))
    .refine(val => (0, formValidation_1.isValidIndianMobile)(val), {
    message: 'Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9.'
});
exports.optionalPhoneSchema = zod_1.z.string()
    .optional()
    .refine(val => !val || (0, formValidation_1.isValidIndianMobile)(val), {
    message: 'Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9.'
})
    .transform(val => val ? (0, formValidation_1.sanitizeIndianMobile)(val) : val);
exports.passwordSchema = zod_1.z.string()
    .min(6, 'Password must be at least 6 characters long.')
    .refine(val => (0, formValidation_1.isValidPassword)(val), {
    message: 'Password must contain at least one uppercase letter, one numeric digit, and one special character (e.g. Rathika@123).'
});
exports.optionalAadhaarSchema = zod_1.z.string()
    .optional()
    .refine(val => !val || (0, formValidation_1.isValidAadhaar)(val), {
    message: 'Aadhaar number must be exactly 12 numeric digits.'
})
    .transform(val => val ? (0, formValidation_1.sanitizeAadhaar)(val) : val);
exports.optionalPanSchema = zod_1.z.string()
    .optional()
    .refine(val => !val || (0, formValidation_1.isValidPan)(val), {
    message: 'PAN number must be 10 characters in format ABCDE1234F (5 letters, 4 digits, 1 letter).'
})
    .transform(val => val ? (0, formValidation_1.formatPan)(val) : val);
exports.dobSchema = zod_1.z.union([zod_1.z.string(), zod_1.z.date()])
    .optional()
    .refine(val => {
    if (!val)
        return true;
    return (0, formValidation_1.isAtLeast18YearsOld)(val);
}, {
    message: 'You must be at least 18 years old to register.'
});
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: exports.nameSchema,
        email: exports.emailSchema,
        password: exports.passwordSchema,
        phone: exports.phoneSchema.or(exports.optionalPhoneSchema),
        phoneNumber: exports.optionalPhoneSchema,
        altPhone: exports.optionalPhoneSchema,
        dob: exports.dobSchema,
        aadhaarNumber: exports.optionalAadhaarSchema,
        panNumber: exports.optionalPanSchema,
        role: zod_1.z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician', 'admin', 'state_head', 'zonal_head', 'district_head', 'division_agent', 'field_agent']).optional(),
    }).passthrough(),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().optional().transform(val => val ? (0, formValidation_1.normalizeEmail)(val) : val),
        phone: exports.optionalPhoneSchema,
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().optional().refine(val => !val || (0, formValidation_1.isValidName)(val), {
            message: 'Name contains invalid characters.'
        }).transform(val => val ? (0, formValidation_1.formatName)(val) : val),
        email: zod_1.z.string().optional().refine(val => !val || (0, formValidation_1.isValidEmail)(val), {
            message: 'Invalid email address.'
        }).transform(val => val ? (0, formValidation_1.normalizeEmail)(val) : val),
        phone: exports.optionalPhoneSchema,
        phoneNumber: exports.optionalPhoneSchema,
        mobile: exports.optionalPhoneSchema,
        alternateMobile: exports.optionalPhoneSchema,
        altPhone: exports.optionalPhoneSchema,
        address: zod_1.z.union([zod_1.z.string(), zod_1.z.record(zod_1.z.any())]).optional(),
        assignedTerritory: zod_1.z.record(zod_1.z.any()).optional(),
        territory: zod_1.z.record(zod_1.z.any()).optional(),
        fullAddress: zod_1.z.string().optional()
    }).passthrough(),
});
//# sourceMappingURL=auth.schema.js.map