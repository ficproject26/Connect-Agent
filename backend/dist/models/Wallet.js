"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const mongoose_1 = require("mongoose");
const transactionSchema = new mongoose_1.Schema({
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed', required: true },
    createdAt: { type: Date, default: Date.now }
});
const walletSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true, unique: true },
    balance: { type: Number, default: 0, required: true },
    transactions: [transactionSchema]
}, {
    timestamps: true
});
exports.Wallet = (0, mongoose_1.model)('Wallet', walletSchema);
exports.default = exports.Wallet;
//# sourceMappingURL=Wallet.js.map