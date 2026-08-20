"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Report = void 0;
const mongoose_1 = require("mongoose");
const reportSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'vendor', 'performance', 'visit'], required: true },
    content: { type: mongoose_1.Schema.Types.Mixed, required: true },
    remarks: { type: String },
    reviewedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent' },
    reviewedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
exports.Report = (0, mongoose_1.model)('Report', reportSchema);
exports.default = exports.Report;
//# sourceMappingURL=Report.js.map