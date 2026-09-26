import { Router } from 'express';
import { realtimeWebSocketServer } from '../realtime';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: realtimeWebSocketServer.getHealth()
  });
});

export default router;
