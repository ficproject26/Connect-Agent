"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TargetAssignment = void 0;
const mongoose_1 = require("mongoose");
const targetAssignmentSchema = new mongoose_1.Schema({
    target: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Target', required: true },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    assignedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['assigned', 'accepted', 'in_progress', 'completed', 'pending', 'overdue'],
        default: 'assigned',
        required: true
    },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
exports.TargetAssignment = (0, mongoose_1.model)('TargetAssignment', targetAssignmentSchema);
exports.default = exports.TargetAssignment;
//# sourceMappingURL=TargetAssignment.js.map