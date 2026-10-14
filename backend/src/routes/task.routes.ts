import { Router } from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  approveAndAssignRequest,
  rejectRequest,
  acceptTask,
  rejectTask,
  submitEvidence,
  reviewEvidence,
  getEligibleAgents
} from '../controllers/task.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// Tasks collection
router.get('/', getTasks);
router.post('/', createTask);
router.get('/eligible-agents', getEligibleAgents);

// Individual task operations
router.get('/:id', getTaskById);
router.post('/:id/approve-request', approveAndAssignRequest);
router.post('/:id/reject-request', rejectRequest);
router.post('/:id/accept', acceptTask);
router.post('/:id/reject-task', rejectTask);
router.post('/:id/submit-evidence', submitEvidence);
router.post('/:id/review-evidence', reviewEvidence);

export default router;
