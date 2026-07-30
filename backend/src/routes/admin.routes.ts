import { Router } from 'express';
import {
  getRegistrations,
  getRegistrationById,
  approveRegistration,
  rejectRegistration,
  getHierarchyTree,
  getWeeklyLeaderboard
} from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Retrieve registration list and detail
router.get('/registrations', authMiddleware, getRegistrations);
router.get('/registrations/:id', authMiddleware, getRegistrationById);
router.get('/hierarchy', authMiddleware, getHierarchyTree);
router.get('/leaderboard', authMiddleware, getWeeklyLeaderboard);

// Review registration status
router.patch('/registrations/:id/approve', authMiddleware, approveRegistration);
router.patch('/registrations/:id/reject', authMiddleware, rejectRegistration);

export default router;
