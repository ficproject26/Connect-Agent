"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const auth_schema_1 = require("../schemas/auth.schema");
const router = (0, express_1.Router)();
// Registration route aliases
router.post('/register', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.register);
router.post('/auth/register', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.register);
router.post('/api/auth/register', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.register);
router.post('/api/register', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.registerSchema), auth_controller_1.register);
// Login route aliases
router.post('/login', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
router.post('/auth/login', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
router.post('/api/auth/login', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
router.post('/api/login', rateLimiter_middleware_1.authRateLimiter, (0, validate_middleware_1.validate)(auth_schema_1.loginSchema), auth_controller_1.login);
// OTP routes
router.post('/send-otp', auth_controller_1.sendOtp);
router.post('/auth/send-otp', auth_controller_1.sendOtp);
router.post('/api/auth/send-otp', auth_controller_1.sendOtp);
// Profile and KYC routes
router.get('/me', auth_middleware_1.authMiddleware, auth_controller_1.getMe);
router.get('/profile', auth_middleware_1.authMiddleware, auth_controller_1.getMe);
router.put('/profile', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validate)(auth_schema_1.updateProfileSchema), auth_controller_1.updateProfile);
router.patch('/profile', auth_middleware_1.authMiddleware, (0, validate_middleware_1.validate)(auth_schema_1.updateProfileSchema), auth_controller_1.updateProfile);
router.patch('/kyc', auth_middleware_1.authMiddleware, auth_controller_1.updateKyc);
// Password reset routes
router.post('/forgot-password', auth_controller_1.forgotPassword);
router.post('/verify-otp', auth_controller_1.verifyOtp);
router.post('/reset-password', auth_controller_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map