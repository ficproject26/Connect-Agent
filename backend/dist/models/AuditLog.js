"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    entityId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    entityType: { type: String, enum: ['Agent', 'Vendor', 'Target', 'Ticket', 'Report'], required: true },
    action: { type: String, enum: ['profile_update', 'vendor_change', 'target_change', 'ticket_change', 'approval_change'], required: true },
    fieldName: { type: String },
    oldValue: { type: String },
    newValue: { type: String },
    changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    createdAt: { type: Date, default: Date.now }
});
auditLogSchema.index({ entityId: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });
exports.AuditLog = (0, mongoose_1.model)('AuditLog', auditLogSchema);
exports.default = exports.AuditLog;
//# sourceMappingURL=AuditLog.js.map