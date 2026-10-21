import { Router } from 'express';
import {
  startFieldVisit,
  completeFieldVisit,
  getFieldVisits,
  getFieldVisitAgents,
  recordShopVisit,
  getShopVisitById,
  updateShopVisit,
  revalidateEligibility
} from '../controllers/fieldVisit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Shop Visit endpoints
router.post('/shop-visit', recordShopVisit);
router.get('/shop-visit/:id/eligibility', revalidateEligibility);
router.get('/shop-visit/:id', getShopVisitById);
router.patch('/shop-visit/:id', updateShopVisit);

// General field visit endpoints
router.get('/:id/eligibility', revalidateEligibility);
router.post('/start', startFieldVisit);
router.post('/:id/complete', completeFieldVisit);
router.get('/', getFieldVisits);
router.post('/', recordShopVisit);
router.get('/agents', getFieldVisitAgents);

export default router;
