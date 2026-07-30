import { Router } from 'express';
import { getTickets, getTicketById, createTicket, updateTicketStatus } from '../controllers/ticket.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getTickets);
router.get('/:id', getTicketById);
router.post('/', createTicket);
router.patch('/:id/status', updateTicketStatus);

export default router;
