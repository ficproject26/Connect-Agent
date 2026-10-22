"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEligibleAgents = exports.reviewEvidence = exports.submitEvidence = exports.rejectTask = exports.acceptTask = exports.rejectRequest = exports.approveAndAssignRequest = exports.getTaskById = exports.getTasks = exports.createTask = void 0;
exports.resolveUserContext = resolveUserContext;
exports.resolveReceivingAdmin = resolveReceivingAdmin;
exports.findTaskDoc = findTaskDoc;
const mongoose_1 = __importDefault(require("mongoose"));
const Task_1 = __importDefault(require("../models/Task"));
const Agent_1 = __importDefault(require("../models/Agent"));
const eventBus_1 = require("../realtime/eventBus");
const cache_service_1 = require("../services/cache.service");
const notification_service_1 = __importDefault(require("../services/notification.service"));
const zod_1 = require("zod");
const HIERARCHY_RANKS = {
    state: 4,
    district: 3,
    division: 2,
    pincode: 1
};
async function resolveUserContext(req) {
    const tokenAgent = req.agent;
    if (!tokenAgent || !tokenAgent.agentId)
        return null;
    const agentId = tokenAgent.agentId;
    const email = tokenAgent.email;
    const cacheKey = `userContext:${agentId || email}`;
    try {
        const cached = await cache_service_1.cacheService.get(cacheKey);
        if (cached)
            return cached;
    }
    catch (_) { }
    // 1. Check Agent collection
    let agentDoc = null;
    if (mongoose_1.default.Types.ObjectId.isValid(agentId)) {
        agentDoc = await Agent_1.default.findById(agentId).lean();
    }
    if (!agentDoc) {
        agentDoc = await Agent_1.default.findOne({
            $or: [{ agentId }, { registrationId: agentId }, { email: email?.toLowerCase() }]
        }).lean();
    }
    // 2. Check Users collection (Admin app users)
    let userDoc = null;
    const db = mongoose_1.default.connection.db;
    if (db) {
        const orClauses = [];
        if (mongoose_1.default.Types.ObjectId.isValid(agentId)) {
            orClauses.push({ _id: new mongoose_1.default.Types.ObjectId(agentId) });
        }
        orClauses.push({ _id: agentId });
        if (email)
            orClauses.push({ email: email.toLowerCase().trim() });
        userDoc = await db.collection('users').findOne({ $or: orClauses });
    }
    const doc = userDoc || agentDoc;
    if (!doc)
        return null;
    const rawRoleStr = (doc.role || doc.level || tokenAgent.role || 'pincode').toString();
    const lowerRawRole = rawRoleStr.toLowerCase();
    const adminRegex = /state\s*admin|state_manager|district\s*admin|district_manager|division\s*admin|divisional\s*admin|division_manager|pincode\s*admin|pincode_manager|super\s*admin|^admin$/i;
    const isAdmin = adminRegex.test(lowerRawRole);
    // Normalize effective role (e.g. if role is 'agent', look at level or agentDoc.role)
    let effectiveRole = rawRoleStr;
    if (lowerRawRole === 'agent') {
        effectiveRole = (doc.level || agentDoc?.role || agentDoc?.level || tokenAgent.role || 'pincode').toString();
    }
    const lowerEffectiveRole = effectiveRole.toLowerCase();
    // Determine hierarchy level
    let level = 'pincode';
    if (lowerEffectiveRole.includes('state') || (doc.level && String(doc.level).toLowerCase().includes('state')))
        level = 'state';
    else if (lowerEffectiveRole.includes('district') || (doc.level && String(doc.level).toLowerCase().includes('district')))
        level = 'district';
    else if (lowerEffectiveRole.includes('division') || lowerEffectiveRole.includes('divisional') || (doc.level && String(doc.level).toLowerCase().includes('division')))
        level = 'division';
    else if (lowerEffectiveRole.includes('pincode') || (doc.level && String(doc.level).toLowerCase().includes('pincode')))
        level = 'pincode';
    const territory = {
        state: (doc.territory?.state || doc.assignedTerritory?.state || agentDoc?.territory?.state || agentDoc?.assignedTerritory?.state || doc.state || doc.assignedState || '').trim(),
        district: (doc.territory?.district || doc.assignedTerritory?.district || agentDoc?.territory?.district || agentDoc?.assignedTerritory?.district || doc.district || doc.assignedDistrict || '').trim(),
        division: (doc.territory?.division || doc.assignedTerritory?.division || agentDoc?.territory?.division || agentDoc?.assignedTerritory?.division || doc.division || doc.assignedDivision || '').trim(),
        pincode: (doc.territory?.pincode || doc.assignedTerritory?.pincode || agentDoc?.territory?.pincode || agentDoc?.assignedTerritory?.pincode || doc.pincode || doc.assignedPincode || '').trim()
    };
    const resolved = {
        id: doc._id?.toString() || agentId,
        registrationId: doc.registrationId || agentDoc?.registrationId || doc.agentId || agentDoc?.agentId || '',
        name: doc.name || tokenAgent.email?.split('@')[0] || 'User',
        email: doc.email || tokenAgent.email || '',
        role: effectiveRole,
        isAdmin,
        isAgent: !isAdmin,
        level,
        territory
    };
    await cache_service_1.cacheService.set(cacheKey, resolved, 30).catch(() => { });
    return resolved;
}
// Helper: Find receiving Admin for target level & territory
async function resolveReceivingAdmin(targetLevel, territory) {
    const db = mongoose_1.default.connection.db;
    if (!db)
        return null;
    let query = {};
    if (targetLevel === 'district') {
        query = {
            role: { $regex: /district\s*admin|district_manager/i },
            district: { $regex: new RegExp(`^${(territory.district || '').trim()}$`, 'i') }
        };
    }
    else if (targetLevel === 'division') {
        query = {
            role: { $regex: /division\s*admin|divisional\s*admin|division_manager/i },
            $or: [
                { division: { $regex: new RegExp(`^${(territory.division || '').trim()}$`, 'i') } },
                { district: { $regex: new RegExp(`^${(territory.district || '').trim()}$`, 'i') } }
            ]
        };
    }
    else if (targetLevel === 'pincode') {
        query = {
            role: { $regex: /pincode\s*admin|pincode_manager/i },
            $or: [
                { pincode: (territory.pincode || '').trim() },
                { division: { $regex: new RegExp(`^${(territory.division || '').trim()}$`, 'i') } }
            ]
        };
    }
    let adminUser = await db.collection('users').findOne(query);
    // Fallback: If no dedicated admin found for that exact division/pincode, find district or state admin
    if (!adminUser && territory.district) {
        adminUser = await db.collection('users').findOne({
            role: { $regex: /district\s*admin|district_manager/i },
            district: { $regex: new RegExp(`^${(territory.district || '').trim()}$`, 'i') }
        });
    }
    if (!adminUser && territory.state) {
        adminUser = await db.collection('users').findOne({
            role: { $regex: /state\s*admin|state_manager/i },
            state: { $regex: new RegExp(`^${(territory.state || '').trim()}$`, 'i') }
        });
    }
    if (adminUser) {
        return {
            adminId: adminUser._id,
            adminName: adminUser.name || 'Admin',
            adminRole: adminUser.role || `${targetLevel.charAt(0).toUpperCase() + targetLevel.slice(1)} Admin`
        };
    }
    return {
        adminId: 'ADMIN-PENDING',
        adminName: `${targetLevel.charAt(0).toUpperCase() + targetLevel.slice(1)} Admin Review Team`,
        adminRole: `${targetLevel.charAt(0).toUpperCase() + targetLevel.slice(1)} Admin`
    };
}
// Helper: Safely query task by id (ObjectId or string) or taskNumber
async function findTaskDoc(id) {
    if (!id)
        return null;
    const orClauses = [{ taskNumber: id }, { _id: id }];
    if (mongoose_1.default.Types.ObjectId.isValid(id)) {
        orClauses.push({ _id: new mongoose_1.default.Types.ObjectId(id) });
    }
    return Task_1.default.findOne({ $or: orClauses });
}
// Validation schemas
const createTaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters'),
    description: zod_1.z.string().min(5, 'Description must be at least 5 characters'),
    priority: zod_1.z.enum(['High', 'Medium', 'Low', 'high', 'medium', 'low']),
    dueDate: zod_1.z.string().refine(val => !isNaN(Date.parse(val)), 'Valid due date required'),
    targetLevel: zod_1.z.enum(['state', 'district', 'division', 'pincode']),
    state: zod_1.z.string().min(1, 'State is required'),
    district: zod_1.z.string().optional().default(''),
    division: zod_1.z.string().optional().default(''),
    pincode: zod_1.z.string().optional().default(''),
    assignedAgentId: zod_1.z.string().optional(),
    vendor: zod_1.z.string().optional().default(''),
    category: zod_1.z.string().optional().default('General Task'),
    location: zod_1.z.string().optional().default('')
});
// 1. POST /api/tasks — Create Task / Submit Task Request
const createTask = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const body = createTaskSchema.parse(req.body);
        const normalizedPriority = (body.priority.charAt(0).toUpperCase() + body.priority.slice(1).toLowerCase());
        const dueDateObj = new Date(body.dueDate);
        // Validate deadline is in the future
        if (dueDateObj.getTime() <= Date.now()) {
            return res.status(400).json({
                message: 'Deadline must be in the future. Past or immediate deadlines are not permitted.'
            });
        }
        // TYPE A: ADMIN-CREATED TASK (Direct Assignment)
        if (userCtx.isAdmin) {
            // Rule: Admin can assign ONLY to agents at their OWN level and authorized territory
            if (body.targetLevel !== userCtx.level) {
                return res.status(403).json({
                    message: `Forbidden: As a ${userCtx.role}, you can only directly assign tasks to ${userCtx.level.toUpperCase()} agents.`
                });
            }
            // Territory boundary check
            if (userCtx.level === 'state' && userCtx.territory.state && body.state.toLowerCase() !== userCtx.territory.state.toLowerCase()) {
                return res.status(403).json({ message: `Forbidden: You can only assign tasks within your state "${userCtx.territory.state}".` });
            }
            if (userCtx.level === 'district') {
                if (userCtx.territory.district && body.district.toLowerCase() !== userCtx.territory.district.toLowerCase()) {
                    return res.status(403).json({ message: `Forbidden: You can only assign tasks within your district "${userCtx.territory.district}".` });
                }
            }
            if (userCtx.level === 'division') {
                if (userCtx.territory.division && body.division.toLowerCase() !== userCtx.territory.division.toLowerCase()) {
                    return res.status(403).json({ message: `Forbidden: You can only assign tasks within your division "${userCtx.territory.division}".` });
                }
            }
            if (userCtx.level === 'pincode') {
                if (userCtx.territory.pincode && body.pincode !== userCtx.territory.pincode) {
                    return res.status(403).json({ message: `Forbidden: You can only assign tasks within your pincode "${userCtx.territory.pincode}".` });
                }
            }
            if (!body.assignedAgentId) {
                return res.status(400).json({ message: 'An eligible assigned agent is required for direct Admin task creation.' });
            }
            // Verify the target agent exists, is active/approved, matches the hierarchy level and territory
            let targetAgent = null;
            if (mongoose_1.default.Types.ObjectId.isValid(body.assignedAgentId)) {
                targetAgent = await Agent_1.default.findById(body.assignedAgentId).lean();
            }
            if (!targetAgent) {
                targetAgent = await Agent_1.default.findOne({
                    $or: [{ agentId: body.assignedAgentId }, { registrationId: body.assignedAgentId }, { _id: body.assignedAgentId }]
                }).lean();
            }
            if (!targetAgent) {
                return res.status(404).json({ message: 'Selected assigned agent was not found in active records.' });
            }
            const agentKyc = (targetAgent.kycStatus || '').toLowerCase();
            const agentStatus = (targetAgent.status || '').toLowerCase();
            const isActive = agentKyc === 'approved' || agentStatus === 'active' || agentStatus === 'approved';
            if (!isActive) {
                return res.status(400).json({ message: `Target agent ${targetAgent.name} is not currently active or approved.` });
            }
            const targetAgentRole = (targetAgent.role || targetAgent.level || '').toLowerCase();
            if (targetAgentRole !== userCtx.level) {
                return res.status(400).json({
                    message: `Hierarchy level mismatch: Agent is at level "${targetAgentRole}", but task requires "${userCtx.level}".`
                });
            }
            const taskNumber = `TSK-${Date.now().toString().slice(-6)}`;
            const newTask = new Task_1.default({
                _id: new mongoose_1.default.Types.ObjectId(),
                taskNumber,
                title: body.title.trim(),
                description: body.description.trim(),
                priority: normalizedPriority,
                dueDate: dueDateObj,
                taskType: 'admin_direct',
                requestStatus: 'approved',
                status: 'Assigned',
                hierarchyLevel: userCtx.level,
                state: body.state,
                district: body.district,
                division: body.division,
                pincode: body.pincode,
                location: body.location || [body.pincode, body.division, body.district, body.state].filter(Boolean).join(', '),
                vendor: body.vendor,
                category: body.category,
                createdById: userCtx.id,
                createdByName: userCtx.name,
                createdByRole: userCtx.role,
                createdByAdminId: userCtx.id,
                createdByAdminName: userCtx.name,
                createdByAdminRole: userCtx.role,
                assignedAgentId: targetAgent._id,
                assignedAgentName: targetAgent.name,
                assignedAgentRole: targetAgent.role,
                assignedDate: new Date(),
                history: [
                    {
                        action: 'TASK_CREATED_AND_ASSIGNED',
                        performedBy: userCtx.name,
                        performedById: userCtx.id,
                        performedRole: userCtx.role,
                        timestamp: new Date(),
                        details: { assignedTo: targetAgent.name, level: userCtx.level, priority: normalizedPriority }
                    }
                ]
            });
            await newTask.save();
            await cache_service_1.cacheService.delByPrefix('dashboard:').catch(() => { });
            // Dispatch Task Assignment Notification to receiving Agent
            await notification_service_1.default.notifyTaskAssignment(newTask, targetAgent._id).catch(() => { });
            (0, eventBus_1.publishEntityEvent)({
                event: 'ENTITY_CREATED',
                entity: 'task',
                entityId: newTask._id.toString(),
                action: 'created',
                scope: { state: body.state, district: body.district, division: body.division, pincode: body.pincode },
                data: newTask
            }).catch(() => { });
            return res.status(201).json({
                message: 'Task created and assigned successfully.',
                task: newTask
            });
        }
        // TYPE B: AGENT-INITIATED TASK REQUEST
        if (userCtx.isAgent) {
            // Rule 1: Pincode Agent cannot initiate any task requests (terminal level)
            if (userCtx.level === 'pincode') {
                return res.status(403).json({
                    message: 'Forbidden: Pincode Agents cannot initiate task requests as no lower hierarchy level exists.'
                });
            }
            // Rule 2: Agent can initiate requests ONLY for the NEXT LOWER hierarchy level
            const currentRank = HIERARCHY_RANKS[userCtx.level] || 0;
            const targetRank = HIERARCHY_RANKS[body.targetLevel] || 0;
            if (targetRank !== currentRank - 1) {
                let expectedNext = 'district';
                if (userCtx.level === 'state')
                    expectedNext = 'district';
                else if (userCtx.level === 'district')
                    expectedNext = 'division';
                else if (userCtx.level === 'division')
                    expectedNext = 'pincode';
                return res.status(403).json({
                    message: `Forbidden: As a ${userCtx.level.toUpperCase()} Agent, you can only initiate task requests for ${expectedNext.toUpperCase()} level tasks.`
                });
            }
            // Default territory fields from userCtx if missing or blank
            if (!body.state && userCtx.territory.state) {
                body.state = userCtx.territory.state;
            }
            if (!body.district && userCtx.territory.district) {
                body.district = userCtx.territory.district;
            }
            if (!body.division && userCtx.territory.division) {
                body.division = userCtx.territory.division;
            }
            // Rule 3: Territory containment check (trimmed and case-insensitive)
            const reqState = (body.state || '').trim().toLowerCase();
            const userState = (userCtx.territory.state || '').trim().toLowerCase();
            if (userState && reqState && reqState !== userState) {
                return res.status(403).json({
                    message: `Forbidden: You cannot initiate requests outside your state "${userCtx.territory.state}".`
                });
            }
            const reqDistrict = (body.district || '').trim().toLowerCase();
            const userDistrict = (userCtx.territory.district || '').trim().toLowerCase();
            if (userCtx.level === 'district' && userDistrict && reqDistrict && reqDistrict !== userDistrict) {
                return res.status(403).json({
                    message: `Forbidden: You cannot initiate requests outside your district "${userCtx.territory.district}".`
                });
            }
            const reqDivision = (body.division || '').trim().toLowerCase();
            const userDivision = (userCtx.territory.division || '').trim().toLowerCase();
            if (userCtx.level === 'division' && userDivision && reqDivision && reqDivision !== userDivision) {
                return res.status(403).json({
                    message: `Forbidden: You cannot initiate requests outside your division "${userCtx.territory.division}".`
                });
            }
            // Rule 4: Agents must NEVER directly assign executable tasks. Must route to Receiving Admin.
            const receivingAdmin = await resolveReceivingAdmin(body.targetLevel, {
                state: body.state,
                district: body.district,
                division: body.division,
                pincode: body.pincode
            });
            const taskNumber = `REQ-${Date.now().toString().slice(-6)}`;
            const newTask = new Task_1.default({
                _id: new mongoose_1.default.Types.ObjectId(),
                taskNumber,
                title: body.title.trim(),
                description: body.description.trim(),
                priority: normalizedPriority,
                dueDate: dueDateObj,
                taskType: 'agent_request',
                requestStatus: 'pending',
                status: 'Pending Admin Review',
                hierarchyLevel: body.targetLevel,
                state: body.state,
                district: body.district,
                division: body.division,
                pincode: body.pincode,
                location: body.location || [body.pincode, body.division, body.district, body.state].filter(Boolean).join(', '),
                vendor: body.vendor,
                category: body.category,
                createdById: userCtx.id,
                createdByName: userCtx.name,
                createdByRole: userCtx.role,
                receivingAdminId: receivingAdmin?.adminId,
                receivingAdminName: receivingAdmin?.adminName,
                receivingAdminRole: receivingAdmin?.adminRole,
                assignedAgentId: null, // Strictly null until Receiving Admin approves and assigns
                history: [
                    {
                        action: 'REQUEST_INITIATED',
                        performedBy: userCtx.name,
                        performedById: userCtx.id,
                        performedRole: userCtx.role,
                        timestamp: new Date(),
                        details: {
                            targetLevel: body.targetLevel,
                            receivingAdmin: receivingAdmin?.adminName,
                            priority: normalizedPriority
                        }
                    }
                ]
            });
            await newTask.save();
            await cache_service_1.cacheService.delByPrefix('dashboard:').catch(() => { });
            (0, eventBus_1.publishEntityEvent)({
                event: 'ENTITY_CREATED',
                entity: 'task_request',
                entityId: newTask._id.toString(),
                action: 'requested',
                scope: { state: body.state, district: body.district, division: body.division, pincode: body.pincode },
                data: newTask
            }).catch(() => { });
            return res.status(201).json({
                message: 'Task request submitted successfully. It has been routed to the receiving-territory Admin for review.',
                task: newTask
            });
        }
        return res.status(400).json({ message: 'Unable to process task creation for this user profile.' });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errMsgs = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return res.status(400).json({ message: `Validation error: ${errMsgs}`, errors: error.errors });
        }
        console.error('Error creating task:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while creating task.' });
    }
};
exports.createTask = createTask;
// 2. GET /api/tasks — List Tasks with Territory-Based Visibility and Dynamic Statuses
const getTasks = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const { tab = 'all', status, priority, hierarchyLevel, search, page = '1', limit = '30', state, district, division, pincode } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
        const filter = {};
        // TAB FILTERING & MANAGER TASK EXCLUSION
        if (tab === 'my_tasks') {
            const agentMatches = [userCtx.id, String(userCtx.id)];
            if (mongoose_1.default.Types.ObjectId.isValid(userCtx.id)) {
                agentMatches.push(new mongoose_1.default.Types.ObjectId(userCtx.id));
            }
            filter.assignedAgentId = { $in: agentMatches };
            // Rule: Tasks assigned to Managers must never appear in an Agent's My Assigned Tasks
            filter.assignedManagerId = { $in: [null, undefined, ''] };
        }
        else if (tab === 'created') {
            const agentMatches = [userCtx.id, String(userCtx.id)];
            if (mongoose_1.default.Types.ObjectId.isValid(userCtx.id)) {
                agentMatches.push(new mongoose_1.default.Types.ObjectId(userCtx.id));
            }
            filter.createdById = { $in: agentMatches };
        }
        else if (tab === 'requests') {
            if (userCtx.isAdmin) {
                // Admin sees requests in their territory with status 'Pending Admin Review'
                filter.status = 'Pending Admin Review';
            }
            else {
                // Agent sees requests they initiated
                const agentMatches = [userCtx.id, String(userCtx.id)];
                if (mongoose_1.default.Types.ObjectId.isValid(userCtx.id)) {
                    agentMatches.push(new mongoose_1.default.Types.ObjectId(userCtx.id));
                }
                filter.createdById = { $in: agentMatches };
            }
        }
        else if (tab === 'territory') {
            // Territory Task Monitoring: Show tasks authorized to monitor, excluding manager-only tasks
            filter.assignedManagerId = { $in: [null, undefined, ''] };
        }
        // In Agent Website, exclude manager tasks from all tabs
        if (userCtx.isAgent) {
            filter.assignedManagerId = { $in: [null, undefined, ''] };
        }
        // STATUS FILTERING
        if (status && status !== 'all') {
            if (status === 'overdue') {
                filter.dueDate = { $lt: new Date() };
                filter.status = { $nin: ['Approved', 'Completed', 'Rejected', 'Closed'] };
            }
            else {
                filter.status = status;
            }
        }
        // PRIORITY FILTERING
        if (priority && priority !== 'all') {
            filter.priority = new RegExp(`^${priority}$`, 'i');
        }
        // HIERARCHY LEVEL FILTERING
        if (hierarchyLevel && hierarchyLevel !== 'all') {
            filter.hierarchyLevel = hierarchyLevel;
        }
        // SEARCH
        if (search && typeof search === 'string' && search.trim()) {
            const q = search.trim();
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { taskNumber: new RegExp(q, 'i') },
                    { title: new RegExp(q, 'i') },
                    { description: new RegExp(q, 'i') },
                    { vendor: new RegExp(q, 'i') },
                    { assignedAgentName: new RegExp(q, 'i') },
                    { createdByName: new RegExp(q, 'i') }
                ]
            });
        }
        // AUTHORIZATION & STRICT TERRITORY ISOLATION RULES
        if (userCtx.role.toLowerCase() !== 'super admin' && userCtx.role.toLowerCase() !== 'admin') {
            // 1. State Agent: strictly locked to assigned state
            if (userCtx.territory.state) {
                if (state && typeof state === 'string' && state.trim()) {
                    const reqSt = state.trim().toLowerCase();
                    const userSt = userCtx.territory.state.trim().toLowerCase();
                    if (reqSt !== userSt && !reqSt.includes(userSt) && !userSt.includes(reqSt)) {
                        return res.status(403).json({ message: `Forbidden: You cannot access tasks outside your assigned state "${userCtx.territory.state}".` });
                    }
                }
                filter.state = new RegExp(`^\\s*${userCtx.territory.state.trim()}\\s*$`, 'i');
            }
            // 2. District Agent: strictly locked to assigned district and subordinate divisions & pincodes
            if (userCtx.level === 'district' && userCtx.territory.district) {
                if (district && typeof district === 'string' && district.trim()) {
                    const reqD = district.trim().toLowerCase().replace(/\s+district$/i, '');
                    const userD = userCtx.territory.district.trim().toLowerCase().replace(/\s+district$/i, '');
                    if (reqD !== userD && !reqD.includes(userD) && !userD.includes(reqD)) {
                        return res.status(403).json({ message: `Forbidden: You cannot access tasks outside your assigned district "${userCtx.territory.district}".` });
                    }
                }
                const baseD = userCtx.territory.district.trim().replace(/\s+district$/i, '');
                filter.district = new RegExp(`^\\s*${baseD}(\\s+district)?\\s*$`, 'i');
            }
            // 3. Division Agent: strictly locked to assigned division and subordinate pincodes
            if (userCtx.level === 'division' && userCtx.territory.division) {
                if (division && typeof division === 'string' && division.trim()) {
                    const reqDiv = division.trim().toLowerCase().replace(/\s+division$/i, '');
                    const userDiv = userCtx.territory.division.trim().toLowerCase().replace(/\s+division$/i, '');
                    if (reqDiv !== userDiv && !reqDiv.includes(userDiv) && !userDiv.includes(reqDiv)) {
                        return res.status(403).json({ message: `Forbidden: You cannot access tasks outside your assigned division "${userCtx.territory.division}".` });
                    }
                }
                const baseDiv = userCtx.territory.division.trim().replace(/\s+division$/i, '');
                filter.division = new RegExp(baseDiv, 'i');
            }
            // 4. Pincode Agent: strictly authorized for assigned pincode AND tasks assigned to or created by them
            if (userCtx.level === 'pincode') {
                if (pincode && typeof pincode === 'string' && pincode.trim() && userCtx.territory.pincode && pincode.trim() !== userCtx.territory.pincode.trim()) {
                    return res.status(403).json({ message: `Forbidden: You cannot access tasks outside your assigned pincode "${userCtx.territory.pincode}".` });
                }
                if (userCtx.territory.pincode) {
                    filter.pincode = userCtx.territory.pincode.trim();
                }
                // Section 1: Pincode Agent must not expose tasks belonging to other pincodes or unrelated agents
                const pinAgentMatches = [userCtx.id];
                if (mongoose_1.default.Types.ObjectId.isValid(userCtx.id)) {
                    pinAgentMatches.push(new mongoose_1.default.Types.ObjectId(userCtx.id));
                }
                filter.$and = filter.$and || [];
                filter.$and.push({
                    $or: [
                        { assignedAgentId: { $in: pinAgentMatches } },
                        { createdById: { $in: pinAgentMatches } }
                    ]
                });
            }
        }
        // Optional drill-down filters from UI (for authorized higher levels)
        if (state && typeof state === 'string' && (!filter.state || userCtx.role.toLowerCase() === 'super admin' || userCtx.role.toLowerCase() === 'admin')) {
            filter.state = new RegExp(`^${state.trim()}$`, 'i');
        }
        if (district && typeof district === 'string' && district.trim() && userCtx.level === 'state') {
            const baseD = district.trim().replace(/\s+district$/i, '');
            filter.district = new RegExp(`^\\s*${baseD}(\\s+district)?\\s*$`, 'i');
        }
        if (division && typeof division === 'string' && division.trim() && (userCtx.level === 'state' || userCtx.level === 'district')) {
            const baseDiv = division.trim().replace(/\s+division$/i, '');
            filter.division = new RegExp(baseDiv, 'i');
        }
        if (pincode && typeof pincode === 'string' && pincode.trim() && userCtx.level !== 'pincode') {
            filter.pincode = pincode.trim();
        }
        const total = await Task_1.default.countDocuments(filter);
        const tasks = await Task_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        // Section 3: Remove incorrect placeholder — resolve assigned agent name from authoritative records if missing
        const unassignedWithId = tasks.filter((t) => t.assignedAgentId && !t.assignedAgentName);
        if (unassignedWithId.length > 0) {
            const agentIds = Array.from(new Set(unassignedWithId.map((t) => String(t.assignedAgentId))));
            const agentDocs = await Agent_1.default.find({
                $or: [
                    { _id: { $in: agentIds.filter(id => mongoose_1.default.Types.ObjectId.isValid(id)).map(id => new mongoose_1.default.Types.ObjectId(id)) } },
                    { registrationId: { $in: agentIds } },
                    { agentId: { $in: agentIds } }
                ]
            }).select('_id name registrationId role').lean();
            const agentMap = new Map();
            agentDocs.forEach(a => {
                agentMap.set(String(a._id), a);
                if (a.registrationId)
                    agentMap.set(a.registrationId, a);
                if (a.agentId)
                    agentMap.set(a.agentId, a);
            });
            tasks.forEach((t) => {
                if (t.assignedAgentId && !t.assignedAgentName) {
                    const found = agentMap.get(String(t.assignedAgentId));
                    if (found) {
                        t.assignedAgentName = found.name;
                        if (!t.assignedAgentRole)
                            t.assignedAgentRole = found.role;
                    }
                }
            });
        }
        // Map permissions and dynamic flags
        const enrichedTasks = tasks.map((t) => {
            const now = new Date();
            const isPastDue = t.dueDate ? now > new Date(t.dueDate) : false;
            const isClosed = ['Approved', 'Completed', 'Rejected', 'Closed'].includes(t.status);
            const isOverdue = isPastDue && !isClosed;
            const isAssignedAgent = !t.assignedManagerId &&
                (String(t.assignedAgentId) === String(userCtx.id) ||
                    Boolean(userCtx.registrationId && String(t.assignedAgentId) === String(userCtx.registrationId)));
            const isInitiator = String(t.createdById) === String(userCtx.id);
            // Check admin territory authority
            let hasAdminAuthority = userCtx.isAdmin;
            if (hasAdminAuthority && userCtx.territory.state && t.state) {
                if (userCtx.territory.state.toLowerCase() !== t.state.toLowerCase())
                    hasAdminAuthority = false;
            }
            if (hasAdminAuthority && userCtx.level === 'district' && userCtx.territory.district && t.district) {
                if (userCtx.territory.district.toLowerCase() !== t.district.toLowerCase())
                    hasAdminAuthority = false;
            }
            if (hasAdminAuthority && userCtx.level === 'division' && userCtx.territory.division && t.division) {
                if (userCtx.territory.division.toLowerCase() !== t.division.toLowerCase())
                    hasAdminAuthority = false;
            }
            if (hasAdminAuthority && userCtx.level === 'pincode' && userCtx.territory.pincode && t.pincode) {
                if (userCtx.territory.pincode !== t.pincode)
                    hasAdminAuthority = false;
            }
            const canApproveRequest = hasAdminAuthority && t.status === 'Pending Admin Review';
            const canExecute = isAssignedAgent && ['Assigned', 'In Progress', 'Rework'].includes(t.status);
            const canSubmitEvidence = isAssignedAgent && ['In Progress', 'Rework', 'Assigned'].includes(t.status);
            const canReviewEvidence = hasAdminAuthority && t.status === 'Submitted for Review';
            const isHighPriority = (t.priority || '').toLowerCase() === 'high';
            const canRejectTask = isAssignedAgent && t.status === 'Assigned' && !isHighPriority;
            return {
                ...t,
                isOverdue,
                permissions: {
                    canApproveRequest,
                    canRejectRequest: canApproveRequest,
                    canAccept: isAssignedAgent && t.status === 'Assigned',
                    canRejectTask,
                    canSubmitEvidence,
                    canReviewEvidence,
                    isHighPriority,
                    isInitiator,
                    isAssignedAgent
                }
            };
        });
        return res.status(200).json({
            tasks: enrichedTasks,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            userScope: {
                role: userCtx.role,
                isAdmin: userCtx.isAdmin,
                level: userCtx.level,
                territory: userCtx.territory
            }
        });
    }
    catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while fetching tasks.' });
    }
};
exports.getTasks = getTasks;
// 3. GET /api/tasks/:id — Get Task Details with Complete Audit History
const getTaskById = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const { id } = req.params;
        let task = await findTaskDoc(id);
        if (task && typeof task.toObject === 'function') {
            task = task.toObject();
        }
        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }
        // In Agent Website, manager-assigned tasks must not be visible to agents
        if (userCtx.isAgent && task.assignedManagerId) {
            return res.status(403).json({ message: 'Forbidden: You are not authorized to view manager-assigned tasks.' });
        }
        // Territory authorization check for viewing
        if (userCtx.role.toLowerCase() !== 'super admin' && userCtx.role.toLowerCase() !== 'admin') {
            if (userCtx.territory.state && task.state) {
                if (userCtx.territory.state.toLowerCase() !== task.state.toLowerCase()) {
                    return res.status(403).json({ message: 'Forbidden: You are not authorized to view tasks outside your territory.' });
                }
            }
            if (userCtx.level === 'district' && userCtx.territory.district && task.district) {
                const cleanD = userCtx.territory.district.toLowerCase().replace(/\s+district$/i, '');
                const taskD = task.district.toLowerCase().replace(/\s+district$/i, '');
                if (cleanD !== taskD && !cleanD.includes(taskD) && !taskD.includes(cleanD)) {
                    return res.status(403).json({ message: 'Forbidden: You are not authorized to view tasks outside your district.' });
                }
            }
            if (userCtx.level === 'division' && userCtx.territory.division && task.division) {
                const cleanDiv = userCtx.territory.division.toLowerCase().replace(/\s+division$/i, '');
                const taskDiv = task.division.toLowerCase().replace(/\s+division$/i, '');
                if (cleanDiv !== taskDiv && !cleanDiv.includes(taskDiv) && !taskDiv.includes(cleanDiv)) {
                    return res.status(403).json({ message: 'Forbidden: You are not authorized to view tasks outside your division.' });
                }
            }
            if (userCtx.level === 'pincode') {
                const isAssigned = String(task.assignedAgentId) === String(userCtx.id);
                const isCreator = String(task.createdById) === String(userCtx.id);
                const isPinMatch = userCtx.territory.pincode ? task.pincode === userCtx.territory.pincode : true;
                if (!isPinMatch || (!isAssigned && !isCreator)) {
                    return res.status(403).json({ message: 'Forbidden: You are not authorized to view tasks outside your assigned pincode.' });
                }
            }
        }
        // Section 3: Resolve assigned agent name from Agent record if missing
        if (task.assignedAgentId && !task.assignedAgentName) {
            let agentDoc = null;
            if (mongoose_1.default.Types.ObjectId.isValid(task.assignedAgentId)) {
                agentDoc = await Agent_1.default.findById(task.assignedAgentId).select('name role').lean();
            }
            if (!agentDoc) {
                agentDoc = await Agent_1.default.findOne({
                    $or: [{ registrationId: task.assignedAgentId }, { agentId: task.assignedAgentId }]
                }).select('name role').lean();
            }
            if (agentDoc) {
                task.assignedAgentName = agentDoc.name;
                if (!task.assignedAgentRole)
                    task.assignedAgentRole = agentDoc.role;
            }
        }
        const now = new Date();
        const isPastDue = task.dueDate ? now > new Date(task.dueDate) : false;
        const isClosed = ['Approved', 'Completed', 'Rejected', 'Closed'].includes(task.status);
        const isOverdue = isPastDue && !isClosed;
        const isAssignedAgent = !task.assignedManagerId &&
            (String(task.assignedAgentId) === String(userCtx.id) ||
                Boolean(userCtx.registrationId && String(task.assignedAgentId) === String(userCtx.registrationId)));
        let hasAdminAuthority = userCtx.isAdmin;
        if (hasAdminAuthority && userCtx.territory.state && task.state) {
            if (userCtx.territory.state.toLowerCase() !== task.state.toLowerCase())
                hasAdminAuthority = false;
        }
        if (hasAdminAuthority && userCtx.level === 'district' && userCtx.territory.district && task.district) {
            if (userCtx.territory.district.toLowerCase() !== task.district.toLowerCase())
                hasAdminAuthority = false;
        }
        if (hasAdminAuthority && userCtx.level === 'division' && userCtx.territory.division && task.division) {
            if (userCtx.territory.division.toLowerCase() !== task.division.toLowerCase())
                hasAdminAuthority = false;
        }
        if (hasAdminAuthority && userCtx.level === 'pincode' && userCtx.territory.pincode && task.pincode) {
            if (userCtx.territory.pincode !== task.pincode)
                hasAdminAuthority = false;
        }
        const isHighPriority = (task.priority || '').toLowerCase() === 'high';
        return res.status(200).json({
            task: {
                ...task,
                isOverdue,
                permissions: {
                    canApproveRequest: hasAdminAuthority && task.status === 'Pending Admin Review',
                    canRejectRequest: hasAdminAuthority && task.status === 'Pending Admin Review',
                    canAccept: isAssignedAgent && task.status === 'Assigned',
                    canRejectTask: isAssignedAgent && task.status === 'Assigned' && !isHighPriority,
                    canSubmitEvidence: isAssignedAgent && ['In Progress', 'Rework', 'Assigned'].includes(task.status),
                    canReviewEvidence: hasAdminAuthority && task.status === 'Submitted for Review',
                    isHighPriority,
                    isAssignedAgent,
                    isInitiator: String(task.createdById) === String(userCtx.id)
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching task details:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while fetching task details.' });
    }
};
exports.getTaskById = getTaskById;
// 4. POST /api/tasks/:id/approve-request — Admin Approves Request & Assigns Agent
const approveAndAssignRequest = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx || !userCtx.isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Only authorized Admins can approve task requests.' });
        }
        const { id } = req.params;
        const { assignedAgentId } = req.body;
        if (!assignedAgentId) {
            return res.status(400).json({ message: 'assignedAgentId is required to approve and assign a task.' });
        }
        let task = await findTaskDoc(id);
        if (!task) {
            return res.status(404).json({ message: 'Task request not found.' });
        }
        if (task.status !== 'Pending Admin Review') {
            return res.status(400).json({
                message: `Invalid action: Task is currently in "${task.status}" state, cannot be approved.`
            });
        }
        // Territory check for Admin
        if (userCtx.territory.state && task.state && userCtx.territory.state.toLowerCase() !== task.state.toLowerCase()) {
            return res.status(403).json({ message: 'Forbidden: Cannot approve tasks outside your authorized state.' });
        }
        if (userCtx.level === 'district' && userCtx.territory.district && task.district) {
            if (userCtx.territory.district.toLowerCase() !== task.district.toLowerCase()) {
                return res.status(403).json({ message: 'Forbidden: Cannot approve tasks outside your authorized district.' });
            }
        }
        if (userCtx.level === 'division' && userCtx.territory.division && task.division) {
            if (userCtx.territory.division.toLowerCase() !== task.division.toLowerCase()) {
                return res.status(403).json({ message: 'Forbidden: Cannot approve tasks outside your authorized division.' });
            }
        }
        if (userCtx.level === 'pincode' && userCtx.territory.pincode && task.pincode) {
            if (userCtx.territory.pincode !== task.pincode) {
                return res.status(403).json({ message: 'Forbidden: Cannot approve tasks outside your authorized pincode.' });
            }
        }
        // Verify assigned agent
        let targetAgent = null;
        if (mongoose_1.default.Types.ObjectId.isValid(assignedAgentId)) {
            targetAgent = await Agent_1.default.findById(assignedAgentId).lean();
        }
        if (!targetAgent) {
            targetAgent = await Agent_1.default.findOne({
                $or: [{ agentId: assignedAgentId }, { registrationId: assignedAgentId }, { _id: assignedAgentId }]
            }).lean();
        }
        if (!targetAgent) {
            return res.status(404).json({ message: 'Selected agent was not found.' });
        }
        const agentKyc = (targetAgent.kycStatus || '').toLowerCase();
        const agentStatus = (targetAgent.status || '').toLowerCase();
        const isActive = agentKyc === 'approved' || agentStatus === 'active' || agentStatus === 'approved';
        if (!isActive) {
            return res.status(400).json({ message: `Agent ${targetAgent.name} is not active or approved.` });
        }
        const agentRole = (targetAgent.role || targetAgent.level || '').toLowerCase();
        if (agentRole !== task.hierarchyLevel) {
            return res.status(400).json({
                message: `Hierarchy level mismatch: Task is for "${task.hierarchyLevel}" level, but selected agent is at "${agentRole}".`
            });
        }
        // Apply updates
        task.status = 'Assigned';
        task.requestStatus = 'approved';
        task.receivingAdminId = userCtx.id;
        task.receivingAdminName = userCtx.name;
        task.receivingAdminRole = userCtx.role;
        task.reviewedAt = new Date();
        task.reviewedBy = userCtx.name;
        task.assignedAgentId = targetAgent._id;
        task.assignedAgentName = targetAgent.name;
        task.assignedAgentRole = targetAgent.role;
        task.assignedDate = new Date();
        task.history = task.history || [];
        task.history.push({
            action: 'REQUEST_APPROVED_AND_ASSIGNED',
            performedBy: userCtx.name,
            performedById: userCtx.id,
            performedRole: userCtx.role,
            timestamp: new Date(),
            details: {
                assignedAgentName: targetAgent.name,
                assignedAgentId: targetAgent._id,
                level: task.hierarchyLevel
            }
        });
        await task.save();
        // Trigger persistent notifications for task assignment
        notification_service_1.default.notifyTaskAssignment(task, targetAgent._id).catch((err) => {
            console.error('Failed to notify task assignment:', err);
        });
        if (task.createdById && String(task.createdById) !== String(targetAgent._id)) {
            notification_service_1.default.notifyTaskStatusChange(task, task.createdById, 'approved').catch(() => { });
        }
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_UPDATED',
            entity: 'task',
            entityId: task._id.toString(),
            action: 'approved_and_assigned',
            scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
            data: task
        }).catch(() => { });
        return res.status(200).json({
            message: `Task request approved and successfully assigned to ${targetAgent.name}.`,
            task
        });
    }
    catch (error) {
        console.error('Error approving task request:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while approving task request.' });
    }
};
exports.approveAndAssignRequest = approveAndAssignRequest;
// 5. POST /api/tasks/:id/reject-request — Admin Rejects Task Request
const rejectRequest = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx || !userCtx.isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Only authorized Admins can reject task requests.' });
        }
        const { id } = req.params;
        const { rejectionReason } = req.body;
        if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length < 3) {
            return res.status(400).json({ message: 'A valid rejection reason (minimum 3 characters) is mandatory.' });
        }
        let task = await findTaskDoc(id);
        if (!task) {
            return res.status(404).json({ message: 'Task request not found.' });
        }
        if (task.status !== 'Pending Admin Review') {
            return res.status(400).json({
                message: `Invalid action: Task is in "${task.status}" state, cannot be rejected as a request.`
            });
        }
        task.status = 'Rejected';
        task.requestStatus = 'rejected';
        task.rejectionReason = rejectionReason.trim();
        task.rejectionDetails = {
            reason: rejectionReason.trim(),
            rejectedBy: userCtx.name,
            rejectedById: userCtx.id,
            rejectedAt: new Date(),
            rejectionType: 'admin_rejected_request'
        };
        task.history = task.history || [];
        task.history.push({
            action: 'REQUEST_REJECTED',
            performedBy: userCtx.name,
            performedById: userCtx.id,
            performedRole: userCtx.role,
            timestamp: new Date(),
            details: { reason: rejectionReason.trim() }
        });
        await task.save();
        if (task.createdById) {
            notification_service_1.default.notifyTaskStatusChange(task, task.createdById, 'rejected').catch(() => { });
        }
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_UPDATED',
            entity: 'task',
            entityId: task._id.toString(),
            action: 'request_rejected',
            scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
            data: task
        }).catch(() => { });
        return res.status(200).json({
            message: 'Task request rejected and closed.',
            task
        });
    }
    catch (error) {
        console.error('Error rejecting task request:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while rejecting task request.' });
    }
};
exports.rejectRequest = rejectRequest;
// 6. POST /api/tasks/:id/accept — Assigned Agent Accepts Task
const acceptTask = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const { id } = req.params;
        let task = await findTaskDoc(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }
        const isAssigned = !task.assignedManagerId &&
            (String(task.assignedAgentId) === String(userCtx.id) ||
                Boolean(userCtx.registrationId && String(task.assignedAgentId) === String(userCtx.registrationId)));
        if (!isAssigned) {
            return res.status(403).json({ message: 'Forbidden: Only the assigned agent can accept this task.' });
        }
        if (task.status !== 'Assigned') {
            return res.status(400).json({
                message: `Task cannot be accepted from current status "${task.status}". Must be "Assigned".`
            });
        }
        task.status = 'In Progress';
        task.acceptedAt = new Date();
        task.acceptedBy = userCtx.name;
        task.acceptedById = userCtx.id;
        task.startedAt = new Date();
        task.startedBy = userCtx.name;
        task.startedById = userCtx.id;
        task.history = task.history || [];
        task.history.push({
            action: 'TASK_ACCEPTED',
            performedBy: userCtx.name,
            performedById: userCtx.id,
            performedRole: userCtx.role,
            timestamp: new Date()
        });
        await task.save();
        await cache_service_1.cacheService.delByPrefix('dashboard:').catch(() => { });
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_UPDATED',
            entity: 'task',
            entityId: task._id.toString(),
            action: 'accepted',
            scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
            data: task
        }).catch(() => { });
        return res.status(200).json({
            message: 'Task accepted and moved to In Progress.',
            task
        });
    }
    catch (error) {
        console.error('Error accepting task:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while accepting task.' });
    }
};
exports.acceptTask = acceptTask;
// 7. POST /api/tasks/:id/reject-task — Assigned Agent Rejects Task (Medium / Low only)
const rejectTask = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const { id } = req.params;
        const { rejectionReason } = req.body;
        let task = await findTaskDoc(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }
        const isAssigned = !task.assignedManagerId &&
            (String(task.assignedAgentId) === String(userCtx.id) ||
                Boolean(userCtx.registrationId && String(task.assignedAgentId) === String(userCtx.registrationId)));
        if (!isAssigned) {
            return res.status(403).json({ message: 'Forbidden: Only the assigned agent can reject this task.' });
        }
        // MANDATORY TASK RULE (Section 4): High priority tasks CANNOT be rejected
        if ((task.priority || '').toLowerCase() === 'high') {
            return res.status(400).json({
                message: 'High-priority tasks are mandatory and cannot be rejected by the assigned agent.'
            });
        }
        if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length < 3) {
            return res.status(400).json({ message: 'A mandatory rejection reason (minimum 3 characters) is required.' });
        }
        if (task.status !== 'Assigned') {
            return res.status(400).json({
                message: `Task cannot be rejected from status "${task.status}". Only freshly assigned tasks can be rejected.`
            });
        }
        task.status = 'Rejected';
        task.rejectionReason = rejectionReason.trim();
        task.rejectionDetails = {
            reason: rejectionReason.trim(),
            rejectedBy: userCtx.name,
            rejectedById: userCtx.id,
            rejectedAt: new Date(),
            rejectionType: 'agent_rejected_task'
        };
        task.history = task.history || [];
        task.history.push({
            action: 'TASK_REJECTED_BY_AGENT',
            performedBy: userCtx.name,
            performedById: userCtx.id,
            performedRole: userCtx.role,
            timestamp: new Date(),
            details: { reason: rejectionReason.trim(), priority: task.priority }
        });
        await task.save();
        if (task.createdById) {
            notification_service_1.default.notifyTaskStatusChange(task, task.createdById, 'rejected').catch(() => { });
        }
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_UPDATED',
            entity: 'task',
            entityId: task._id.toString(),
            action: 'task_rejected_by_agent',
            scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
            data: task
        }).catch(() => { });
        return res.status(200).json({
            message: 'Task rejected and assignment closed.',
            task
        });
    }
    catch (error) {
        console.error('Error rejecting task by agent:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while rejecting task.' });
    }
};
exports.rejectTask = rejectTask;
// 8. POST /api/tasks/:id/submit-evidence — Agent Submits Completion Evidence
const submitEvidence = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const { id } = req.params;
        const { remarks, photos = [], voiceNote = '' } = req.body;
        if (!remarks || typeof remarks !== 'string' || remarks.trim().length < 3) {
            return res.status(400).json({ message: 'Completion remarks (minimum 3 characters) are required.' });
        }
        let task = await findTaskDoc(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }
        const isAssigned = !task.assignedManagerId &&
            (String(task.assignedAgentId) === String(userCtx.id) ||
                Boolean(userCtx.registrationId && String(task.assignedAgentId) === String(userCtx.registrationId)));
        if (!isAssigned) {
            return res.status(403).json({ message: 'Forbidden: Only the assigned agent can submit completion evidence.' });
        }
        if (!['In Progress', 'Rework', 'Assigned'].includes(task.status)) {
            return res.status(400).json({
                message: `Evidence cannot be submitted when task is in "${task.status}" state.`
            });
        }
        const cleanPhotos = Array.isArray(photos) ? photos : (photos ? [photos] : []);
        task.status = 'Submitted for Review';
        task.photos = cleanPhotos;
        task.voiceNote = voiceNote;
        task.completionDetails = {
            remarks: remarks.trim(),
            photos: cleanPhotos,
            voiceNote: voiceNote || '',
            submittedAt: new Date(),
            submittedBy: userCtx.name,
            workCompleted: remarks.trim(),
            resolutionDetails: remarks.trim(),
            completionPhotos: cleanPhotos
        };
        task.history = task.history || [];
        task.history.push({
            action: 'EVIDENCE_SUBMITTED',
            performedBy: userCtx.name,
            performedById: userCtx.id,
            performedRole: userCtx.role,
            timestamp: new Date(),
            details: {
                photoCount: cleanPhotos.length,
                hasVoiceNote: Boolean(voiceNote),
                remarks: remarks.trim()
            }
        });
        await task.save();
        await cache_service_1.cacheService.delByPrefix('dashboard:').catch(() => { });
        (0, eventBus_1.publishEntityEvent)({
            event: 'ENTITY_UPDATED',
            entity: 'task',
            entityId: task._id.toString(),
            action: 'submitted_for_review',
            scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
            data: task
        }).catch(() => { });
        return res.status(200).json({
            message: 'Completion evidence submitted successfully. Pending Admin review.',
            task
        });
    }
    catch (error) {
        console.error('Error submitting evidence:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while submitting evidence.' });
    }
};
exports.submitEvidence = submitEvidence;
// 9. POST /api/tasks/:id/review-evidence — Admin Approves Completion or Requests Rework
const reviewEvidence = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx || !userCtx.isAdmin) {
            return res.status(403).json({ message: 'Forbidden: Only authorized Admins can review task submissions.' });
        }
        const { id } = req.params;
        const { decision, notes = '' } = req.body;
        if (!decision || !['approve', 'rework'].includes(decision)) {
            return res.status(400).json({ message: 'Invalid decision. Must be "approve" or "rework".' });
        }
        let task = await findTaskDoc(id);
        if (!task) {
            return res.status(404).json({ message: 'Task not found.' });
        }
        if (task.status !== 'Submitted for Review') {
            return res.status(400).json({
                message: `Task is currently in "${task.status}" state, cannot review evidence.`
            });
        }
        // Territory authorization check
        if (userCtx.territory.state && task.state && userCtx.territory.state.toLowerCase() !== task.state.toLowerCase()) {
            return res.status(403).json({ message: 'Forbidden: Cannot review tasks outside your authorized state.' });
        }
        if (decision === 'approve') {
            task.status = 'Approved';
            if (!task.completionDetails) {
                task.completionDetails = {};
            }
            task.completionDetails.completedAt = new Date();
            task.completionDetails.completedBy = userCtx.name;
            task.history = task.history || [];
            task.history.push({
                action: 'SUBMISSION_APPROVED',
                performedBy: userCtx.name,
                performedById: userCtx.id,
                performedRole: userCtx.role,
                timestamp: new Date(),
                details: { notes }
            });
            await task.save();
            await cache_service_1.cacheService.delByPrefix('dashboard:').catch(() => { });
            if (task.assignedAgentId) {
                notification_service_1.default.notifyTaskStatusChange(task, task.assignedAgentId, 'approved').catch(() => { });
            }
            (0, eventBus_1.publishEntityEvent)({
                event: 'ENTITY_UPDATED',
                entity: 'task',
                entityId: task._id.toString(),
                action: 'completed',
                scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
                data: task
            }).catch(() => { });
            return res.status(200).json({
                message: 'Task submission approved! Task is marked as Approved/Completed.',
                task
            });
        }
        if (decision === 'rework') {
            if (!notes || typeof notes !== 'string' || notes.trim().length < 3) {
                return res.status(400).json({ message: 'Rework feedback notes (minimum 3 characters) are mandatory.' });
            }
            // Preserve previous submission history
            const previousSubmissions = task.reworkDetails?.previousSubmissions || [];
            if (task.completionDetails) {
                previousSubmissions.push({
                    remarks: task.completionDetails.remarks,
                    photos: task.completionDetails.photos || task.photos || [],
                    voiceNote: task.completionDetails.voiceNote || task.voiceNote || '',
                    submittedAt: task.completionDetails.submittedAt || new Date(),
                    submittedBy: task.completionDetails.submittedBy || task.assignedAgentName,
                    reviewNotes: notes.trim()
                });
            }
            task.status = 'Rework';
            task.reworkDetails = {
                reason: notes.trim(),
                reworkRemarks: notes.trim(),
                requestedBy: userCtx.name,
                requestedById: userCtx.id,
                requestedAt: new Date(),
                previousSubmissions
            };
            task.history = task.history || [];
            task.history.push({
                action: 'REWORK_REQUESTED',
                performedBy: userCtx.name,
                performedById: userCtx.id,
                performedRole: userCtx.role,
                timestamp: new Date(),
                details: { reworkNotes: notes.trim(), cycle: previousSubmissions.length }
            });
            await task.save();
            if (task.assignedAgentId) {
                notification_service_1.default.notifyTaskStatusChange(task, task.assignedAgentId, 'rework').catch(() => { });
            }
            (0, eventBus_1.publishEntityEvent)({
                event: 'ENTITY_UPDATED',
                entity: 'task',
                entityId: task._id.toString(),
                action: 'rework_requested',
                scope: { state: task.state, district: task.district, division: task.division, pincode: task.pincode },
                data: task
            }).catch(() => { });
            return res.status(200).json({
                message: 'Rework requested. The task has been sent back to the assigned agent with feedback.',
                task
            });
        }
    }
    catch (error) {
        console.error('Error reviewing evidence:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while reviewing evidence.' });
    }
};
exports.reviewEvidence = reviewEvidence;
// 10. GET /api/tasks/eligible-agents — List Eligible Active Agents for Task Assignment
const getEligibleAgents = async (req, res) => {
    try {
        const userCtx = await resolveUserContext(req);
        if (!userCtx) {
            return res.status(401).json({ message: 'Unauthorized: User profile not found' });
        }
        const { level, state, district, division, pincode } = req.query;
        const query = {
            $or: [
                { kycStatus: 'approved' },
                { status: { $in: ['Active', 'active', 'approved'] } }
            ]
        };
        if (level && typeof level === 'string') {
            query.role = level.toLowerCase();
        }
        if (state && typeof state === 'string' && state.trim()) {
            query['territory.state'] = new RegExp(`^${state.trim()}$`, 'i');
        }
        if (district && typeof district === 'string' && district.trim()) {
            query['territory.district'] = new RegExp(`^${district.trim()}$`, 'i');
        }
        if (division && typeof division === 'string' && division.trim()) {
            query['territory.division'] = new RegExp(`^${division.trim()}$`, 'i');
        }
        if (pincode && typeof pincode === 'string' && pincode.trim()) {
            query['territory.pincode'] = pincode.trim();
        }
        const agents = await Agent_1.default.find(query)
            .select('_id name email phone role level territory assignedTerritory status kycStatus')
            .limit(50)
            .lean();
        return res.status(200).json({
            agents: agents.map(a => ({
                _id: a._id,
                name: a.name,
                email: a.email,
                phone: a.phone,
                role: a.role || a.level,
                territory: a.territory || a.assignedTerritory,
                status: a.status
            }))
        });
    }
    catch (error) {
        console.error('Error fetching eligible agents:', error);
        return res.status(500).json({ message: error.message || 'Internal server error while fetching agents.' });
    }
};
exports.getEligibleAgents = getEligibleAgents;
//# sourceMappingURL=task.controller.js.map