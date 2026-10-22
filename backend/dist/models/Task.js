"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const taskSchema = new mongoose_1.Schema({
    _id: { type: mongoose_1.Schema.Types.Mixed },
    taskNumber: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
        type: String,
        enum: ['High', 'Medium', 'Low', 'high', 'medium', 'low'],
        default: 'Medium',
        index: true
    },
    dueDate: { type: Date, required: true, index: true },
    taskType: {
        type: String,
        enum: ['admin_direct', 'agent_request'],
        default: 'admin_direct',
        index: true
    },
    requestStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'n/a'],
        default: 'n/a',
        index: true
    },
    status: {
        type: String,
        enum: [
            'Pending Admin Review',
            'Assigned',
            'In Progress',
            'Rework',
            'Submitted for Review',
            'Approved',
            'Rejected',
            'Closed',
            'Completed',
            'Accepted',
            'Pending Acceptance'
        ],
        default: 'Assigned',
        index: true
    },
    hierarchyLevel: {
        type: String,
        enum: ['state', 'district', 'division', 'pincode'],
        index: true
    },
    // Territory scope
    state: { type: String, index: true },
    stateId: { type: String },
    district: { type: String, index: true },
    districtId: { type: String },
    division: { type: String, index: true },
    divisionId: { type: String },
    pincode: { type: String, index: true },
    pincodeId: { type: String },
    location: { type: String },
    // Associated vendor
    vendor: { type: String },
    vendorId: { type: mongoose_1.Schema.Types.Mixed },
    category: { type: String },
    // Creator / Requester
    createdById: { type: mongoose_1.Schema.Types.Mixed, index: true },
    createdByName: { type: String },
    createdByRole: { type: String },
    createdByAdminId: { type: mongoose_1.Schema.Types.Mixed },
    createdByAdminName: { type: String },
    createdByAdminRole: { type: String },
    // Receiving Admin
    receivingAdminId: { type: mongoose_1.Schema.Types.Mixed, index: true },
    receivingAdminName: { type: String },
    receivingAdminRole: { type: String },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    // Assigned Agent
    assignedAgentId: { type: mongoose_1.Schema.Types.Mixed, index: true },
    assignedAgentName: { type: String },
    assignedAgentRole: { type: String },
    assignedDate: { type: Date },
    // Legacy Manager
    assignedManagerId: { type: mongoose_1.Schema.Types.Mixed },
    assignedManagerName: { type: String },
    assignedManagerRole: { type: String },
    // Evidence & Execution
    acceptedAt: { type: Date },
    acceptedBy: { type: String },
    acceptedById: { type: mongoose_1.Schema.Types.Mixed },
    startedAt: { type: Date },
    startedBy: { type: String },
    startedById: { type: mongoose_1.Schema.Types.Mixed },
    photos: { type: [String], default: [] },
    shopPhoto: { type: String },
    voiceNote: { type: String },
    completionDetails: {
        remarks: { type: String },
        photos: { type: [String], default: [] },
        voiceNote: { type: String },
        submittedAt: { type: Date },
        completedAt: { type: Date },
        completedBy: { type: String },
        workCompleted: { type: String },
        resolutionDetails: { type: String },
        completionPhotos: { type: [String], default: [] }
    },
    reworkDetails: {
        reason: { type: String },
        reworkRemarks: { type: String },
        requestedBy: { type: String },
        requestedById: { type: mongoose_1.Schema.Types.Mixed },
        requestedAt: { type: Date },
        previousSubmissions: {
            type: [
                {
                    remarks: String,
                    photos: [String],
                    voiceNote: String,
                    submittedAt: Date,
                    submittedBy: String,
                    reviewNotes: String
                }
            ],
            default: []
        }
    },
    rejectionReason: { type: String },
    rejectionDetails: {
        reason: { type: String },
        rejectedBy: { type: String },
        rejectedById: { type: mongoose_1.Schema.Types.Mixed },
        rejectedAt: { type: Date },
        rejectionType: { type: String, enum: ['admin_rejected_request', 'agent_rejected_task'] }
    },
    // History and logs
    history: {
        type: [
            {
                action: { type: String, required: true },
                performedBy: { type: String, required: true },
                performedById: { type: mongoose_1.Schema.Types.Mixed },
                performedRole: { type: String },
                timestamp: { type: Date, default: Date.now },
                details: { type: mongoose_1.Schema.Types.Mixed }
            }
        ],
        default: []
    },
    activityLog: { type: [mongoose_1.Schema.Types.Mixed], default: [] }
}, {
    timestamps: true,
    collection: 'tasks',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
// Virtual property to calculate whether task is overdue
taskSchema.virtual('isOverdue').get(function () {
    if (!this.dueDate)
        return false;
    const closedStatuses = ['Approved', 'Completed', 'Rejected', 'Closed'];
    return new Date() > new Date(this.dueDate) && !closedStatuses.includes(this.status);
});
// Optimized database indexes for task workflows, dashboard counters, and territory filtering
taskSchema.index({ assignedAgentId: 1, status: 1, dueDate: 1 });
taskSchema.index({ assignedAgentId: 1, createdAt: -1 });
taskSchema.index({ createdById: 1, createdAt: -1 });
taskSchema.index({ state: 1, district: 1, division: 1, pincode: 1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ taskNumber: 1 }, { unique: true, sparse: true });
taskSchema.index({ createdAt: -1 });
// Auto-generate ObjectId or string ID if missing
taskSchema.pre('save', function (next) {
    if (!this._id) {
        this._id = new mongoose_1.default.Types.ObjectId();
    }
    if (!this.taskNumber) {
        this.taskNumber = `TSK-${Date.now().toString().slice(-6)}`;
    }
    next();
});
exports.Task = mongoose_1.default.model('Task', taskSchema, 'tasks');
exports.default = exports.Task;
//# sourceMappingURL=Task.js.map