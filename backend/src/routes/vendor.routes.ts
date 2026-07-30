import { Router } from 'express';
import { getVendors, getVendorById, createVendor, updateVendor, updateVendorStatus } from '../controllers/vendor.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All vendor routes require authentication
router.use(authMiddleware);

router.get('/', getVendors);
router.get('/:id', getVendorById);
router.post('/', createVendor);
router.patch('/:id', updateVendor);
router.patch('/:id/status', updateVendorStatus);

export default router;
