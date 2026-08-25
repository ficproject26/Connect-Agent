"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
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
const app = (0, express_1.default)();
// Security and standard middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ limit: '100mb', extended: true }));
app.use('/api', rateLimiter_middleware_1.apiRateLimiter);
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
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ status: 'fail', message: 'Resource not found' });
});
// Centralized Error Handler Middleware
app.use(error_middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map