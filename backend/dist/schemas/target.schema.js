"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTargetStatusSchema = exports.createTargetSchema = void 0;
const zod_1 = require("zod");
exports.createTargetSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
        description: zod_1.z.string().optional(),
        assignedTo: zod_1.z.string().min(1, 'Assigned user ID is required'),
        targetQuantity: zod_1.z.number().positive('Target quantity must be greater than 0'),
        deadline: zod_1.z.string().datetime({ message: 'Invalid ISO date string for deadline' }).or(zod_1.z.string().min(1)),
        type: zod_1.z.enum(['vendor_onboarding', 'field_visits', 'revenue']).optional(),
    }),
});
exports.updateTargetStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        achievedQuantity: zod_1.z.number().min(0).optional(),
        status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'failed']).optional(),
    }),
});
//# sourceMappingURL=target.schema.js.map