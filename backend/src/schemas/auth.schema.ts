import { z } from 'zod';
import {
  isValidName,
  formatName,
  isValidEmail,
  normalizeEmail,
  isValidIndianMobile,
  sanitizeIndianMobile,
  isValidPassword,
  isValidAadhaar,
  sanitizeAadhaar,
  isValidPan,
  formatPan,
  isAtLeast18YearsOld
} from '../utils/formValidation';

export const indianMobileRegex = /^[6-9][0-9]{9}$/;

export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name cannot exceed 100 characters')
  .refine(val => isValidName(val), { message: 'Name contains invalid characters. Please enter a valid name.' })
  .transform(val => formatName(val));

export const emailSchema = z.string()
  .refine(val => isValidEmail(val), { message: 'Please enter a valid email address (e.g. name@example.com).' })
  .transform(val => normalizeEmail(val));

export const phoneSchema = z.string()
  .min(1, 'Mobile number is required.')
  .transform(val => sanitizeIndianMobile(val))
  .refine(val => isValidIndianMobile(val), {
    message: 'Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9.'
  });

export const optionalPhoneSchema = z.string()
  .optional()
  .refine(val => !val || isValidIndianMobile(val), {
    message: 'Mobile number must be exactly 10 digits starting with 6, 7, 8, or 9.'
  })
  .transform(val => val ? sanitizeIndianMobile(val) : val);

export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters long.')
  .refine(val => isValidPassword(val), {
    message: 'Password must contain at least one uppercase letter, one numeric digit, and one special character (e.g. Rathika@123).'
  });

export const optionalAadhaarSchema = z.string()
  .optional()
  .refine(val => !val || isValidAadhaar(val), {
    message: 'Aadhaar number must be exactly 12 numeric digits.'
  })
  .transform(val => val ? sanitizeAadhaar(val) : val);

export const optionalPanSchema = z.string()
  .optional()
  .refine(val => !val || isValidPan(val), {
    message: 'PAN number must be 10 characters in format ABCDE1234F (5 letters, 4 digits, 1 letter).'
  })
  .transform(val => val ? formatPan(val) : val);

export const dobSchema = z.union([z.string(), z.date()])
  .optional()
  .refine(val => {
    if (!val) return true;
    return isAtLeast18YearsOld(val);
  }, {
    message: 'You must be at least 18 years old to register.'
  });

export const registerSchema = z.object({
  body: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    phone: phoneSchema.or(optionalPhoneSchema),
    phoneNumber: optionalPhoneSchema,
    altPhone: optionalPhoneSchema,
    dob: dobSchema,
    aadhaarNumber: optionalAadhaarSchema,
    panNumber: optionalPanSchema,
    role: z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician', 'admin', 'state_head', 'zonal_head', 'district_head', 'division_agent', 'field_agent']).optional(),
  }).passthrough(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().optional().transform(val => val ? normalizeEmail(val) : val),
    phone: optionalPhoneSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().optional().refine(val => !val || isValidName(val), {
      message: 'Name contains invalid characters.'
    }).transform(val => val ? formatName(val) : val),
    email: z.string().optional().refine(val => !val || isValidEmail(val), {
      message: 'Invalid email address.'
    }).transform(val => val ? normalizeEmail(val) : val),
    phone: optionalPhoneSchema,
    phoneNumber: optionalPhoneSchema,
    mobile: optionalPhoneSchema,
    alternateMobile: optionalPhoneSchema,
    altPhone: optionalPhoneSchema,
    address: z.union([z.string(), z.record(z.any())]).optional(),
    assignedTerritory: z.record(z.any()).optional(),
    territory: z.record(z.any()).optional(),
    fullAddress: z.string().optional()
  }).passthrough(),
});
