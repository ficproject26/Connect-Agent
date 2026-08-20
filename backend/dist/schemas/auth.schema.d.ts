import { z } from 'zod';
export declare const indianMobileRegex: RegExp;
export declare const phoneSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>;
export declare const optionalPhoneSchema: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        role: z.ZodOptional<z.ZodEnum<["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "state_head", "zonal_head", "district_head", "division_agent", "field_agent"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        role: z.ZodOptional<z.ZodEnum<["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "state_head", "zonal_head", "district_head", "division_agent", "field_agent"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        role: z.ZodOptional<z.ZodEnum<["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "state_head", "zonal_head", "district_head", "division_agent", "field_agent"]>>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        email: string;
        password: string;
        phone?: string | undefined;
        role?: "state" | "district" | "division" | "pincode" | "delivery_partner" | "technician" | "admin" | "state_head" | "zonal_head" | "district_head" | "division_agent" | "field_agent" | undefined;
        phoneNumber?: string | undefined;
    } & {
        [k: string]: unknown;
    };
}, {
    body: {
        name: string;
        email: string;
        password: string;
        phone?: string | undefined;
        role?: "state" | "district" | "division" | "pincode" | "delivery_partner" | "technician" | "admin" | "state_head" | "zonal_head" | "district_head" | "division_agent" | "field_agent" | undefined;
        phoneNumber?: string | undefined;
    } & {
        [k: string]: unknown;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        password: string;
        email?: string | undefined;
        phone?: string | undefined;
    }, {
        password: string;
        email?: string | undefined;
        phone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        password: string;
        email?: string | undefined;
        phone?: string | undefined;
    };
}, {
    body: {
        password: string;
        email?: string | undefined;
        phone?: string | undefined;
    };
}>;
export declare const updateProfileSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        phone: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        address: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        phoneNumber?: string | undefined;
    }, {
        name?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        phoneNumber?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        phoneNumber?: string | undefined;
    };
}, {
    body: {
        name?: string | undefined;
        phone?: string | undefined;
        address?: string | undefined;
        phoneNumber?: string | undefined;
    };
}>;
//# sourceMappingURL=auth.schema.d.ts.map