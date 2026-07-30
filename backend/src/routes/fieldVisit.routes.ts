import { Router } from 'express';
import {
  startFieldVisit,
  completeFieldVisit,
  getFieldVisits
} from '../controllers/fieldVisit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/start', startFieldVisit);
router.post('/:id/complete', completeFieldVisit);
router.get('/', getFieldVisits);

export default router;
