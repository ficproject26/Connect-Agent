import { Router } from 'express';
import { register, login, getMe, updateProfile, updateKyc, forgotPassword, verifyOtp, resetPassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema';

const router = Router();

// Registration route aliases
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/auth/register', authRateLimiter, validate(registerSchema), register);
router.post('/api/auth/register', authRateLimiter, validate(registerSchema), register);
router.post('/api/register', authRateLimiter, validate(registerSchema), register);

// Login route aliases
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/auth/login', authRateLimiter, validate(loginSchema), login);
router.post('/api/auth/login', authRateLimiter, validate(loginSchema), login);
router.post('/api/login', authRateLimiter, validate(loginSchema), login);

// Profile and KYC routes
router.get('/me', authMiddleware, getMe);
router.get('/profile', authMiddleware, getMe);
router.put('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
router.patch('/profile', authMiddleware, validate(updateProfileSchema), updateProfile);
router.patch('/kyc', authMiddleware, updateKyc);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

export default router;

