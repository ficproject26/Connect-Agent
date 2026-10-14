import { Router } from 'express';
import {
  startFieldVisit,
  completeFieldVisit,
  getFieldVisits,
  getFieldVisitAgents
} from '../controllers/fieldVisit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/start', startFieldVisit);
router.post('/:id/complete', completeFieldVisit);
router.get('/', getFieldVisits);
router.get('/agents', getFieldVisitAgents);

export default router;
