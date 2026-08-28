import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
import { getCategories } from './controllers/admin.controller';

const app = express();

// Security and standard middlewares
app.use(helmet());
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

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'fail', message: 'Resource not found' });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
