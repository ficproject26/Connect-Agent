import { Router } from 'express';
import { getNotifications, markRead, markAllRead, clearNotifications } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getNotifications);
router.patch('/:id/read', markRead);
router.post('/read-all', markAllRead);
router.delete('/', clearNotifications);

export default router;
