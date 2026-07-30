import { z } from 'zod';

export const createTargetSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    assignedTo: z.string().min(1, 'Assigned user ID is required'),
    targetQuantity: z.number().positive('Target quantity must be greater than 0'),
    deadline: z.string().datetime({ message: 'Invalid ISO date string for deadline' }).or(z.string().min(1)),
    type: z.enum(['vendor_onboarding', 'field_visits', 'revenue']).optional(),
  }),
});

export const updateTargetStatusSchema = z.object({
  body: z.object({
    achievedQuantity: z.number().min(0).optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
  }),
});
