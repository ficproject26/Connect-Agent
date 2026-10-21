import { Router } from 'express';
import {
  getReports,
  getReportById,
  createReport,
  reviewReport,
  submitReport,
  getSubmittedReports,
  getSubmittedReportById
} from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Manager-parity submitted reports endpoints (must come before /:id)
router.post('/submit', submitReport);
router.get('/submitted', getSubmittedReports);
router.get('/submitted/:id', getSubmittedReportById);

router.get('/', getReports);
router.get('/:id', getReportById);
router.post('/', createReport);
router.patch('/:id/review', reviewReport);

export default router;
