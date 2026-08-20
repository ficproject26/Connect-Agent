"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("../controllers/attendance.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.post('/check-in', attendance_controller_1.checkIn);
router.post('/check-out', attendance_controller_1.checkOut);
router.get('/mine', attendance_controller_1.getMyAttendance);
router.get('/subordinates', attendance_controller_1.getSubordinateAttendance);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map