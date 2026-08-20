"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = void 0;
const mongoose_1 = require("mongoose");
const documentSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    ownerType: { type: String, enum: ['Agent', 'Vendor'], required: true },
    type: { type: String, enum: ['aadhar', 'pan', 'passport_photo', 'signature', 'cancelled_cheque', 'education_certificate', 'other'], required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});
exports.DocumentModel = (0, mongoose_1.model)('Document', documentSchema);
exports.default = exports.DocumentModel;
//# sourceMappingURL=Document.js.map