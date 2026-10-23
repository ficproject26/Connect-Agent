"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssignmentStatus = exports.getMyAssignments = exports.assignTarget = exports.getSubordinates = exports.allocateTarget = exports.createTarget = exports.getTargets = void 0;
const zod_1 = require("zod");
const mongoose_1 = __importDefault(require("mongoose"));
const Target_1 = __importDefault(require("../models/Target"));
const TargetAssignment_1 = __importDefault(require("../models/TargetAssignment"));
const Task_1 = __importDefault(require("../models/Task"));
const Agent_1 = __importDefault(require("../models/Agent"));
const Notification_1 = __importDefault(require("../models/Notification"));
const territoryScope_1 = require("../utils/territoryScope");
const cache_service_1 = require("../services/cache.service");
const eventBus_1 = require("../realtime/eventBus");
const createTargetSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Title required'),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    targetValue: zod_1.z.number().positive('Target value must be positive'),
    priority: zod_1.z.enum(['High', 'Medium', 'Low', 'high', 'medium', 'low']).optional().default('Medium')
});
const assignTargetSchema = zod_1.z.object({
    assignedTo: zod_1.z.string().min(1, 'assignedTo agent ID required'),
    dueDate: zod_1.z.string().min(1, 'Due date required')
});
const allocateTargetSchema = zod_1.z.object({
    assignedTo: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    divisionName: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily'),
    targetValue: zod_1.z.number().positive('Target value must be positive'),
    priority: zod_1.z.enum(['High', 'Medium', 'Low', 'high', 'medium', 'low']).optional().default('Medium'),
    dueDate: zod_1.z.string().optional()
});
// GET /api/targets — list targets created by or assigned to the agent
const getTargets = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '20', type } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = { createdBy: agentId };
        if (type)
            filter.type = type;
        const total = await Target_1.default.countDocuments(filter);
        const targets = await Target_1.default.find(filter)
            .populate('createdBy', 'name email role')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        return res.status(200).json({
            targets,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get targets error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTargets = getTargets;
// POST /api/targets — create a new target
const createTarget = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = createTargetSchema.parse(req.body);
        const target = new Target_1.default({ ...data, createdBy: agentId });
        await target.save();
        await target.populate('createdBy', 'name email role');
        return res.status(201).json({ message: 'Target created successfully', target });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Create target error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTarget = createTarget;
// POST /api/targets/allocate — allocate and assign target to division/pincode agent in one call
const allocateTarget = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = allocateTargetSchema.parse(req.body);
        const agentEmail = req.agent?.email;
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId, agentEmail);
        const territoryFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        let targetAgentId = data.assignedTo;
        let recipientName = data.divisionName || 'Division Agent';
        if (targetAgentId) {
            let allowedAgent = await Agent_1.default.findOne({ _id: targetAgentId, ...territoryFilter });
            if (!allowedAgent && mongoose_1.default.Types.ObjectId.isValid(targetAgentId)) {
                allowedAgent = await Agent_1.default.findOne({ _id: new mongoose_1.default.Types.ObjectId(targetAgentId), ...territoryFilter });
            }
            if (!allowedAgent) {
                const direct = await Agent_1.default.findById(targetAgentId).lean() || await Agent_1.default.findOne({ _id: targetAgentId }).lean();
                if (direct) {
                    const directState = (direct.territory?.state || direct.assignedTerritory?.state || direct.state || '').toLowerCase();
                    const scopeState = (scope?.state || '').toLowerCase();
                    if (!scopeState || directState.includes(scopeState) || scopeState.includes(directState)) {
                        allowedAgent = direct;
                    }
                }
            }
            if (!allowedAgent) {
                const db = mongoose_1.default.connection.db;
                if (db) {
                    const userDoc = await db.collection('users').findOne({
                        $or: [
                            { _id: targetAgentId },
                            { id: targetAgentId },
                            { agentId: targetAgentId }
                        ]
                    });
                    if (userDoc) {
                        const uState = (userDoc.territory?.state || userDoc.assignedTerritory?.state || userDoc.state || '').toLowerCase();
                        const scopeState = (scope?.state || '').toLowerCase();
                        if (!scopeState || uState.includes(scopeState) || scopeState.includes(uState)) {
                            allowedAgent = userDoc;
                        }
                    }
                }
            }
            if (!allowedAgent) {
                return res.status(403).json({ message: 'Target cannot be allocated to an agent outside authorized territory' });
            }
            // If specific district / division / pincode was selected for the target, verify agent matches
            const agtDist = (allowedAgent.assignedTerritory?.district || allowedAgent.territory?.district || allowedAgent.district || '').trim().toLowerCase();
            const agtDistId = (allowedAgent.assignedTerritory?.districtId || '').trim().toLowerCase();
            const agtDiv = (allowedAgent.assignedTerritory?.division || allowedAgent.territory?.division || allowedAgent.division || '').trim().toLowerCase();
            const agtPin = (allowedAgent.assignedTerritory?.pincode || allowedAgent.territory?.pincode || allowedAgent.pincode || '').trim();
            const tgtDist = (data.district || '').trim().toLowerCase();
            if (tgtDist && agtDist && agtDist !== tgtDist && !agtDist.includes(tgtDist) && !tgtDist.includes(agtDist) && agtDistId !== tgtDist) {
                return res.status(403).json({ message: `Agent '${allowedAgent.name}' is assigned to district '${agtDist || agtDistId}', not '${data.district}'` });
            }
            if (data.divisionName && agtDiv && !agtDiv.includes(data.divisionName.trim().toLowerCase()) && !data.divisionName.trim().toLowerCase().includes(agtDiv)) {
                return res.status(403).json({ message: `Agent '${allowedAgent.name}' is assigned to division '${agtDiv}', not '${data.divisionName}'` });
            }
            if (data.pincode && agtPin && agtPin !== data.pincode.trim()) {
                return res.status(403).json({ message: `Agent '${allowedAgent.name}' is assigned to PIN '${agtPin}', not '${data.pincode}'` });
            }
            recipientName = allowedAgent.name;
        }
        else if (data.divisionName) {
            const matchedAgent = await Agent_1.default.findOne({
                ...territoryFilter,
                $or: [
                    { name: new RegExp(data.divisionName, 'i') },
                    { 'assignedTerritory.division': new RegExp(data.divisionName, 'i') },
                    { 'territory.division': new RegExp(data.divisionName, 'i') },
                    { division: new RegExp(data.divisionName, 'i') }
                ]
            });
            if (matchedAgent) {
                targetAgentId = matchedAgent._id.toString();
                recipientName = matchedAgent.name;
            }
        }
        const title = data.title || `Daily Merchant Target: ${data.targetValue} visits (${recipientName})`;
        const target = new Target_1.default({
            title,
            description: data.description || `Allocated target of ${data.targetValue} merchant visits`,
            type: data.type || 'daily',
            targetValue: data.targetValue,
            priority: data.priority || 'Medium',
            createdBy: agentId
        });
        await target.save();
        let assignment = null;
        if (targetAgentId) {
            const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);
            assignment = new TargetAssignment_1.default({
                target: target._id,
                assignedTo: targetAgentId,
                assignedBy: agentId,
                dueDate,
                status: 'assigned'
            });
            await assignment.save();
            // Create Notification for the assigned agent
            await Notification_1.default.create({
                receiver: targetAgentId,
                title: 'New Target Assigned',
                message: `You have been assigned a target of ${data.targetValue} visits: ${title}`,
                priority: 'high',
                category: 'target_assigned'
            });
            // Invalidate dashboard stats cache
            await cache_service_1.cacheService.delByPrefix('dashboard:');
        }
        // Publish Realtime Target Event
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_CREATED',
            entity: 'target',
            entityId: target._id.toString(),
            action: 'assigned',
            scope: {
                targetAgentId: targetAgentId ? targetAgentId.toString() : undefined
            },
            data: {
                targetId: target._id,
                title: target.title,
                targetValue: target.targetValue,
                assignedTo: targetAgentId,
                assignmentId: assignment ? assignment._id : undefined
            }
        }).catch(() => { });
        return res.status(201).json({
            message: 'Target allocated successfully',
            target,
            assignment
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Allocate target error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.allocateTarget = allocateTarget;
// GET /api/targets/subordinates — list subordinates for target allocation dropdown
const getSubordinates = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const agentEmail = req.agent?.email;
        if (!agentId && !agentEmail)
            return res.status(401).json({ message: 'Unauthorized' });
        const { district, division, role } = req.query;
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId, agentEmail);
        const filter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        // Only active and approved agents should be counted or listed as active subordinates
        filter.$or = [
            { status: { $in: ['active', 'Active', 'approved', 'Approved', 'verified', 'Verified'] } },
            { kycStatus: { $in: ['active', 'Active', 'approved', 'Approved', 'verified', 'Verified'] } }
        ];
        // When caller is a Division Agent, downstream subordinates are strictly Pincode Agents
        const effectiveRole = role ? role.toLowerCase().trim() : (scope?.role === 'division' ? 'pincode' : '');
        const effectiveDivision = division ? division.trim() : (scope?.role === 'division' ? (scope?.division || '') : '');
        if (district) {
            filter.$and = filter.$and || [];
            const dClean = district.trim();
            const baseDist = dClean.replace(/\s+district$/i, '').trim();
            const distRegex = new RegExp(`^\\s*${baseDist}(\\s+district)?\\s*$`, 'i');
            filter.$and.push({
                $or: [
                    { 'assignedTerritory.district': distRegex },
                    { 'assignedTerritory.districtId': new RegExp(`^\\s*${dClean}\\s*$`, 'i') },
                    { 'territory.district': distRegex },
                    { district: distRegex },
                    { assignedDistrict: distRegex }
                ]
            });
        }
        if (effectiveDivision) {
            filter.$and = filter.$and || [];
            const baseDiv = effectiveDivision.replace(/\s+division$/i, '').trim();
            const divRegex = new RegExp(`^\\s*${baseDiv}(\\s+division)?\\s*$`, 'i');
            filter.$and.push({
                $or: [
                    { 'assignedTerritory.division': divRegex },
                    { 'assignedTerritory.divisionId': new RegExp(`^\\s*${effectiveDivision}\\s*$`, 'i') },
                    { 'territory.division': divRegex },
                    { division: divRegex },
                    { assignedDivision: divRegex }
                ]
            });
        }
        if (effectiveRole) {
            filter.$and = filter.$and || [];
            let rolePatterns = [effectiveRole];
            if (effectiveRole === 'district') {
                rolePatterns = ['district', 'district_agent', 'district_lead'];
            }
            else if (effectiveRole === 'division') {
                rolePatterns = ['division', 'division_agent', 'division_lead'];
            }
            else if (effectiveRole === 'pincode') {
                rolePatterns = ['pincode', 'pincode_agent'];
            }
            filter.$and.push({
                $or: [
                    { role: { $in: rolePatterns.map(p => new RegExp(`^${p}$`, 'i')) } },
                    { level: { $in: [effectiveRole, ...rolePatterns].map(p => new RegExp(`^${p}$`, 'i')) } },
                    { role: 'agent', level: { $in: [effectiveRole, ...rolePatterns].map(p => new RegExp(`^${p}$`, 'i')) } }
                ]
            });
        }
        let subordinates = await Agent_1.default.find(filter)
            .select('_id name role level assignedTerritory territory state district division pincode email phone status kycStatus performanceScore')
            .sort({ createdAt: -1 })
            .lean();
        // Query 'users' collection in MongoDB for agents registered or stored in users collection (strictly Agent roles only)
        try {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userFilter = {
                    role: {
                        $in: ['agent', 'state', 'district', 'division', 'pincode', 'state_agent', 'district_agent', 'division_agent', 'pincode_agent'],
                        $nin: ['admin', 'super-admin', 'superadmin', 'District Admin', 'Division Admin', 'Pincode Admin', 'State Admin', 'manager', 'state_manager', 'district_manager', 'division_manager', 'pincode_manager', 'Vendor', 'vendor', 'Customer', 'customer', 'technician', 'delivery_partner']
                    },
                    $or: [
                        { status: { $in: ['active', 'Active', 'approved', 'Approved', 'verified', 'Verified'] } },
                        { kycStatus: { $in: ['active', 'Active', 'approved', 'Approved', 'verified', 'Verified'] } },
                        { isApproved: true }
                    ]
                };
                const rClean = effectiveRole;
                if (rClean === 'district') {
                    userFilter.$and = [{
                            $or: [
                                { role: { $in: ['district', 'district_agent', 'district_lead'] } },
                                { level: /^district/i }
                            ]
                        }];
                }
                else if (rClean === 'division') {
                    userFilter.$and = [{
                            $or: [
                                { role: { $in: ['division', 'division_agent', 'division_lead'] } },
                                { level: /^division/i }
                            ]
                        }];
                }
                else if (rClean === 'pincode' || scope?.role === 'division') {
                    userFilter.$and = [{
                            $or: [
                                { role: { $in: ['pincode', 'pincode_agent'] } },
                                { level: /^pincode/i }
                            ]
                        }];
                }
                const userDocs = await db.collection('users').find(userFilter).limit(50).maxTimeMS(4000).toArray();
                const existingEmails = new Set(subordinates.map(s => (s.email || '').toLowerCase()));
                const existingIds = new Set(subordinates.map(s => String(s._id)));
                for (const u of userDocs) {
                    const uId = String(u._id);
                    const uEmail = (u.email || '').toLowerCase();
                    const regId = String(u.registrationId || '');
                    const uRole = (u.role || u.level || '').toLowerCase();
                    // Strictly exclude non-agent IDs, prefixes, or roles
                    if (/^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(uId) || /^(ADM-|usr_mgr|MGR-|cust_|ven-|FIC-CUS-)/i.test(regId))
                        continue;
                    if (/admin|manager|vendor|customer|delivery|technician|executive/i.test(uRole))
                        continue;
                    if (existingIds.has(uId) || (uEmail && existingEmails.has(uEmail)))
                        continue;
                    const uStatus = (u.status || '').toLowerCase().trim();
                    const uKyc = (u.kycStatus || '').toLowerCase().trim();
                    if (uStatus !== 'active' && uStatus !== 'approved' && uKyc !== 'verified' && uKyc !== 'approved' && !u.isApproved)
                        continue;
                    // Check role qualification
                    if (scope?.role === 'division' || rClean === 'pincode') {
                        if (!uRole.includes('pincode'))
                            continue;
                    }
                    const uState = (u.assignedTerritory?.state || u.territory?.state || u.state || u.assignedState || '').trim();
                    const uDist = (u.assignedTerritory?.district || u.territory?.district || u.district || u.assignedDistrict || '').trim();
                    const uDiv = (u.assignedTerritory?.division || u.territory?.division || u.division || u.assignedDivision || '').trim();
                    // Check scope authorization
                    if (scope?.state && uState && !uState.toLowerCase().includes(scope.state.toLowerCase()) && !scope.state.toLowerCase().includes(uState.toLowerCase())) {
                        continue;
                    }
                    if (district) {
                        const baseDist = district.replace(/\s+district$/i, '').trim().toLowerCase();
                        if (!uDist || (!uDist.toLowerCase().includes(baseDist) && !baseDist.includes(uDist.toLowerCase()))) {
                            continue;
                        }
                    }
                    if (effectiveDivision) {
                        const baseDiv = effectiveDivision.replace(/\s+division$/i, '').trim().toLowerCase();
                        if (!uDiv || (!uDiv.toLowerCase().includes(baseDiv) && !baseDiv.includes(uDiv.toLowerCase()))) {
                            continue;
                        }
                    }
                    else if (scope?.role === 'division') {
                        // Must have a matching division
                        continue;
                    }
                    // Map normalized role
                    let normRole = rClean || (uRole.includes('district') ? 'district' : uRole.includes('division') ? 'division' : 'pincode');
                    if (scope?.role === 'division' && normRole !== 'pincode')
                        continue;
                    subordinates.push({
                        _id: u._id,
                        name: u.name || 'District Agent',
                        role: normRole,
                        level: normRole,
                        assignedTerritory: u.assignedTerritory || {
                            state: uState,
                            district: uDist,
                            division: uDiv,
                            pincode: u.pincode || u.assignedPincode || ''
                        },
                        territory: u.territory || {
                            state: uState,
                            district: uDist,
                            division: uDiv,
                            pincode: u.pincode || u.assignedPincode || ''
                        },
                        state: uState,
                        district: uDist,
                        division: uDiv,
                        pincode: u.pincode || u.assignedPincode || '',
                        email: u.email || '',
                        phone: u.phone || u.mobile || '',
                        status: u.status || 'approved',
                        kycStatus: u.kycStatus || 'approved',
                        performanceScore: u.performanceScore || 0
                    });
                    if (uEmail)
                        existingEmails.add(uEmail);
                    existingIds.add(uId);
                }
            }
        }
        catch (usersErr) {
            console.warn('Fallback users query in getSubordinates failed gracefully:', usersErr);
        }
        const subIds = subordinates.map(s => s._id);
        let assignments = [];
        let tasks = [];
        try {
            const subIdStrings = subIds.map(s => String(s));
            const [asgnsResult, tasksResult] = await Promise.all([
                TargetAssignment_1.default.find({ assignedTo: { $in: subIds } }).populate('target').lean(),
                Task_1.default.find({
                    $or: [
                        { assignedAgentId: { $in: subIdStrings } },
                        { assignedAgentId: { $in: subIds } }
                    ]
                }).lean()
            ]);
            assignments = asgnsResult || [];
            tasks = tasksResult || [];
        }
        catch (asgnErr) {
            console.warn('TargetAssignment metrics query failed gracefully:', asgnErr);
        }
        const subsWithMetrics = subordinates.map(sub => {
            const subAsgns = assignments.filter((a) => String(a.assignedTo) === String(sub._id));
            const subTasks = tasks.filter((t) => String(t.assignedAgentId) === String(sub._id));
            const assignedTargets = subAsgns.reduce((acc, a) => acc + (a.target?.targetValue || 1), 0) + subTasks.length;
            const completedTargets = subAsgns.filter((a) => a.status === 'completed').reduce((acc, a) => acc + (a.target?.targetValue || 1), 0)
                + subTasks.filter((t) => ['Approved', 'Completed', 'Closed'].includes(t.status)).length;
            const rawRole = (sub.role || sub.level || 'pincode').toLowerCase();
            const normalizedRole = rawRole.includes('district')
                ? 'district'
                : rawRole.includes('division')
                    ? 'division'
                    : 'pincode';
            return {
                ...sub,
                role: normalizedRole,
                assignedTargets,
                completedTargets
            };
        });
        return res.status(200).json({ subordinates: subsWithMetrics });
    }
    catch (error) {
        console.error('Get subordinates error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getSubordinates = getSubordinates;
// POST /api/targets/:id/assign — assign a target to another agent
const assignTarget = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { id: targetId } = req.params;
        const data = assignTargetSchema.parse(req.body);
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        const territoryFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
        const allowedAgent = await Agent_1.default.findOne({ _id: data.assignedTo, ...territoryFilter });
        if (!allowedAgent) {
            return res.status(403).json({ message: 'Target cannot be assigned to an agent outside authorized territory' });
        }
        const target = await Target_1.default.findById(targetId);
        if (!target)
            return res.status(404).json({ message: 'Target not found' });
        const assignment = new TargetAssignment_1.default({
            target: targetId,
            assignedTo: data.assignedTo,
            assignedBy: agentId,
            dueDate: new Date(data.dueDate),
            status: 'assigned'
        });
        await assignment.save();
        await assignment.populate([
            { path: 'target', select: 'title type targetValue' },
            { path: 'assignedTo', select: 'name email role' },
            { path: 'assignedBy', select: 'name email role' }
        ]);
        // Invalidate dashboard stats cache
        await cache_service_1.cacheService.delByPrefix('dashboard:');
        return res.status(201).json({ message: 'Target assigned successfully', assignment });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation failed', errors: error.errors });
        }
        console.error('Assign target error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.assignTarget = assignTarget;
// GET /api/targets/assignments/mine — list assignments for the current agent and authorized territory
const getMyAssignments = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '50', status } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 50;
        const isObjId = mongoose_1.default.Types.ObjectId.isValid(agentId);
        const objAgentId = isObjId ? new mongoose_1.default.Types.ObjectId(agentId) : null;
        const idMatches = [{ assignedTo: agentId }, { assignedBy: agentId }];
        if (objAgentId) {
            idMatches.push({ assignedTo: objAgentId }, { assignedBy: objAgentId });
        }
        let filter = {
            $or: idMatches
        };
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        if (scope && ['state', 'district', 'division'].includes(scope.role)) {
            const territoryFilter = (0, territoryScope_1.buildTerritoryFilter)(scope);
            const subordinates = await Agent_1.default.find(territoryFilter).select('_id').lean();
            const subordinateIds = subordinates.map(s => s._id);
            filter = {
                $or: [
                    ...idMatches,
                    { assignedTo: { $in: subordinateIds } }
                ]
            };
        }
        if (status)
            filter.status = status;
        let total = 0;
        let assignments = [];
        try {
            const [countResult, findResult] = await Promise.all([
                TargetAssignment_1.default.countDocuments(filter),
                TargetAssignment_1.default.find(filter)
                    .select('target assignedTo assignedBy dueDate status completedAt createdAt updatedAt')
                    .populate('target', 'title description type targetValue')
                    .populate('assignedBy', 'name email role')
                    .populate('assignedTo', 'name email role territory assignedTerritory')
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean()
            ]);
            total = countResult;
            assignments = findResult || [];
        }
        catch (queryErr) {
            console.warn('TargetAssignment query warning:', queryErr);
            // Fallback: try querying without populate to prevent 500 error
            try {
                assignments = await TargetAssignment_1.default.find(filter)
                    .sort({ createdAt: -1 })
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .lean();
                total = assignments.length;
            }
            catch (fallbackErr) {
                console.error('TargetAssignment fallback error:', fallbackErr);
                assignments = [];
                total = 0;
            }
        }
        // Ensure unpopulated string references for assignedTo and target are populated manually
        if (assignments.length > 0) {
            const missingAgentIds = assignments
                .filter(a => a.assignedTo && typeof a.assignedTo !== 'object')
                .map(a => a.assignedTo);
            if (missingAgentIds.length > 0) {
                try {
                    const agents = await Agent_1.default.find({ _id: { $in: missingAgentIds } })
                        .select('name email role territory assignedTerritory')
                        .lean();
                    const agtMap = new Map(agents.map(ag => [String(ag._id), ag]));
                    assignments.forEach(a => {
                        if (a.assignedTo && typeof a.assignedTo !== 'object') {
                            a.assignedTo = agtMap.get(String(a.assignedTo)) || { name: 'Agent', role: 'pincode' };
                        }
                    });
                }
                catch (e) { }
            }
            const missingTargetIds = assignments
                .filter(a => a.target && typeof a.target !== 'object')
                .map(a => a.target);
            if (missingTargetIds.length > 0) {
                try {
                    const targets = await Target_1.default.find({ _id: { $in: missingTargetIds } })
                        .select('title description type targetValue')
                        .lean();
                    const tgtMap = new Map(targets.map(tg => [String(tg._id), tg]));
                    assignments.forEach(a => {
                        if (a.target && typeof a.target !== 'object') {
                            a.target = tgtMap.get(String(a.target)) || { title: 'Target Goal', targetValue: 0 };
                        }
                    });
                }
                catch (e) { }
            }
        }
        return res.status(200).json({
            assignments,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get my assignments error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getMyAssignments = getMyAssignments;
// PATCH /api/targets/assignments/:id/status — update assignment status
const updateAssignmentStatus = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { status } = req.body;
        const validStatuses = ['assigned', 'accepted', 'in_progress', 'completed', 'pending', 'overdue', 'rejected', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
        }
        const assignment = await TargetAssignment_1.default.findOne({ _id: req.params.id, assignedTo: agentId });
        if (!assignment)
            return res.status(404).json({ message: 'Assignment not found or access denied' });
        assignment.status = status;
        if (status === 'completed')
            assignment.completedAt = new Date();
        assignment.updatedAt = new Date();
        await assignment.save();
        await assignment.populate([
            { path: 'target', select: 'title type targetValue' },
            { path: 'assignedBy', select: 'name email role' }
        ]);
        // Invalidate dashboard stats cache
        await cache_service_1.cacheService.delByPrefix('dashboard:');
        // Publish Realtime Target Status Event
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_STATUS_CHANGED',
            entity: 'target',
            entityId: assignment._id.toString(),
            action: 'status_changed',
            scope: {
                targetAgentId: assignment.assignedBy ? assignment.assignedBy._id?.toString() || assignment.assignedBy.toString() : undefined
            },
            data: {
                assignmentId: assignment._id,
                targetId: assignment.target?._id || assignment.target,
                status: assignment.status
            }
        }).catch(() => { });
        return res.status(200).json({ message: 'Assignment status updated', assignment });
    }
    catch (error) {
        console.error('Update assignment status error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateAssignmentStatus = updateAssignmentStatus;
//# sourceMappingURL=target.controller.js.map