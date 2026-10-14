"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_controller_1 = require("../controllers/task.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All task routes require authentication
router.use(auth_middleware_1.authMiddleware);
// Tasks collection
router.get('/', task_controller_1.getTasks);
router.post('/', task_controller_1.createTask);
router.get('/eligible-agents', task_controller_1.getEligibleAgents);
// Individual task operations
router.get('/:id', task_controller_1.getTaskById);
router.post('/:id/approve-request', task_controller_1.approveAndAssignRequest);
router.post('/:id/reject-request', task_controller_1.rejectRequest);
router.post('/:id/accept', task_controller_1.acceptTask);
router.post('/:id/reject-task', task_controller_1.rejectTask);
router.post('/:id/submit-evidence', task_controller_1.submitEvidence);
router.post('/:id/review-evidence', task_controller_1.reviewEvidence);
exports.default = router;
//# sourceMappingURL=task.routes.js.map