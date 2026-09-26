import { z } from 'zod';
export declare const createTargetSchema: z.ZodObject<{
    body: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        assignedTo: z.ZodString;
        targetQuantity: z.ZodNumber;
        deadline: z.ZodUnion<[z.ZodString, z.ZodString]>;
        type: z.ZodOptional<z.ZodEnum<["vendor_onboarding", "field_visits", "revenue"]>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        assignedTo: string;
        targetQuantity: number;
        deadline: string;
        type?: "vendor_onboarding" | "field_visits" | "revenue" | undefined;
        description?: string | undefined;
    }, {
        title: string;
        assignedTo: string;
        targetQuantity: number;
        deadline: string;
        type?: "vendor_onboarding" | "field_visits" | "revenue" | undefined;
        description?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        title: string;
        assignedTo: string;
        targetQuantity: number;
        deadline: string;
        type?: "vendor_onboarding" | "field_visits" | "revenue" | undefined;
        description?: string | undefined;
    };
}, {
    body: {
        title: string;
        assignedTo: string;
        targetQuantity: number;
        deadline: string;
        type?: "vendor_onboarding" | "field_visits" | "revenue" | undefined;
        description?: string | undefined;
    };
}>;
export declare const updateTargetStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        achievedQuantity: z.ZodOptional<z.ZodNumber>;
        status: z.ZodOptional<z.ZodEnum<["pending", "in_progress", "completed", "failed"]>>;
    }, "strip", z.ZodTypeAny, {
        status?: "pending" | "completed" | "in_progress" | "failed" | undefined;
        achievedQuantity?: number | undefined;
    }, {
        status?: "pending" | "completed" | "in_progress" | "failed" | undefined;
        achievedQuantity?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status?: "pending" | "completed" | "in_progress" | "failed" | undefined;
        achievedQuantity?: number | undefined;
    };
}, {
    body: {
        status?: "pending" | "completed" | "in_progress" | "failed" | undefined;
        achievedQuantity?: number | undefined;
    };
}>;
//# sourceMappingURL=target.schema.d.ts.map