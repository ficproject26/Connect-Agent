"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFieldVisits = exports.completeFieldVisit = exports.startFieldVisit = void 0;
const zod_1 = require("zod");
const FieldVisit_1 = __importDefault(require("../models/FieldVisit"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const startVisitSchema = zod_1.z.object({
    vendorId: zod_1.z.string().min(1, 'Vendor ID is required'),
    latitude: zod_1.z.number({ required_error: 'Latitude required' }),
    longitude: zod_1.z.number({ required_error: 'Longitude required' }),
    photoBeforeVisit: zod_1.z.string().optional()
});
const completeVisitSchema = zod_1.z.object({
    latitude: zod_1.z.number().optional(),
    longitude: zod_1.z.number().optional(),
    photoAfterVisit: zod_1.z.string().optional(),
    remarks: zod_1.z.string().optional()
});
// POST /api/field-visits/start — check-in at a vendor store location
const startFieldVisit = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = startVisitSchema.parse(req.body);
        const vendor = await Vendor_1.default.findById(data.vendorId);
        if (!vendor)
            return res.status(404).json({ message: 'Vendor not found' });
        const visit = new FieldVisit_1.default({
            agent: agentId,
            vendor: data.vendorId,
            checkInLocation: {
                latitude: data.latitude,
                longitude: data.longitude
            },
            photoBeforeVisit: data.photoBeforeVisit,
            status: 'started',
            visitDate: new Date()
        });
        await visit.save();
        await visit.populate([
            { path: 'agent', select: 'name email role phone' },
            { path: 'vendor', select: 'storeName contactPerson phone address' }
        ]);
        return res.status(201).json({ message: 'Field visit started', visit });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Start field visit error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.startFieldVisit = startFieldVisit;
// POST /api/field-visits/:id/complete — complete active field visit
const completeFieldVisit = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id } = req.params;
        const data = completeVisitSchema.parse(req.body);
        const visit = await FieldVisit_1.default.findOne({ _id: id, agent: agentId, status: 'started' });
        if (!visit)
            return res.status(404).json({ message: 'Active field visit record not found' });
        visit.status = 'completed';
        if (data.remarks)
            visit.remarks = data.remarks;
        if (data.photoAfterVisit)
            visit.photoAfterVisit = data.photoAfterVisit;
        if (data.latitude && data.longitude) {
            visit.checkOutLocation = { latitude: data.latitude, longitude: data.longitude };
        }
        await visit.save();
        await visit.populate([
            { path: 'agent', select: 'name email role' },
            { path: 'vendor', select: 'storeName contactPerson phone' }
        ]);
        return res.status(200).json({ message: 'Field visit completed successfully', visit });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Complete field visit error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.completeFieldVisit = completeFieldVisit;
// GET /api/field-visits — get list of field visits
const getFieldVisits = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const agentRole = req.agent?.role;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '20', status, vendorId } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = {};
        if (agentRole === 'pincode' || agentRole === 'delivery_partner' || agentRole === 'technician') {
            filter.agent = agentId;
        }
        if (status)
            filter.status = status;
        if (vendorId)
            filter.vendor = vendorId;
        const total = await FieldVisit_1.default.countDocuments(filter);
        const visits = await FieldVisit_1.default.find(filter)
            .populate('agent', 'name email role phone territory')
            .populate('vendor', 'storeName contactPerson phone pincode address district division state')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        return res.status(200).json({
            visits,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get field visits error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getFieldVisits = getFieldVisits;
//# sourceMappingURL=fieldVisit.controller.js.map