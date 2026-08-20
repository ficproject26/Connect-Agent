"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    receiver: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    category: { type: String, enum: ['target_assigned', 'vendor_assigned', 'ticket_assigned', 'report_reminder', 'approval_status', 'announcement'], required: true },
    createdAt: { type: Date, default: Date.now }
});
notificationSchema.index({ receiver: 1, read: 1, createdAt: -1 });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.default = exports.Notification;
//# sourceMappingURL=Notification.js.map