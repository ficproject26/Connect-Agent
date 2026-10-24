import { getPresignedUrl, getObjectStream, uploadToS3 } from './config/s3';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import vendorRoutes from './routes/vendor.routes';
import targetRoutes from './routes/target.routes';
import ticketRoutes from './routes/ticket.routes';
import reportRoutes from './routes/report.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import walletRoutes from './routes/wallet.routes';
import attendanceRoutes from './routes/attendance.routes';
import fieldVisitRoutes from './routes/fieldVisit.routes';
import territoryRoutes from './routes/territory.routes';
import taskRoutes from './routes/task.routes';
import { getCategories } from './controllers/admin.controller';

const app = express();

// Enable Gzip response compression for high performance on JSON payloads
app.use(compression({
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security and standard middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/api', apiRateLimiter);

// Public categories endpoint
app.get(['/api/categories', '/api/public/categories'], getCategories);

// Routes

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api', authRoutes);

app.use('/api/vendors', vendorRoutes);
app.use('/vendors', vendorRoutes);

app.use('/api/targets', targetRoutes);
app.use('/targets', targetRoutes);

app.use('/api/tickets', ticketRoutes);
app.use('/tickets', ticketRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

app.use('/api/dashboard', dashboardRoutes);
app.use('/dashboard', dashboardRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.use('/api/wallet', walletRoutes);
app.use('/wallet', walletRoutes);

app.use('/api/attendance', attendanceRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/api/field-visits', fieldVisitRoutes);
app.use('/field-visits', fieldVisitRoutes);
app.use('/api/shop-visits', fieldVisitRoutes);
app.use('/shop-visits', fieldVisitRoutes);

app.use('/api/territory', territoryRoutes);
app.use('/territory', territoryRoutes);

app.use('/api/tasks', taskRoutes);
app.use('/tasks', taskRoutes);

// S3 Media streaming proxy and presigned view handler
const mediaHandler = async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || (req.params as any).key;
    if (!rawKey) return res.status(400).json({ error: 'Missing object key' });
    const key = decodeURIComponent(rawKey);

    // Private folders check (e.g. kyc, admin_docs, agent_docs)
    const isPrivate = key.startsWith('kyc') || key.startsWith('admin_docs') || key.startsWith('agent_docs');
    if (isPrivate && !(req as any).agent && !(req as any).user) {
      return res.status(403).json({ error: 'Authentication required for private documents' });
    }

    const { body, contentType, contentLength } = await getObjectStream(key);
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (body && typeof (body as any).pipe === 'function') {
      (body as any).pipe(res);
    } else {
      const presigned = await getPresignedUrl(key, 900);
      return res.redirect(presigned);
    }
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'File not found in S3' });
    }
    console.error('S3 streaming proxy error:', err);
    return res.status(500).json({ error: 'Failed to retrieve file from storage' });
  }
};

app.get('/api/media/s3/*', mediaHandler);
app.get('/media/s3/*', mediaHandler);

const uploadRouteHandler = async (req: Request, res: Response) => {
  try {
    const base64Data = req.body && (req.body.image || req.body.file || req.body.base64 || req.body.data);
    if (base64Data && typeof base64Data === 'string' && base64Data.startsWith('data:')) {
      const folder = (req.body && req.body.folder) || 'agent_uploads';
      const filename = (req.body && req.body.filename) || `upload_${Date.now()}`;
      const result = await uploadToS3(base64Data, folder, filename);
      return res.status(200).json({
        success: true,
        url: result.durableUrl || result.url,
        key: result.key,
        contentType: result.contentType,
        size: result.size
      });
    }

    return res.status(400).json({ success: false, error: 'No base64 data provided' });
  } catch (uploadErr: any) {
    console.error('Agent upload error:', uploadErr);
    return res.status(500).json({ success: false, error: uploadErr.message || 'Upload failed' });
  }
};

app.post('/api/upload', uploadRouteHandler);
app.post('/upload', uploadRouteHandler);

// Detailed health check route with DB connectivity verification
const healthHandler = (req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatusMap[dbState] || 'unknown',
      connected: dbState === 1,
    },
    message: 'Forge Connect Backend API is healthy',
  });
};

import socketServer from './realtime/socketServer';
import eventBus from './realtime/eventBus';

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// Centralized Realtime System Observability & Health
app.get('/api/realtime/status', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    realtime: socketServer.getStatus()
  });
});

// WebSocket HTTP fallback endpoint
app.get(['/api/ws', '/ws'], (req: Request, res: Response) => {
  if (req.headers.upgrade) {
    return res.status(426).send('Upgrade Required');
  }
  res.status(200).json({
    status: 'ok',
    message: 'Forge Connect Realtime WebSocket endpoint. Please connect with a WebSocket client (wss://).',
    protocol: 'ws',
    realtime: socketServer.getStatus()
  });
});

// Real-time Event Trigger Endpoint for testing & inter-service triggers
app.post('/api/realtime/test-emit', async (req: Request, res: Response) => {
  try {
    const event = await eventBus.publish({
      event: req.body.event || 'ENTITY_UPDATED',
      entity: req.body.entity || 'generic',
      entityId: req.body.entityId || 'test_id',
      action: req.body.action || 'updated',
      scope: req.body.scope || { isPublic: true },
      data: req.body.data || {}
    });
    res.status(200).json({ status: 'ok', event });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});



// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'fail', message: 'Resource not found' });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
