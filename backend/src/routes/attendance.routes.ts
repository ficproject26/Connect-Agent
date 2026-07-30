import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getSubordinateAttendance
} from '../controllers/attendance.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/mine', getMyAttendance);
router.get('/subordinates', getSubordinateAttendance);

export default router;
