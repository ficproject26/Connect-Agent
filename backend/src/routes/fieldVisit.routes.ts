import { Router } from 'express';
import {
  startFieldVisit,
  completeFieldVisit,
  getFieldVisits,
  getFieldVisitAgents,
  recordShopVisit,
  getShopVisitById,
  updateShopVisit
} from '../controllers/fieldVisit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Shop Visit endpoints
router.post('/shop-visit', recordShopVisit);
router.get('/shop-visit/:id', getShopVisitById);
router.patch('/shop-visit/:id', updateShopVisit);

router.post('/start', startFieldVisit);
router.post('/:id/complete', completeFieldVisit);
router.get('/', getFieldVisits);
router.post('/', recordShopVisit);
router.get('/agents', getFieldVisitAgents);

export default router;
