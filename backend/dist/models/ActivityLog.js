"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = void 0;
const mongoose_1 = require("mongoose");
const activityLogSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    action: { type: String, required: true },
    ipAddress: { type: String },
    details: { type: String },
    createdAt: { type: Date, default: Date.now }
});
exports.ActivityLog = (0, mongoose_1.model)('ActivityLog', activityLogSchema);
exports.default = exports.ActivityLog;
//# sourceMappingURL=ActivityLog.js.map