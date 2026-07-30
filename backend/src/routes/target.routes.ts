import { Router } from 'express';
import {
  getTargets,
  createTarget,
  allocateTarget,
  getSubordinates,
  assignTarget,
  getMyAssignments,
  updateAssignmentStatus
} from '../controllers/target.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTargetSchema, updateTargetStatusSchema } from '../schemas/target.schema';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/', getTargets);
router.get('/subordinates', getSubordinates);
router.post('/', validate(createTargetSchema), createTarget);
router.post('/allocate', allocateTarget);
router.post('/:id/assign', assignTarget);
router.get('/assignments/mine', getMyAssignments);
router.patch('/assignments/:id/status', validate(updateTargetStatusSchema), updateAssignmentStatus);

export default router;


