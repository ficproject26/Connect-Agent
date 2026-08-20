"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = void 0;
const mongoose_1 = require("mongoose");
const roleSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Permission' }],
    createdAt: { type: Date, default: Date.now }
});
exports.Role = (0, mongoose_1.model)('Role', roleSchema);
exports.default = exports.Role;
//# sourceMappingURL=Role.js.map