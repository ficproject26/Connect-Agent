"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    receiver: { type: mongoose_1.Schema.Types.Mixed, required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false, index: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    category: { type: String, required: true, default: 'announcement' },
    link: { type: String, default: '' },
    relatedEntityId: { type: String, default: '' },
    relatedEntityType: { type: String, default: '' },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
});
notificationSchema.index({ receiver: 1, read: 1, createdAt: -1 });
exports.Notification = (0, mongoose_1.model)('Notification', notificationSchema);
exports.default = exports.Notification;
//# sourceMappingURL=Notification.js.map