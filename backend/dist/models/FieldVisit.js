"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldVisit = void 0;
const mongoose_1 = require("mongoose");
const fieldVisitSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.Mixed, ref: 'Agent', required: false },
    vendor: { type: mongoose_1.Schema.Types.Mixed, ref: 'Vendor', required: false, default: null },
    vendorId: { type: String, default: null },
    shopName: { type: String, trim: true },
    category: { type: String, trim: true },
    businessCategory: { type: String, trim: true },
    shopPhoto: { type: String },
    storefrontPhoto: { type: String },
    photoBeforeVisit: { type: String },
    photoAfterVisit: { type: String },
    interestedStatus: { type: String, enum: ['YES', 'NO', 'yes', 'no', 'Interested', 'Not Interested'] },
    interestStatus: { type: String, enum: ['YES', 'NO', 'yes', 'no', 'Interested', 'Not Interested'] },
    notInterestedReason: { type: String },
    otherReason: { type: String },
    voiceNote: { type: String },
    audioVoiceNote: { type: String },
    checkInLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracy: { type: Number },
        timestamp: { type: Date, default: Date.now }
    },
    checkOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number },
        accuracy: { type: Number },
        timestamp: { type: Date }
    },
    visitDate: { type: Date, default: Date.now },
    completedAt: { type: Date },
    remarks: { type: String },
    status: { type: String, default: 'completed' },
    onboardingStatus: { type: String, default: 'PENDING' },
    managerId: { type: String },
    managerName: { type: String },
    managerRole: { type: String },
    recordedById: { type: String },
    recordedByName: { type: String },
    recordedByRole: { type: String },
    state: { type: String },
    district: { type: String },
    division: { type: String },
    pincode: { type: String },
    stateId: { type: String },
    districtId: { type: String },
    divisionId: { type: String },
    pincodeId: { type: String },
    pincodeCode: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    strict: false
});
fieldVisitSchema.index({ agent: 1, visitDate: -1 });
fieldVisitSchema.index({ vendor: 1 });
fieldVisitSchema.index({ shopName: 1 });
fieldVisitSchema.index({ status: 1 });
fieldVisitSchema.index({ interestStatus: 1 });
fieldVisitSchema.index({ createdAt: -1 });
exports.FieldVisit = (0, mongoose_1.model)('FieldVisit', fieldVisitSchema);
exports.default = exports.FieldVisit;
//# sourceMappingURL=FieldVisit.js.map