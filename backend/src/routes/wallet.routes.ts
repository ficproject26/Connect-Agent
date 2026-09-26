import { Router } from 'express';
import { getBalance, getTransactions, getWalletSummary, requestCashout, getBankDetails, updateBankDetails } from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/balance', getBalance);
router.get('/summary', getWalletSummary);
router.get('/transactions', getTransactions);
router.get('/bank-details', getBankDetails);
router.put('/bank-details', updateBankDetails);
router.post('/bank-details', updateBankDetails);
router.post('/cashout', requestCashout);

export default router;
