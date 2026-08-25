"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vendor = void 0;
const mongoose_1 = require("mongoose");
const vendorSchema = new mongoose_1.Schema({
    businessName: { type: String, required: true },
    ownerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    category: { type: mongoose_1.Schema.Types.Mixed },
    gst: { type: String },
    state: { type: String },
    district: { type: String },
    division: { type: String },
    pincode: { type: String },
    kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    location: {
        address: { type: String, required: true },
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 }
    },
    status: { type: String, default: 'pending' },
    documents: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' }],
    assignedAgent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent' },
    // Agent onboarding tracking fields
    joiningType: { type: String },
    createdVia: { type: String },
    registrationSource: { type: String },
    agentId: { type: mongoose_1.Schema.Types.Mixed },
    onboardedBy: { type: mongoose_1.Schema.Types.Mixed },
    onboardedByAgentId: { type: mongoose_1.Schema.Types.Mixed },
    agentName: { type: String },
    agentRegistrationId: { type: String },
    registrationId: { type: String },
    role: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    strict: false
});
vendorSchema.index({ state: 1, district: 1, division: 1, pincode: 1 });
vendorSchema.index({ status: 1, kycStatus: 1 });
vendorSchema.index({ assignedAgent: 1 });
vendorSchema.index({ agentId: 1 });
vendorSchema.index({ onboardedBy: 1 });
vendorSchema.index({ phone: 1 });
vendorSchema.index({ createdAt: -1 });
exports.Vendor = (0, mongoose_1.model)('Vendor', vendorSchema);
exports.default = exports.Vendor;
//# sourceMappingURL=Vendor.js.map