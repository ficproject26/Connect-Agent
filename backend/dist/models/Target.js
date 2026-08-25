"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Target = void 0;
const mongoose_1 = require("mongoose");
const targetSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
    targetValue: { type: Number, required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
targetSchema.index({ createdBy: 1 });
targetSchema.index({ type: 1 });
targetSchema.index({ createdAt: -1 });
exports.Target = (0, mongoose_1.model)('Target', targetSchema);
exports.default = exports.Target;
//# sourceMappingURL=Target.js.map