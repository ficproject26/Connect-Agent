import { Router } from 'express';
import { getReports, getReportById, createReport, reviewReport } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getReports);
router.get('/:id', getReportById);
router.post('/', createReport);
router.patch('/:id/review', reviewReport);

export default router;
