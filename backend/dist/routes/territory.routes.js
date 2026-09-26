"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const territory_controller_1 = require("../controllers/territory.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public / role-aware territory hierarchy from central Admin Pincode Management database
router.get('/hierarchy', auth_middleware_1.optionalAuthMiddleware, territory_controller_1.getTerritoryHierarchy);
router.get('/all-hierarchy', territory_controller_1.getAllTerritoryHierarchy);
router.get('/states', territory_controller_1.getStates);
router.get('/districts', territory_controller_1.getDistricts);
router.get('/divisions', territory_controller_1.getDivisions);
router.get('/pincodes', territory_controller_1.getPincodes);
router.get('/lookup/:pincode', territory_controller_1.lookupPincode);
exports.default = router;
//# sourceMappingURL=territory.routes.js.map