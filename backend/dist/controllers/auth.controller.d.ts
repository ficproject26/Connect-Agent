import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMe: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateKyc: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const verifyOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /auth/send-otp
 * Step 1 of Mobile OTP Login:
 *   1. Validate the phone number format.
 *   2. Check if any Agent is registered with that phone.
 *   3. Check account status – reject suspended/inactive accounts early.
 *   4. Generate a 6-digit OTP, store it with a 5-minute expiry.
 *   5. Return the OTP in the response (in production, send via SMS gateway).
 */
export declare const sendOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /auth/verify-mobile-otp
 * Step 2 of Mobile OTP Login:
 *   1. Validate OTP from store (must match + not expired).
 *   2. Clear OTP from store (one-time use).
 *   3. Look up agent by phone, check account status.
 *   4. Generate JWT token identical to email login.
 *   5. Return token + agent data.
 */
export declare const verifyMobileOtp: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.controller.d.ts.map