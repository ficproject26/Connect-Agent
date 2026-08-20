"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVendorStatus = exports.updateVendor = exports.createVendor = exports.getVendorById = exports.getVendors = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const Vendor_1 = __importDefault(require("../models/Vendor"));
const territoryScope_1 = require("../utils/territoryScope");
const createVendorSchema = zod_1.z.object({
    businessName: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    ownerName: zod_1.z.string().optional(),
    contactPerson: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    storeType: zod_1.z.string().optional(),
    gst: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    division: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    kycStatus: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    location: zod_1.z.object({
        address: zod_1.z.string().optional(),
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional()
    }).optional()
}).passthrough();
const updateVendorSchema = zod_1.z.object({
    businessName: zod_1.z.string().optional(),
    ownerName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    gst: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    division: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    kycStatus: zod_1.z.string().optional(),
    location: zod_1.z.object({
        address: zod_1.z.string().optional(),
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional()
    }).optional()
});
// GET /api/vendors — paginated list with optional filters
const getVendors = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        const scopeFilter = (0, territoryScope_1.buildVendorScopeFilter)(scope);
        const { page = '1', limit = '50', status, category, search } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = { ...scopeFilter };
        if (status)
            filter.status = status;
        if (category)
            filter.category = category;
        if (search) {
            filter.$and = [
                scopeFilter,
                {
                    $or: [
                        { businessName: { $regex: search, $options: 'i' } },
                        { ownerName: { $regex: search, $options: 'i' } },
                        { 'location.address': { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }
        const total = await Vendor_1.default.countDocuments(filter);
        const vendors = await Vendor_1.default.find(filter)
            .populate('assignedAgent', 'name email role')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        return res.status(200).json({
            vendors,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get vendors error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getVendors = getVendors;
// GET /api/vendors/:id
const getVendorById = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const vendor = await Vendor_1.default.findById(req.params.id)
            .populate('assignedAgent', 'name email role phone')
            .populate('documents');
        if (!vendor)
            return res.status(404).json({ message: 'Vendor not found' });
        return res.status(200).json({ vendor });
    }
    catch (error) {
        console.error('Get vendor by id error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getVendorById = getVendorById;
// POST /api/vendors
const createVendor = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = createVendorSchema.parse(req.body);
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randDigits = Math.floor(1000 + Math.random() * 9000);
        const generatedRegId = `REG-${dateStr}-${randDigits}`;
        const vendor = new Vendor_1.default({
            ...data,
            businessName: data.businessName || data.name || 'Merchant Store',
            ownerName: data.ownerName || data.contactPerson || 'Merchant Owner',
            location: {
                address: data.location?.address || `${data.district || ''}, ${data.state || ''} ${data.pincode || ''}`,
                latitude: data.location?.latitude || 0,
                longitude: data.location?.longitude || 0
            },
            assignedAgent: agentId,
            agentId: agentId,
            onboardedBy: agentId,
            joiningType: 'agent',
            createdVia: 'agent',
            registrationSource: 'agent',
            registrationId: generatedRegId,
            role: 'Vendor',
            status: 'pending',
            kycStatus: 'pending'
        });
        await vendor.save();
        // Also sync vendor to users collection for Admin Portal join requests
        try {
            const db = mongoose_1.default.connection.db;
            const vendorEmail = data.email ? data.email.toLowerCase() : `vendor_${Date.now()}@connect.app`;
            if (db) {
                await db.collection('users').updateOne({ email: vendorEmail }, {
                    $set: {
                        name: data.businessName || data.name || data.ownerName || 'Merchant Vendor',
                        businessName: data.businessName || data.name || data.ownerName || 'Merchant Store',
                        contactPerson: data.ownerName || data.contactPerson || data.name || 'Owner',
                        email: vendorEmail,
                        phone: data.phone || '9876543210',
                        role: 'Vendor',
                        vendorType: data.category || data.storeType || 'Supermarket & Retail',
                        category: data.category || data.storeType || 'Supermarket & Retail',
                        status: 'pending',
                        kycStatus: 'pending',
                        joiningType: 'agent',
                        createdVia: 'agent',
                        registrationSource: 'agent',
                        assignedAgent: agentId,
                        agentId: agentId,
                        onboardedBy: agentId,
                        assignedState: data.state || '',
                        assignedDistrict: data.district || '',
                        assignedDivision: data.division || '',
                        pincode: data.pincode || '',
                        address: data.location?.address || `${data.district || ''}, ${data.state || ''} ${data.pincode || ''}`,
                        registrationId: vendor.registrationId || `REG-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
                        createdAt: new Date()
                    }
                }, { upsert: true });
            }
        }
        catch (syncErr) {
            console.error('Error syncing vendor to admin users collection:', syncErr);
        }
        return res.status(201).json({ message: 'Vendor created successfully', vendor });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Create vendor error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createVendor = createVendor;
// PATCH /api/vendors/:id
const updateVendor = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = updateVendorSchema.parse(req.body);
        const vendor = await Vendor_1.default.findByIdAndUpdate(req.params.id, { ...data, updatedAt: new Date() }, { new: true, runValidators: true }).populate('category', 'name');
        if (!vendor)
            return res.status(404).json({ message: 'Vendor not found' });
        return res.status(200).json({ message: 'Vendor updated', vendor });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Update vendor error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateVendor = updateVendor;
// PATCH /api/vendors/:id/status
const updateVendorStatus = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { status } = req.body;
        const validStatuses = ['pending', 'verified', 'active', 'inactive'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
        }
        const vendor = await Vendor_1.default.findByIdAndUpdate(req.params.id, { status, updatedAt: new Date() }, { new: true }).populate('category', 'name');
        if (!vendor)
            return res.status(404).json({ message: 'Vendor not found' });
        return res.status(200).json({ message: 'Vendor status updated', vendor });
    }
    catch (error) {
        console.error('Update vendor status error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateVendorStatus = updateVendorStatus;
//# sourceMappingURL=vendor.controller.js.map