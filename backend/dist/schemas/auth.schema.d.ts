import { z } from 'zod';
export declare const indianMobileRegex: RegExp;
export declare const nameSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const emailSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const phoneSchema: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
export declare const optionalPhoneSchema: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
export declare const passwordSchema: z.ZodEffects<z.ZodString, string, string>;
export declare const optionalAadhaarSchema: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
export declare const optionalPanSchema: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
export declare const dobSchema: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>, string | Date | undefined, string | Date | undefined>;
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        email: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        password: z.ZodEffects<z.ZodString, string, string>;
        phone: z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>]>;
        phoneNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        altPhone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        dob: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>, string | Date | undefined, string | Date | undefined>;
        aadhaarNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        panNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        role: z.ZodOptional<z.ZodEnum<["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "state_head", "zonal_head", "district_head", "division_agent", "field_agent"]>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        email: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        password: z.ZodEffects<z.ZodString, string, string>;
        phone: z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>]>;
        phoneNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        altPhone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        dob: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>, string | Date | undefined, string | Date | undefined>;
        aadhaarNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        panNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        role: z.ZodOptional<z.ZodEnum<["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "state_head", "zonal_head", "district_head", "division_agent", "field_agent"]>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        email: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        password: z.ZodEffects<z.ZodString, string, string>;
        phone: z.ZodUnion<[z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>]>;
        phoneNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        altPhone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        dob: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>, string | Date | undefined, string | Date | undefined>;
        aadhaarNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        panNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        role: z.ZodOptional<z.ZodEnum<["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "state_head", "zonal_head", "district_head", "division_agent", "field_agent"]>>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        email: string;
        password: string;
        phone?: string | undefined;
        role?: "state" | "district" | "division" | "pincode" | "delivery_partner" | "technician" | "division_agent" | "admin" | "state_head" | "zonal_head" | "district_head" | "field_agent" | undefined;
        dob?: string | Date | undefined;
        altPhone?: string | undefined;
        aadhaarNumber?: string | undefined;
        panNumber?: string | undefined;
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
        role?: "state" | "district" | "division" | "pincode" | "delivery_partner" | "technician" | "division_agent" | "admin" | "state_head" | "zonal_head" | "district_head" | "field_agent" | undefined;
        dob?: string | Date | undefined;
        altPhone?: string | undefined;
        aadhaarNumber?: string | undefined;
        panNumber?: string | undefined;
        phoneNumber?: string | undefined;
    } & {
        [k: string]: unknown;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>;
        phone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
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
        name: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        email: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        phone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        mobile: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        alternateMobile: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        altPhone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        address: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
        assignedTerritory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        territory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        fullAddress: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        name: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        email: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        phone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        mobile: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        alternateMobile: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        altPhone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        address: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
        assignedTerritory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        territory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        fullAddress: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        name: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        email: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        phone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        phoneNumber: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        mobile: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        alternateMobile: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        altPhone: z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, string | undefined, string | undefined>, string | undefined, string | undefined>;
        address: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodRecord<z.ZodString, z.ZodAny>]>>;
        assignedTerritory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        territory: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        fullAddress: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    body: {
        mobile?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        territory?: Record<string, any> | undefined;
        assignedTerritory?: Record<string, any> | undefined;
        address?: string | Record<string, any> | undefined;
        fullAddress?: string | undefined;
        alternateMobile?: string | undefined;
        altPhone?: string | undefined;
        phoneNumber?: string | undefined;
    } & {
        [k: string]: unknown;
    };
}, {
    body: {
        mobile?: string | undefined;
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        territory?: Record<string, any> | undefined;
        assignedTerritory?: Record<string, any> | undefined;
        address?: string | Record<string, any> | undefined;
        fullAddress?: string | undefined;
        alternateMobile?: string | undefined;
        altPhone?: string | undefined;
        phoneNumber?: string | undefined;
    } & {
        [k: string]: unknown;
    };
}>;
//# sourceMappingURL=auth.schema.d.ts.map