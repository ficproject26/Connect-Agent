"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fieldVisit_controller_1 = require("../controllers/fieldVisit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
// Shop Visit endpoints
router.post('/shop-visit', fieldVisit_controller_1.recordShopVisit);
router.get('/shop-visit/:id', fieldVisit_controller_1.getShopVisitById);
router.patch('/shop-visit/:id', fieldVisit_controller_1.updateShopVisit);
router.post('/start', fieldVisit_controller_1.startFieldVisit);
router.post('/:id/complete', fieldVisit_controller_1.completeFieldVisit);
router.get('/', fieldVisit_controller_1.getFieldVisits);
router.post('/', fieldVisit_controller_1.recordShopVisit);
router.get('/agents', fieldVisit_controller_1.getFieldVisitAgents);
exports.default = router;
//# sourceMappingURL=fieldVisit.routes.js.map