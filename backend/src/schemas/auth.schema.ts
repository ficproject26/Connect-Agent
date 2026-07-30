import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
    phoneNumber: z.string().optional(),
    role: z.enum(['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician', 'admin', 'state_head', 'zonal_head', 'district_head', 'division_agent', 'field_agent']).optional(),
  }).passthrough(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
  }),
});
