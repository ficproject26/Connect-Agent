"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/', notification_controller_1.getNotifications);
router.patch('/:id/read', notification_controller_1.markRead);
router.post('/read-all', notification_controller_1.markAllRead);
router.delete('/', notification_controller_1.clearNotifications);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map