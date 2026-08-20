"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubordinateAttendance = exports.getMyAttendance = exports.checkOut = exports.checkIn = void 0;
const zod_1 = require("zod");
const Attendance_1 = __importDefault(require("../models/Attendance"));
const Agent_1 = __importDefault(require("../models/Agent"));
const checkInSchema = zod_1.z.object({
    comments: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional()
});
const checkOutSchema = zod_1.z.object({
    comments: zod_1.z.string().optional(),
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional()
});
// Helper to format duration in hours/minutes
const calculateDuration = (start, end) => {
    const diffMs = end.getTime() - start.getTime();
    const totalMins = Math.floor(diffMs / (1000 * 60));
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
};
// POST /api/attendance/check-in
const checkIn = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = checkInSchema.parse(req.body);
        const today = new Date().toISOString().slice(0, 10);
        // Check if active attendance already exists for today
        const existing = await Attendance_1.default.findOne({ agent: agentId, date: today });
        if (existing && !existing.checkOut) {
            return res.status(400).json({ message: 'Already checked in for today', attendance: existing });
        }
        const checkInTime = new Date();
        const newRecord = new Attendance_1.default({
            agent: agentId,
            date: today,
            checkIn: checkInTime,
            status: 'present',
            comments: data.comments,
            checkInLocation: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : undefined
        });
        await newRecord.save();
        await newRecord.populate('agent', 'name email role territory');
        return res.status(201).json({ message: 'Attendance check-in successful', attendance: newRecord });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Attendance check-in error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.checkIn = checkIn;
// POST /api/attendance/check-out
const checkOut = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = checkOutSchema.parse(req.body);
        const today = new Date().toISOString().slice(0, 10);
        const record = await Attendance_1.default.findOne({ agent: agentId, date: today, checkOut: { $exists: false } });
        if (!record) {
            return res.status(404).json({ message: 'Active check-in record not found for today' });
        }
        const checkOutTime = new Date();
        record.checkOut = checkOutTime;
        record.duration = calculateDuration(record.checkIn, checkOutTime);
        if (data.comments) {
            record.comments = record.comments ? `${record.comments} | Out: ${data.comments}` : data.comments;
        }
        if (data.latitude && data.longitude) {
            record.checkOutLocation = { latitude: data.latitude, longitude: data.longitude };
        }
        await record.save();
        await record.populate('agent', 'name email role territory');
        return res.status(200).json({ message: 'Attendance check-out successful', attendance: record });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Attendance check-out error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.checkOut = checkOut;
// GET /api/attendance/mine
const getMyAttendance = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '30' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const total = await Attendance_1.default.countDocuments({ agent: agentId });
        const records = await Attendance_1.default.find({ agent: agentId })
            .sort({ date: -1, createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        return res.status(200).json({
            records,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get my attendance error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMyAttendance = getMyAttendance;
// GET /api/attendance/subordinates — for managers (state/division/district)
const getSubordinateAttendance = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const userRole = req.agent?.role;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { roleFilter, searchQuery, date } = req.query;
        const dateFilter = date || new Date().toISOString().slice(0, 10);
        // Find subordinates based on role hierarchy
        let subordinateQuery = {};
        if (userRole === 'state') {
            subordinateQuery.role = { $in: ['district', 'division', 'pincode'] };
        }
        else if (userRole === 'district') {
            subordinateQuery.role = { $in: ['division', 'pincode'] };
        }
        else if (userRole === 'division') {
            subordinateQuery.role = 'pincode';
        }
        else {
            // Pincode agents don't have subordinates
            return res.status(200).json({ records: [] });
        }
        if (roleFilter && roleFilter !== 'all') {
            subordinateQuery.role = roleFilter;
        }
        const subordinates = await Agent_1.default.find(subordinateQuery).select('_id name role territory email');
        const subordinateIds = subordinates.map(s => s._id);
        const attendanceRecords = await Attendance_1.default.find({
            agent: { $in: subordinateIds },
            date: dateFilter
        }).populate('agent', 'name role territory email');
        let filteredRecords = attendanceRecords;
        if (searchQuery) {
            const queryLower = searchQuery.toLowerCase();
            filteredRecords = attendanceRecords.filter((rec) => {
                const agentName = rec.agent?.name?.toLowerCase() || '';
                const territory = rec.agent?.territory?.name?.toLowerCase() || '';
                return agentName.includes(queryLower) || territory.includes(queryLower);
            });
        }
        return res.status(200).json({ records: filteredRecords });
    }
    catch (error) {
        console.error('Get subordinate attendance error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSubordinateAttendance = getSubordinateAttendance;
//# sourceMappingURL=attendance.controller.js.map