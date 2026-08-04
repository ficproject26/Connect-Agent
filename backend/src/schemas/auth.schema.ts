import { z } from 'zod';

export const indianMobileRegex = /^[6-9][0-9]{9}$/;

export const phoneSchema = z.string()
  .min(1, 'Mobile number is required.')
  .refine(val => /^[6-9]/.test(val), { message: 'Mobile number must start with 6, 7, 8, or 9.' })
  .refine(val => val.length === 10, { message: 'Enter a valid 10-digit mobile number.' })
  .refine(val => indianMobileRegex.test(val), { message: 'Enter a valid 10-digit mobile number.' });

export const optionalPhoneSchema = z.string()
  .optional()
  .refine(val => !val || indianMobileRegex.test(val), {
    message: 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
  });

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: optionalPhoneSchema,
    phoneNumber: optionalPhoneSchema,
    role: z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician', 'admin', 'state_head', 'zonal_head', 'district_head', 'division_agent', 'field_agent']).optional(),
  }).passthrough(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: optionalPhoneSchema,
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: optionalPhoneSchema,
    phoneNumber: optionalPhoneSchema,
    address: z.string().optional(),
  }),
});
