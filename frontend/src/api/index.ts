/**
 * API Service Layer — Barrel Export
 *
 * Usage:
 *   import { authService, orderService, jobService } from '../api';
 *   const { data } = await authService.login({ email, password });
 */

export { default as api } from './client';
export { authService } from './auth';
export { orderService } from './orders';
export { jobService } from './jobs';
export { notificationService, subscriptionService, walletService, referralService } from './services';
export { targetService } from './targets';


// Re-export types
export type { LoginRequest, LoginResponse, RegisterRequest } from './auth';
export type { Order } from './orders';
export type { Job } from './jobs';
