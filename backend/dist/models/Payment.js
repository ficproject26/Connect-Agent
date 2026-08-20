"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = void 0;
const mongoose_1 = require("mongoose");
const paymentSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    amount: { type: Number, required: true },
    transactionId: { type: String, required: true, unique: true },
    paymentMethod: { type: String, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verifiedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent' },
    verifiedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
exports.Payment = (0, mongoose_1.model)('Payment', paymentSchema);
exports.default = exports.Payment;
//# sourceMappingURL=Payment.js.map