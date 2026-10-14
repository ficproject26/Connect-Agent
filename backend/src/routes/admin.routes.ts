import { Router } from 'express';
import {
  getRegistrations,
  getRegistrationById,
  approveRegistration,
  rejectRegistration,
  getHierarchyTree,
  getWeeklyLeaderboard,
  getCategories
} from '../controllers/admin.controller';
import { authMiddleware, requireAdminApprover } from '../middleware/auth.middleware';

const router = Router();

// Retrieve categories, registration list and detail
router.get('/categories', getCategories);
router.get('/registrations', authMiddleware, getRegistrations);
router.get('/registrations/:id', authMiddleware, getRegistrationById);
router.get('/hierarchy', authMiddleware, getHierarchyTree);
router.get('/leaderboard', authMiddleware, getWeeklyLeaderboard);

// Review registration status (Restricted to authorized management roles)
router.patch('/registrations/:id/approve', authMiddleware, requireAdminApprover, approveRegistration);
router.patch('/registrations/:id/reject', authMiddleware, requireAdminApprover, rejectRegistration);

export default router;

