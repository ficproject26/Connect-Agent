"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const target_controller_1 = require("../controllers/target.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const target_schema_1 = require("../schemas/target.schema");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_middleware_1.authMiddleware);
router.get('/', target_controller_1.getTargets);
router.get('/subordinates', target_controller_1.getSubordinates);
router.post('/', (0, validate_middleware_1.validate)(target_schema_1.createTargetSchema), target_controller_1.createTarget);
router.post('/allocate', target_controller_1.allocateTarget);
router.post('/:id/assign', target_controller_1.assignTarget);
router.get('/assignments/mine', target_controller_1.getMyAssignments);
router.patch('/assignments/:id/status', (0, validate_middleware_1.validate)(target_schema_1.updateTargetStatusSchema), target_controller_1.updateAssignmentStatus);
exports.default = router;
//# sourceMappingURL=target.routes.js.map