"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorCategory = void 0;
const mongoose_1 = require("mongoose");
const vendorCategorySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});
exports.VendorCategory = (0, mongoose_1.model)('VendorCategory', vendorCategorySchema);
exports.default = exports.VendorCategory;
//# sourceMappingURL=VendorCategory.js.map