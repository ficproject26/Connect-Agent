"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldVisit = void 0;
const mongoose_1 = require("mongoose");
const fieldVisitSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    checkInLocation: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
    },
    checkOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    visitDate: { type: Date, default: Date.now },
    photoBeforeVisit: { type: String },
    photoAfterVisit: { type: String },
    remarks: { type: String },
    status: { type: String, enum: ['started', 'completed'], default: 'started' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
fieldVisitSchema.index({ agent: 1, visitDate: -1 });
fieldVisitSchema.index({ vendor: 1 });
fieldVisitSchema.index({ status: 1 });
fieldVisitSchema.index({ createdAt: -1 });
exports.FieldVisit = (0, mongoose_1.model)('FieldVisit', fieldVisitSchema);
exports.default = exports.FieldVisit;
//# sourceMappingURL=FieldVisit.js.map