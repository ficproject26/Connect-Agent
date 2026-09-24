"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticket = void 0;
const mongoose_1 = require("mongoose");
const ticketSchema = new mongoose_1.Schema({
    ticketId: { type: String, required: true, unique: true },
    creator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    creatorRole: { type: String },
    creatorName: { type: String },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent' },
    assignedAgent: { type: String },
    vendorName: { type: String },
    storeName: { type: String },
    state: { type: String },
    district: { type: String },
    division: { type: String },
    pincode: { type: String },
    territory: { type: String },
    category: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated_to_admin'], default: 'open' },
    attachmentName: { type: String },
    attachmentUrl: { type: String },
    resolutionDetails: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
ticketSchema.index({ creator: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ state: 1, district: 1, pincode: 1 });
ticketSchema.index({ createdAt: -1 });
exports.Ticket = (0, mongoose_1.model)('Ticket', ticketSchema);
exports.default = exports.Ticket;
//# sourceMappingURL=Ticket.js.map