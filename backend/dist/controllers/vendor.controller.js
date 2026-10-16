"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateVendorStatus = exports.updateVendor = exports.createVendor = exports.getVendorById = exports.getVendors = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const Agent_1 = __importDefault(require("../models/Agent"));
const territoryScope_1 = require("../utils/territoryScope");
const cache_service_1 = require("../services/cache.service");
const territoryValidation_1 = require("../utils/territoryValidation");
const eventBus_1 = require("../realtime/eventBus");
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
    name: zod_1.z.string().optional(),
    ownerName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    storeType: zod_1.z.string().optional(),
    gst: zod_1.z.string().optional(),
    businessGst: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    division: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    kycStatus: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    fullAddress: zod_1.z.string().optional(),
    location: zod_1.z.object({
        address: zod_1.z.string().optional(),
        latitude: zod_1.z.number().optional(),
        longitude: zod_1.z.number().optional()
    }).optional()
}).passthrough();
// GET /api/vendors — paginated list with optional filters and date range
const getVendors = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        let divisionPincodes = [];
        if (scope?.role === 'division' && scope.division) {
            divisionPincodes = await (0, territoryScope_1.getDivisionPincodes)(scope.division);
        }
        const scopeFilter = (0, territoryScope_1.buildVendorScopeFilter)(scope, divisionPincodes);
        const { page = '1', limit = '50', status, category, search, startDate, endDate, dateFilter } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filterConditions = [
            scopeFilter,
            {
                $or: [
                    { businessName: { $exists: true, $nin: ['', null] } },
                    { name: { $exists: true, $nin: ['', null] } }
                ]
            }
        ];
        if (status && status !== 'all') {
            filterConditions.push({ status: { $regex: new RegExp(`^${status}$`, 'i') } });
        }
        if (category && category !== 'all') {
            filterConditions.push({
                $or: [
                    { category: { $regex: new RegExp(`^${category}$`, 'i') } },
                    { storeType: { $regex: new RegExp(`^${category}$`, 'i') } }
                ]
            });
        }
        if (search) {
            const s = String(search).trim();
            filterConditions.push({
                $or: [
                    { businessName: { $regex: s, $options: 'i' } },
                    { ownerName: { $regex: s, $options: 'i' } },
                    { phone: { $regex: s, $options: 'i' } },
                    { registrationId: { $regex: s, $options: 'i' } },
                    { gst: { $regex: s, $options: 'i' } },
                    { 'location.address': { $regex: s, $options: 'i' } }
                ]
            });
        }
        // Date Range Period filtering on createdAt
        const dateConditions = {};
        if (startDate) {
            const s = new Date(startDate);
            if (!isNaN(s.getTime()))
                dateConditions.$gte = s;
        }
        if (endDate) {
            const e = new Date(endDate);
            if (!isNaN(e.getTime()))
                dateConditions.$lte = e;
        }
        if (!startDate && !endDate && dateFilter && dateFilter !== 'all') {
            const now = new Date();
            if (dateFilter === 'today') {
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
                dateConditions.$gte = startOfToday;
                dateConditions.$lte = endOfToday;
            }
            else if (dateFilter === 'yesterday') {
                const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
                const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
                dateConditions.$gte = startOfYesterday;
                dateConditions.$lte = endOfYesterday;
            }
            else if (dateFilter === '7days') {
                dateConditions.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }
            else if (dateFilter === '30days') {
                dateConditions.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }
            else if (dateFilter === 'this_month') {
                // First day of current calendar month at 00:00:00 through last day of current calendar month at 23:59:59.999
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                dateConditions.$gte = startOfMonth;
                dateConditions.$lte = endOfMonth;
            }
            else if (dateFilter === 'last_month') {
                const startOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
                const endOfLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                dateConditions.$gte = startOfLast;
                dateConditions.$lte = endOfLast;
            }
            else if (dateFilter === 'this_year') {
                const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                dateConditions.$gte = startOfYear;
                dateConditions.$lte = endOfYear;
            }
        }
        if (Object.keys(dateConditions).length > 0) {
            filterConditions.push({ createdAt: dateConditions });
        }
        const finalFilter = filterConditions.length === 1 ? filterConditions[0] : { $and: filterConditions };
        const rawVendors = await Vendor_1.default.find(finalFilter)
            .select('businessName name ownerName phone email category storeType gst state district division pincode kycStatus location status documents assignedAgent joiningType createdVia registrationSource agentId onboardedBy agentName agentRegistrationId registrationId role createdAt updatedAt')
            .populate('assignedAgent', 'name email role')
            .sort({ createdAt: -1 })
            .lean();
        // Enrich assignedAgent name if populate did not resolve an agent document
        for (const v of rawVendors) {
            if (!v.assignedAgent || typeof v.assignedAgent !== 'object' || !v.assignedAgent.name) {
                if (v.agentName && typeof v.agentName === 'string' && v.agentName.trim()) {
                    v.assignedAgent = { name: v.agentName.trim(), role: 'field' };
                }
                else if (v.onboardedBy && typeof v.onboardedBy === 'string' && !v.onboardedBy.match(/^[0-9a-fA-F]{24}$/)) {
                    v.assignedAgent = { name: v.onboardedBy.trim(), role: 'field' };
                }
            }
        }
        // Deduplicate vendor records that represent the exact same vendor registration,
        // ensuring the application returns the canonical record.
        const canonicalMap = new Map();
        for (const v of rawVendors) {
            const gst = v.gst ? v.gst.trim().toUpperCase() : '';
            const phone = v.phone ? v.phone.replace(/\D/g, '') : '';
            const pin = v.pincode ? v.pincode.trim() : '';
            const name = (v.businessName || v.name || '').trim().toLowerCase();
            // Canonical key for a single business establishment registration:
            // Preserves separate valid registrations for different branches/locations
            const canonicalKey = (phone && pin && name)
                ? `VENDOR_${phone}_${pin}_${name}`
                : (v.registrationId ? `REG_${v.registrationId}` : `ID_${v._id}`);
            if (!canonicalMap.has(canonicalKey)) {
                canonicalMap.set(canonicalKey, v);
            }
            else {
                // If duplicate records exist in the DB, prefer active / approved status or earlier registration
                const existing = canonicalMap.get(canonicalKey);
                const isExistingApproved = (existing.status || '').toLowerCase() === 'active' || existing.kycStatus === 'approved';
                const isCurrentApproved = (v.status || '').toLowerCase() === 'active' || v.kycStatus === 'approved';
                if (!isExistingApproved && isCurrentApproved) {
                    canonicalMap.set(canonicalKey, v);
                }
            }
        }
        const deduplicated = Array.from(canonicalMap.values()).map((v) => {
            const realName = (v.businessName || v.name || '').trim();
            const rawKyc = (v.kycStatus || '').toString().toLowerCase().trim();
            let normalizedKyc = 'pending';
            if (rawKyc === 'approved' || rawKyc === 'verified')
                normalizedKyc = 'approved';
            else if (rawKyc === 'rejected')
                normalizedKyc = 'rejected';
            else if (String(v.status || '').toLowerCase() === 'approved' || String(v.status || '').toLowerCase() === 'active')
                normalizedKyc = 'approved';
            return {
                ...v,
                name: realName,
                businessName: realName,
                kycStatus: normalizedKyc
            };
        });
        const total = deduplicated.length;
        const paginatedVendors = deduplicated.slice((pageNum - 1) * limitNum, pageNum * limitNum);
        return res.status(200).json({
            vendors: paginatedVendors,
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
        const rawId = req.params.id;
        const isObjectId = mongoose_1.default.Types.ObjectId.isValid(rawId);
        const query = isObjectId
            ? { $or: [{ _id: rawId }, { registrationId: rawId }] }
            : { registrationId: rawId };
        const vendor = await Vendor_1.default.findOne(query)
            .populate('assignedAgent', 'name email role phone')
            .populate('documents')
            .lean();
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
        if (data.email) {
            data.email = data.email.toLowerCase().trim();
        }
        // 1. Strict field format validation
        const fieldValidation = (0, territoryValidation_1.validateVendorFieldFormats)({
            phone: data.phone,
            email: data.email,
            panNumber: data.panNumber || data.pan,
            aadhaarNumber: data.aadhaarNumber || data.aadhaar,
            pincode: data.pincode,
            accountNumber: data.accountNumber || data.bankDetails?.accountNumber || req.body.accountNumber || req.body.bankDetails?.accountNumber
        });
        if (!fieldValidation.valid) {
            return res.status(400).json({ message: fieldValidation.error });
        }
        // 2. Fetch Logged-in Agent's Approved Territory Scope
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        if (!scope) {
            return res.status(403).json({ message: 'Agent territory profile could not be determined.' });
        }
        // 3. Security Check: Verify Requested Territory Belongs to Agent's Allowed Jurisdiction
        const jurisdiction = await (0, territoryValidation_1.validateAgentJurisdiction)(scope, {
            state: data.state,
            district: data.district,
            division: data.division,
            pincode: data.pincode
        });
        if (!jurisdiction.valid) {
            return res.status(403).json({ message: jurisdiction.error });
        }
        // 4. Geographic Consistency Check against Admin Pincode Management DB
        const geoConsistency = await (0, territoryValidation_1.validateGeographicConsistency)({
            state: data.state,
            district: data.district,
            division: data.division,
            pincode: data.pincode
        });
        if (!geoConsistency.consistent) {
            return res.status(400).json({ message: geoConsistency.error });
        }
        // 5. Prevent duplicate vendor registration insertion
        const normPhone = (data.phone || '').replace(/\D/g, '');
        const normPin = (data.pincode || '').trim();
        const normName = (data.businessName || data.name || '').trim();
        const normGst = (data.gst || '').trim().toUpperCase();
        let existingVendor = null;
        if (normGst && normPin) {
            existingVendor = await Vendor_1.default.findOne({ gst: normGst, pincode: normPin }).populate('assignedAgent', 'name email role');
        }
        if (!existingVendor && normPhone && normPin && normName) {
            existingVendor = await Vendor_1.default.findOne({
                phone: normPhone,
                pincode: normPin,
                businessName: { $regex: new RegExp(`^${normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
            }).populate('assignedAgent', 'name email role');
        }
        if (existingVendor) {
            return res.status(200).json({
                message: 'Vendor already registered with this jurisdiction details',
                vendor: existingVendor,
                isExisting: true
            });
        }
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randDigits = Math.floor(1000 + Math.random() * 9000);
        const generatedRegId = `REG-${dateStr}-${randDigits}`;
        // Fetch onboarding agent details
        let agentDoc = null;
        try {
            agentDoc = await Agent_1.default.findById(agentId);
        }
        catch (e) {
            // non-blocking
        }
        const rawRole = agentDoc?.role || req.agent?.role || 'pincode';
        const roleLower = String(rawRole).toLowerCase();
        const formattedAgentRole = roleLower.includes('state') ? 'State Agent'
            : roleLower.includes('dist') ? 'District Agent'
                : roleLower.includes('divis') ? 'Divisional Agent'
                    : 'Pincode Agent';
        const onboardingAgent = {
            id: agentDoc?.registrationId || String(agentId),
            name: agentDoc?.name || req.agent?.name || 'Field Agent',
            phone: agentDoc?.phone || agentDoc?.mobile || '',
            mobile: agentDoc?.phone || agentDoc?.mobile || '',
            role: formattedAgentRole,
            tier: formattedAgentRole,
            submittedAt: new Date().toISOString()
        };
        // Dynamically resolve responsible admin using the vendor's actual business PIN code
        const db = mongoose_1.default.connection.db;
        let responsibleAdmin = null;
        let initialApprovalStatus = 'PENDING_PINCODE_APPROVAL';
        if (db && data.pincode) {
            const pin = String(data.pincode).trim();
            const div = String(data.division || '').trim();
            const dist = String(data.district || '').trim();
            const st = String(data.state || '').trim();
            // 1. Pincode Admin specifically assigned to this PIN code
            const pinAdmin = await db.collection('users').findOne({
                $and: [
                    {
                        $or: [
                            { role: { $regex: '^pincode admin', $options: 'i' } },
                            { adminRole: 'pincode-admin' },
                            { role: { $regex: 'pincode.*admin', $options: 'i' } }
                        ]
                    },
                    {
                        $or: [
                            { pincode: pin },
                            { assignedPincode: pin }
                        ]
                    }
                ],
                status: { $in: ['approved', 'active'] }
            });
            if (pinAdmin) {
                responsibleAdmin = {
                    id: String(pinAdmin._id || pinAdmin.id),
                    adminId: String(pinAdmin._id || pinAdmin.id),
                    name: pinAdmin.name,
                    phone: pinAdmin.mobile || pinAdmin.phone || '',
                    mobile: pinAdmin.mobile || pinAdmin.phone || '',
                    email: pinAdmin.email || '',
                    role: 'Pincode Admin',
                    adminRole: 'pincode-admin',
                    state: pinAdmin.state || st,
                    district: pinAdmin.district || dist,
                    division: pinAdmin.division || div,
                    pincode: pin
                };
            }
            else if (div) {
                // 2. Division Admin
                const divAdmin = await db.collection('users').findOne({
                    $or: [
                        { role: { $regex: 'division.*admin', $options: 'i' } },
                        { adminRole: { $regex: 'division', $options: 'i' } }
                    ],
                    district: { $regex: `^${dist}`, $options: 'i' },
                    division: { $regex: `^${div}`, $options: 'i' },
                    status: { $in: ['approved', 'active'] }
                });
                if (divAdmin) {
                    responsibleAdmin = {
                        id: String(divAdmin._id || divAdmin.id),
                        adminId: String(divAdmin._id || divAdmin.id),
                        name: divAdmin.name,
                        phone: divAdmin.mobile || divAdmin.phone || '',
                        role: 'Divisional Admin',
                        adminRole: 'divisional-admin',
                        state: divAdmin.state || st,
                        district: divAdmin.district || dist,
                        division: div,
                        pincode: pin
                    };
                    initialApprovalStatus = 'PENDING_ADMIN_ASSIGNMENT';
                }
            }
            else if (dist) {
                // 3. District Admin
                const distAdmin = await db.collection('users').findOne({
                    $or: [
                        { role: { $regex: 'district.*admin', $options: 'i' } },
                        { adminRole: { $regex: 'district', $options: 'i' } }
                    ],
                    district: { $regex: `^${dist}`, $options: 'i' },
                    status: { $in: ['approved', 'active'] }
                });
                if (distAdmin) {
                    responsibleAdmin = {
                        id: String(distAdmin._id || distAdmin.id),
                        adminId: String(distAdmin._id || distAdmin.id),
                        name: distAdmin.name,
                        phone: distAdmin.mobile || distAdmin.phone || '',
                        role: 'District Admin',
                        adminRole: 'district-admin',
                        state: distAdmin.state || st,
                        district: distAdmin.district || dist,
                        division: div,
                        pincode: pin
                    };
                    initialApprovalStatus = 'PENDING_ADMIN_ASSIGNMENT';
                }
            }
        }
        if (!responsibleAdmin) {
            initialApprovalStatus = 'PENDING_ADMIN_ASSIGNMENT';
        }
        const vendor = new Vendor_1.default({
            onboardingAgent,
            onboardingAgentName: onboardingAgent.name,
            onboardingAgentPhone: onboardingAgent.phone,
            onboardingAgentRole: onboardingAgent.role,
            onboardingAgentId: onboardingAgent.id,
            responsibleAdmin,
            responsibleAdminId: responsibleAdmin?.id || null,
            responsibleAdminName: responsibleAdmin?.name || null,
            responsibleAdminRole: responsibleAdmin?.role || null,
            responsibleAdminPhone: responsibleAdmin?.phone || null,
            responsibleAdminPincode: responsibleAdmin?.pincode || data.pincode,
            approvalStatus: initialApprovalStatus,
            submittedAt: new Date(),
            ...data,
            businessName: data.businessName || data.name || 'Merchant Store',
            ownerName: data.ownerName || data.contactPerson || 'Merchant Owner',
            location: {
                address: data.location?.address || `${data.buildingNo ? `${data.buildingNo}, ` : ''}${data.streetName ? `${data.streetName}, ` : ''}${data.postOffice ? `${data.postOffice}, ` : ''}${data.taluk ? `${data.taluk}, ` : ''}${data.district || ''}, ${data.state || ''} - ${data.pincode || ''}`,
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
            const salt = await bcryptjs_1.default.genSalt(10);
            const defaultHashedPassword = await bcryptjs_1.default.hash('Vendor@12345', salt);
            if (db) {
                await db.collection('users').updateOne({ email: vendorEmail }, {
                    $set: {
                        name: data.businessName || data.name || data.ownerName || 'Merchant Vendor',
                        businessName: data.businessName || data.name || data.ownerName || 'Merchant Store',
                        contactPerson: data.ownerName || data.contactPerson || data.name || 'Owner',
                        email: vendorEmail,
                        phone: data.phone || undefined,
                        password: defaultHashedPassword,
                        role: 'Vendor',
                        vendorType: data.category || data.storeType || 'Services',
                        category: data.category || data.storeType || 'Services',
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
                        onboardingAgent,
                        responsibleAdmin,
                        approvalStatus: initialApprovalStatus,
                        submittedAt: new Date(),
                        address: data.location?.address || `${data.district || ''}, ${data.state || ''} ${data.pincode || ''}`,
                        registrationId: vendor.registrationId || `REG-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
                        createdAt: new Date()
                    }
                }, { upsert: true }).catch(() => { });
            }
        }
        catch (syncErr) {
            console.error('Error syncing vendor to admin users collection:', syncErr);
        }
        // Invalidate dashboard and hierarchy caches on new vendor onboarding
        await Promise.all([
            cache_service_1.cacheService.delByPrefix('dashboard:'),
            cache_service_1.cacheService.delByPrefix('hierarchy:')
        ]);
        // Link Field Shop Visit if fieldVisitId was provided
        const fvId = req.body?.fieldVisitId || data?.fieldVisitId;
        if (fvId && mongoose_1.default.Types.ObjectId.isValid(fvId)) {
            try {
                const FieldVisit = mongoose_1.default.model('FieldVisit');
                await FieldVisit.findByIdAndUpdate(fvId, {
                    $set: {
                        vendorId: vendor._id,
                        vendor: vendor._id,
                        onboardingStatus: 'COMPLETED'
                    }
                });
            }
            catch (fvErr) {
                console.warn('Could not link field visit to newly created vendor:', fvErr);
            }
        }
        // Publish Realtime Entity Event
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_CREATED',
            entity: 'vendor',
            entityId: vendor._id.toString(),
            action: 'created',
            scope: {
                state: vendor.state,
                district: vendor.district,
                division: vendor.division,
                pincode: vendor.pincode
            },
            data: {
                _id: vendor._id,
                registrationId: vendor.registrationId,
                businessName: vendor.businessName,
                status: vendor.status,
                kycStatus: vendor.kycStatus
            }
        }).catch(() => { });
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
        const rawId = req.params.id;
        const isObjectId = mongoose_1.default.Types.ObjectId.isValid(rawId);
        const query = isObjectId
            ? { $or: [{ _id: rawId }, { registrationId: rawId }] }
            : { registrationId: rawId };
        const existingVendor = await Vendor_1.default.findOne(query);
        if (!existingVendor)
            return res.status(404).json({ message: 'Vendor not found' });
        const currentKyc = (existingVendor.kycStatus || '').toLowerCase().trim();
        if (currentKyc === 'approved' || currentKyc === 'verified') {
            return res.status(403).json({
                message: 'Modifications locked: Cannot edit vendor details once KYC status is Approved.'
            });
        }
        const rawBankAcc = data.accountNumber || data.bankDetails?.accountNumber || req.body.accountNumber || req.body.bankDetails?.accountNumber;
        if (rawBankAcc) {
            const cleanAcc = String(rawBankAcc).trim();
            if (!/^\d{8,20}$/.test(cleanAcc)) {
                return res.status(400).json({ message: 'Account number must contain 8–20 digits.' });
            }
        }
        const updateFields = { ...data, updatedAt: new Date() };
        // Prevent privilege escalation or unauthorized status bypass via updateVendor
        delete updateFields.status;
        delete updateFields.kycStatus;
        delete updateFields.role;
        if (data.businessName && !data.name) {
            updateFields.name = data.businessName;
        }
        if (data.name && !data.businessName) {
            updateFields.businessName = data.name;
        }
        if (data.fullAddress) {
            updateFields.location = {
                ...(updateFields.location || {}),
                address: data.fullAddress
            };
        }
        const vendor = await Vendor_1.default.findOneAndUpdate(query, { $set: updateFields }, { new: true, runValidators: true }).populate('category', 'name').populate('assignedAgent', 'name email role phone');
        if (!vendor)
            return res.status(404).json({ message: 'Vendor not found' });
        // Invalidate dashboard and hierarchy caches
        await Promise.all([
            cache_service_1.cacheService.delByPrefix('dashboard:'),
            cache_service_1.cacheService.delByPrefix('hierarchy:')
        ]);
        // Publish Realtime Entity Event
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_UPDATED',
            entity: 'vendor',
            entityId: vendor._id.toString(),
            action: 'updated',
            scope: {
                state: vendor.state,
                district: vendor.district,
                division: vendor.division,
                pincode: vendor.pincode
            },
            data: {
                _id: vendor._id,
                registrationId: vendor.registrationId,
                businessName: vendor.businessName,
                status: vendor.status,
                kycStatus: vendor.kycStatus
            }
        }).catch(() => { });
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
        const rawId = req.params.id;
        const isObjectId = mongoose_1.default.Types.ObjectId.isValid(rawId);
        const query = isObjectId
            ? { $or: [{ _id: rawId }, { registrationId: rawId }] }
            : { registrationId: rawId };
        const vendor = await Vendor_1.default.findOneAndUpdate(query, { $set: { status, updatedAt: new Date() } }, { new: true }).populate('category', 'name');
        if (!vendor)
            return res.status(404).json({ message: 'Vendor not found' });
        // Invalidate dashboard and hierarchy caches
        await Promise.all([
            cache_service_1.cacheService.delByPrefix('dashboard:'),
            cache_service_1.cacheService.delByPrefix('hierarchy:')
        ]);
        // Publish Realtime Entity Event
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_STATUS_CHANGED',
            entity: 'vendor',
            entityId: vendor._id.toString(),
            action: 'status_changed',
            scope: {
                state: vendor.state,
                district: vendor.district,
                division: vendor.division,
                pincode: vendor.pincode
            },
            data: {
                _id: vendor._id,
                registrationId: vendor.registrationId,
                status: vendor.status
            }
        }).catch(() => { });
        return res.status(200).json({ message: 'Vendor status updated', vendor });
    }
    catch (error) {
        console.error('Update vendor status error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateVendorStatus = updateVendorStatus;
//# sourceMappingURL=vendor.controller.js.map