import { Router } from 'express';
import { getBalance, getTransactions, requestCashout } from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/balance', getBalance);
router.get('/transactions', getTransactions);
router.post('/cashout', requestCashout);

export default router;
