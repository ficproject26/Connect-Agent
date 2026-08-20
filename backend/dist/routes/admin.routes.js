"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Retrieve registration list and detail
router.get('/registrations', auth_middleware_1.authMiddleware, admin_controller_1.getRegistrations);
router.get('/registrations/:id', auth_middleware_1.authMiddleware, admin_controller_1.getRegistrationById);
router.get('/hierarchy', auth_middleware_1.authMiddleware, admin_controller_1.getHierarchyTree);
router.get('/leaderboard', auth_middleware_1.authMiddleware, admin_controller_1.getWeeklyLeaderboard);
// Review registration status
router.patch('/registrations/:id/approve', auth_middleware_1.authMiddleware, admin_controller_1.approveRegistration);
router.patch('/registrations/:id/reject', auth_middleware_1.authMiddleware, admin_controller_1.rejectRegistration);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map