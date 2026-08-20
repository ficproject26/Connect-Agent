"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewReport = exports.createReport = exports.getReportById = exports.getReports = void 0;
const zod_1 = require("zod");
const Report_1 = __importDefault(require("../models/Report"));
const createReportSchema = zod_1.z.object({
    type: zod_1.z.enum(['daily', 'weekly', 'monthly', 'vendor', 'performance', 'visit']),
    content: zod_1.z.record(zod_1.z.unknown()),
    remarks: zod_1.z.string().optional()
});
const reviewReportSchema = zod_1.z.object({
    remarks: zod_1.z.string().min(1, 'Review remarks required')
});
// GET /api/reports
const getReports = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '20', type } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = { agent: agentId };
        if (type)
            filter.type = type;
        const total = await Report_1.default.countDocuments(filter);
        const reports = await Report_1.default.find(filter)
            .populate('agent', 'name email role')
            .populate('reviewedBy', 'name email role')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        return res.status(200).json({
            reports,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get reports error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getReports = getReports;
// GET /api/reports/:id
const getReportById = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const report = await Report_1.default.findOne({ _id: req.params.id, agent: agentId })
            .populate('agent', 'name email role')
            .populate('reviewedBy', 'name email role');
        if (!report)
            return res.status(404).json({ message: 'Report not found or access denied' });
        return res.status(200).json({ report });
    }
    catch (error) {
        console.error('Get report by id error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getReportById = getReportById;
// POST /api/reports
const createReport = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = createReportSchema.parse(req.body);
        const report = new Report_1.default({ ...data, agent: agentId });
        await report.save();
        await report.populate('agent', 'name email role');
        return res.status(201).json({ message: 'Report submitted successfully', report });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Create report error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createReport = createReport;
// PATCH /api/reports/:id/review — senior agent reviews a report
const reviewReport = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { remarks } = reviewReportSchema.parse(req.body);
        const report = await Report_1.default.findByIdAndUpdate(req.params.id, { remarks, reviewedBy: agentId, reviewedAt: new Date() }, { new: true })
            .populate('agent', 'name email role')
            .populate('reviewedBy', 'name email role');
        if (!report)
            return res.status(404).json({ message: 'Report not found' });
        return res.status(200).json({ message: 'Report reviewed', report });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Review report error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.reviewReport = reviewReport;
//# sourceMappingURL=report.controller.js.map