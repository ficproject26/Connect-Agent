"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const realtime_1 = require("../realtime");
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    res.json({
        success: true,
        data: realtime_1.realtimeWebSocketServer.getHealth()
    });
});
exports.default = router;
//# sourceMappingURL=realtime.routes.js.map