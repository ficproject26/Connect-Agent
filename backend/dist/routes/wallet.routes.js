"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wallet_controller_1 = require("../controllers/wallet.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authMiddleware);
router.get('/balance', wallet_controller_1.getBalance);
router.get('/transactions', wallet_controller_1.getTransactions);
router.post('/cashout', wallet_controller_1.requestCashout);
exports.default = router;
//# sourceMappingURL=wallet.routes.js.map