"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Permission = void 0;
const mongoose_1 = require("mongoose");
const permissionSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});
exports.Permission = (0, mongoose_1.model)('Permission', permissionSchema);
exports.default = exports.Permission;
//# sourceMappingURL=Permission.js.map