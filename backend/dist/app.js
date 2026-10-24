"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const s3_1 = require("./config/s3");
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const mongoose_1 = __importDefault(require("mongoose"));
const rateLimiter_middleware_1 = require("./middleware/rateLimiter.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const vendor_routes_1 = __importDefault(require("./routes/vendor.routes"));
const target_routes_1 = __importDefault(require("./routes/target.routes"));
const ticket_routes_1 = __importDefault(require("./routes/ticket.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const wallet_routes_1 = __importDefault(require("./routes/wallet.routes"));
const attendance_routes_1 = __importDefault(require("./routes/attendance.routes"));
const fieldVisit_routes_1 = __importDefault(require("./routes/fieldVisit.routes"));
const territory_routes_1 = __importDefault(require("./routes/territory.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const admin_controller_1 = require("./controllers/admin.controller");
const app = (0, express_1.default)();
// Enable Gzip response compression for high performance on JSON payloads
app.use((0, compression_1.default)({
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    }
}));
// Security and standard middlewares
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
app.use('/api', rateLimiter_middleware_1.apiRateLimiter);
// Public categories endpoint
app.get(['/api/categories', '/api/public/categories'], admin_controller_1.getCategories);
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/auth', auth_routes_1.default);
app.use('/api', auth_routes_1.default);
app.use('/api/vendors', vendor_routes_1.default);
app.use('/vendors', vendor_routes_1.default);
app.use('/api/targets', target_routes_1.default);
app.use('/targets', target_routes_1.default);
app.use('/api/tickets', ticket_routes_1.default);
app.use('/tickets', ticket_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/reports', report_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/notifications', notification_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/dashboard', dashboard_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/admin', admin_routes_1.default);
app.use('/api/wallet', wallet_routes_1.default);
app.use('/wallet', wallet_routes_1.default);
app.use('/api/attendance', attendance_routes_1.default);
app.use('/attendance', attendance_routes_1.default);
app.use('/api/field-visits', fieldVisit_routes_1.default);
app.use('/field-visits', fieldVisit_routes_1.default);
app.use('/api/shop-visits', fieldVisit_routes_1.default);
app.use('/shop-visits', fieldVisit_routes_1.default);
app.use('/api/territory', territory_routes_1.default);
app.use('/territory', territory_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
app.use('/tasks', task_routes_1.default);
// S3 Media streaming proxy and presigned view handler
const mediaHandler = async (req, res) => {
    try {
        const rawKey = req.params[0] || req.params.key;
        if (!rawKey)
            return res.status(400).json({ error: 'Missing object key' });
        const key = decodeURIComponent(rawKey);
        // Private folders check (e.g. kyc, admin_docs, agent_docs)
        const isPrivate = key.startsWith('kyc') || key.startsWith('admin_docs') || key.startsWith('agent_docs');
        if (isPrivate && !req.agent && !req.user) {
            return res.status(403).json({ error: 'Authentication required for private documents' });
        }
        const { body, contentType, contentLength } = await (0, s3_1.getObjectStream)(key);
        if (contentType)
            res.setHeader('Content-Type', contentType);
        if (contentLength)
            res.setHeader('Content-Length', contentLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (body && typeof body.pipe === 'function') {
            body.pipe(res);
        }
        else {
            const presigned = await (0, s3_1.getPresignedUrl)(key, 900);
            return res.redirect(presigned);
        }
    }
    catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
            return res.status(404).json({ error: 'File not found in S3' });
        }
        console.error('S3 streaming proxy error:', err);
        return res.status(500).json({ error: 'Failed to retrieve file from storage' });
    }
};
app.get('/api/media/s3/*', mediaHandler);
app.get('/media/s3/*', mediaHandler);
const uploadRouteHandler = async (req, res) => {
    try {
        const base64Data = req.body && (req.body.image || req.body.file || req.body.base64 || req.body.data);
        if (base64Data && typeof base64Data === 'string' && base64Data.startsWith('data:')) {
            const folder = (req.body && req.body.folder) || 'agent_uploads';
            const filename = (req.body && req.body.filename) || `upload_${Date.now()}`;
            const result = await (0, s3_1.uploadToS3)(base64Data, folder, filename);
            return res.status(200).json({
                success: true,
                url: result.durableUrl || result.url,
                key: result.key,
                contentType: result.contentType,
                size: result.size
            });
        }
        return res.status(400).json({ success: false, error: 'No base64 data provided' });
    }
    catch (uploadErr) {
        console.error('Agent upload error:', uploadErr);
        return res.status(500).json({ success: false, error: uploadErr.message || 'Upload failed' });
    }
};
app.post('/api/upload', uploadRouteHandler);
app.post('/upload', uploadRouteHandler);
// Detailed health check route with DB connectivity verification
const healthHandler = (req, res) => {
    const dbState = mongoose_1.default.connection.readyState;
    const dbStatusMap = {
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
const socketServer_1 = __importDefault(require("./realtime/socketServer"));
const eventBus_1 = __importDefault(require("./realtime/eventBus"));
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
// Centralized Realtime System Observability & Health
app.get('/api/realtime/status', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        realtime: socketServer_1.default.getStatus()
    });
});
// WebSocket HTTP fallback endpoint
app.get(['/api/ws', '/ws'], (req, res) => {
    if (req.headers.upgrade) {
        return res.status(426).send('Upgrade Required');
    }
    res.status(200).json({
        status: 'ok',
        message: 'Forge Connect Realtime WebSocket endpoint. Please connect with a WebSocket client (wss://).',
        protocol: 'ws',
        realtime: socketServer_1.default.getStatus()
    });
});
// Real-time Event Trigger Endpoint for testing & inter-service triggers
app.post('/api/realtime/test-emit', async (req, res) => {
    try {
        const event = await eventBus_1.default.publish({
            event: req.body.event || 'ENTITY_UPDATED',
            entity: req.body.entity || 'generic',
            entityId: req.body.entityId || 'test_id',
            action: req.body.action || 'updated',
            scope: req.body.scope || { isPublic: true },
            data: req.body.data || {}
        });
        res.status(200).json({ status: 'ok', event });
    }
    catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 'fail', message: 'Resource not found' });
});
// Centralized Error Handler Middleware
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map