"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const kycDocsSchema = new mongoose_1.Schema({
    aadhaarCard: { type: String, default: '' },
    panCard: { type: String, default: '' },
    passportPhoto: { type: String, default: '' },
    signature: { type: String, default: '' },
    cancelledCheque: { type: String, default: '' },
    educationalCertificates: { type: String, default: '' }
}, { _id: false });
const territorySchema = new mongoose_1.Schema({
    state: { type: String, default: '' },
    district: { type: String, default: '' },
    division: { type: String, default: '' },
    pincode: { type: String, default: '' }
}, { _id: false });
const agentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: {
        type: String,
        enum: ['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician'],
        required: true
    },
    registrationId: { type: String, unique: true, sparse: true },
    dob: { type: Date },
    gender: { type: String },
    qualification: { type: String },
    experience: { type: String },
    previousCompany: { type: String },
    territory: {
        type: territorySchema,
        default: () => ({})
    },
    kycStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    status: {
        type: String,
        default: 'pending'
    },
    kycDocs: {
        type: kycDocsSchema,
        default: () => ({})
    },
    rejectionReason: { type: String, default: '' },
    remarks: { type: String, default: '' },
    registrationFeePaid: { type: Boolean, default: false },
    performanceScore: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
agentSchema.index({ 'territory.state': 1, 'territory.district': 1, 'territory.division': 1, 'territory.pincode': 1 });
agentSchema.index({ role: 1, kycStatus: 1 });
agentSchema.index({ phone: 1 });
agentSchema.index({ createdAt: -1 });
// Pre-save hook to hash password
agentSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        this.password = await bcryptjs_1.default.hash(this.password, salt);
        next();
    }
    catch (err) {
        next(err);
    }
});
// Method to compare password
agentSchema.methods.comparePassword = async function (password) {
    return bcryptjs_1.default.compare(password, this.password);
};
exports.Agent = (0, mongoose_1.model)('Agent', agentSchema);
exports.default = exports.Agent;
//# sourceMappingURL=Agent.js.map