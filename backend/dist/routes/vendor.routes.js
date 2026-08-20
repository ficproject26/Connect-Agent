"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_controller_1 = require("../controllers/vendor.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All vendor routes require authentication
router.use(auth_middleware_1.authMiddleware);
router.get('/', vendor_controller_1.getVendors);
router.get('/:id', vendor_controller_1.getVendorById);
router.post('/', vendor_controller_1.createVendor);
router.patch('/:id', vendor_controller_1.updateVendor);
router.patch('/:id/status', vendor_controller_1.updateVendorStatus);
exports.default = router;
//# sourceMappingURL=vendor.routes.js.map