"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
// Manager-parity submitted reports endpoints (must come before /:id)
router.post('/submit', report_controller_1.submitReport);
router.get('/submitted', report_controller_1.getSubmittedReports);
router.get('/submitted/:id', report_controller_1.getSubmittedReportById);
router.get('/', report_controller_1.getReports);
router.get('/:id', report_controller_1.getReportById);
router.post('/', report_controller_1.createReport);
router.patch('/:id/review', report_controller_1.reviewReport);
exports.default = router;
//# sourceMappingURL=report.routes.js.map