"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.loginSchema = exports.registerSchema = exports.optionalPhoneSchema = exports.phoneSchema = exports.indianMobileRegex = void 0;
const zod_1 = require("zod");
exports.indianMobileRegex = /^[6-9][0-9]{9}$/;
exports.phoneSchema = zod_1.z.string()
    .min(1, 'Mobile number is required.')
    .refine(val => /^[6-9]/.test(val), { message: 'Mobile number must start with 6, 7, 8, or 9.' })
    .refine(val => val.length === 10, { message: 'Enter a valid 10-digit mobile number.' })
    .refine(val => exports.indianMobileRegex.test(val), { message: 'Enter a valid 10-digit mobile number.' });
exports.optionalPhoneSchema = zod_1.z.string()
    .optional()
    .refine(val => !val || exports.indianMobileRegex.test(val), {
    message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
});
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
        email: zod_1.z.string().email('Invalid email address'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        phone: exports.optionalPhoneSchema,
        phoneNumber: exports.optionalPhoneSchema,
        role: zod_1.z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician', 'admin', 'state_head', 'zonal_head', 'district_head', 'division_agent', 'field_agent']).optional(),
    }).passthrough(),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email address').optional(),
        phone: exports.optionalPhoneSchema,
        password: zod_1.z.string().min(1, 'Password is required'),
    }),
});
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2).optional(),
        phone: exports.optionalPhoneSchema,
        phoneNumber: exports.optionalPhoneSchema,
        address: zod_1.z.string().optional(),
    }),
});
//# sourceMappingURL=auth.schema.js.map