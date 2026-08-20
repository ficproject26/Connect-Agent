"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAssignmentStatus = exports.getMyAssignments = exports.assignTarget = exports.getSubordinates = exports.allocateTarget = exports.createTarget = exports.getTargets = void 0;
const zod_1 = require("zod");
const Target_1 = __importDefault(require("../models/Target"));
const TargetAssignment_1 = __importDefault(require("../models/TargetAssignment"));
const Agent_1 = __importDefault(require("../models/Agent"));
const Notification_1 = __importDefault(require("../models/Notification"));
const createTargetSchema = zod_1.z.object({
    title: zod_1.z.string().min(2, 'Title required'),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
    targetValue: zod_1.z.number().positive('Target value must be positive')
});
const assignTargetSchema = zod_1.z.object({
    assignedTo: zod_1.z.string().min(1, 'assignedTo agent ID required'),
    dueDate: zod_1.z.string().min(1, 'Due date required')
});
const allocateTargetSchema = zod_1.z.object({
    assignedTo: zod_1.z.string().optional(),
    divisionName: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily'),
    targetValue: zod_1.z.number().positive('Target value must be positive'),
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
            .limit(limitNum);
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
        let targetAgentId = data.assignedTo;
        let recipientName = data.divisionName || 'Division Agent';
        if (!targetAgentId && data.divisionName) {
            const matchedAgent = await Agent_1.default.findOne({
                $or: [
                    { name: new RegExp(data.divisionName, 'i') },
                    { 'territory.name': new RegExp(data.divisionName, 'i') }
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
        }
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
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const currentAgent = await Agent_1.default.findById(agentId);
        const userRole = currentAgent?.role || req.agent?.role || 'district';
        const subordinateQuery = {};
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
            subordinateQuery.role = 'pincode';
        }
        const subordinates = await Agent_1.default.find(subordinateQuery)
            .select('_id name role territory email phone')
            .lean();
        return res.status(200).json({ subordinates });
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
// GET /api/targets/assignments/mine — list assignments for the current agent
const getMyAssignments = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '20', status } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = { assignedTo: agentId };
        if (status)
            filter.status = status;
        const total = await TargetAssignment_1.default.countDocuments(filter);
        const assignments = await TargetAssignment_1.default.find(filter)
            .populate('target', 'title description type targetValue')
            .populate('assignedBy', 'name email role')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
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
        const validStatuses = ['assigned', 'accepted', 'in_progress', 'completed', 'pending', 'overdue'];
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
        return res.status(200).json({ message: 'Assignment status updated', assignment });
    }
    catch (error) {
        console.error('Update assignment status error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateAssignmentStatus = updateAssignmentStatus;
//# sourceMappingURL=target.controller.js.map