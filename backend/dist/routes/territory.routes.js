"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const territory_controller_1 = require("../controllers/territory.controller");
const router = (0, express_1.Router)();
// Public / role-aware territory hierarchy from central Admin Pincode Management database
router.get('/hierarchy', territory_controller_1.getTerritoryHierarchy);
router.get('/states', territory_controller_1.getStates);
router.get('/districts', territory_controller_1.getDistricts);
router.get('/lookup/:pincode', territory_controller_1.lookupPincode);
exports.default = router;
//# sourceMappingURL=territory.routes.js.map