"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticket = void 0;
const mongoose_1 = require("mongoose");
const ticketSchema = new mongoose_1.Schema({
    ticketId: { type: String, required: true, unique: true },
    creator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent' },
    category: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'], default: 'open' },
    resolutionDetails: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
exports.Ticket = (0, mongoose_1.model)('Ticket', ticketSchema);
exports.default = exports.Ticket;
//# sourceMappingURL=Ticket.js.map