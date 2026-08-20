"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Attendance = void 0;
const mongoose_1 = require("mongoose");
const attendanceSchema = new mongoose_1.Schema({
    agent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Agent', required: true },
    date: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    duration: { type: String },
    status: {
        type: String,
        enum: ['present', 'absent', 'half_day', 'late'],
        default: 'present'
    },
    comments: { type: String },
    checkInLocation: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    checkOutLocation: {
        latitude: { type: Number },
        longitude: { type: Number }
    }
}, {
    timestamps: true
});
attendanceSchema.index({ agent: 1, date: -1 });
attendanceSchema.index({ date: -1, status: 1 });
exports.Attendance = (0, mongoose_1.model)('Attendance', attendanceSchema);
exports.default = exports.Attendance;
//# sourceMappingURL=Attendance.js.map