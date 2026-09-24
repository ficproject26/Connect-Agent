"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.createTicket = exports.getTicketById = exports.getTickets = void 0;
const zod_1 = require("zod");
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Agent_1 = __importDefault(require("../models/Agent"));
const territoryScope_1 = require("../utils/territoryScope");
const cache_service_1 = require("../services/cache.service");
// Simple unique ticket ID generator — format TKT-XXXXXX
const generateTicketId = () => `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');
const containsRegex = (str) => new RegExp(escapeRegex(str.trim()), 'i');
const createTicketSchema = zod_1.z.object({
    category: zod_1.z.string().min(1, 'Category is required'),
    description: zod_1.z.string().min(1, 'Issue details are required'),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
    vendorName: zod_1.z.string().optional(),
    storeName: zod_1.z.string().optional(),
    state: zod_1.z.string().optional(),
    district: zod_1.z.string().optional(),
    division: zod_1.z.string().optional(),
    pincode: zod_1.z.string().optional(),
    territory: zod_1.z.string().optional(),
    attachmentName: zod_1.z.string().optional(),
    attachmentUrl: zod_1.z.string().optional(),
    assignedAgent: zod_1.z.string().optional()
});
// GET /api/tickets
const getTickets = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const agentRole = req.agent?.role;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '50', status, priority, mine } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = {};
        const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
        if (mine === 'true') {
            filter.creator = agentId;
        }
        else if (!isAdminOrExecutive) {
            const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
            const conditions = [{ creator: agentId }, { assignedTo: agentId }];
            if (scope) {
                if (scope.role === 'state' && scope.state) {
                    conditions.push({ state: exactRegex(scope.state) }, { territory: containsRegex(scope.state) });
                }
                else if (scope.role === 'district' && scope.district) {
                    conditions.push({ district: exactRegex(scope.district) }, { territory: containsRegex(scope.district) });
                }
                else if (scope.role === 'division' && scope.division) {
                    conditions.push({ division: containsRegex(scope.division) }, { territory: containsRegex(scope.division) });
                }
                else if (scope.role === 'pincode' && scope.pincode) {
                    conditions.push({ pincode: scope.pincode }, { territory: containsRegex(scope.pincode) });
                }
            }
            filter.$or = conditions;
        }
        if (status)
            filter.status = status;
        if (priority)
            filter.priority = priority;
        const total = await Ticket_1.default.countDocuments(filter);
        const tickets = await Ticket_1.default.find(filter)
            .select('ticketId creator creatorRole creatorName assignedTo assignedAgent vendorName storeName state district division pincode territory category description priority status attachmentName attachmentUrl resolutionDetails createdAt updatedAt')
            .populate('creator', 'name email role phone')
            .populate('assignedTo', 'name email role phone')
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        return res.status(200).json({
            tickets,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get tickets error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTickets = getTickets;
// GET /api/tickets/:id
const getTicketById = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const agentRole = req.agent?.role;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
        const filter = { _id: req.params.id };
        if (!isAdminOrExecutive) {
            filter.$or = [{ creator: agentId }, { assignedTo: agentId }];
        }
        const ticket = await Ticket_1.default.findOne(filter)
            .populate('creator', 'name email role phone')
            .populate('assignedTo', 'name email role phone')
            .lean();
        if (!ticket)
            return res.status(404).json({ message: 'Ticket not found or access denied' });
        return res.status(200).json({ ticket });
    }
    catch (error) {
        console.error('Get ticket by id error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getTicketById = getTicketById;
// POST /api/tickets
const createTicket = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const data = createTicketSchema.parse(req.body);
        // Retrieve agent profile for fallback identity & territory information
        let agent = await Agent_1.default.findById(agentId);
        const agentRole = req.agent?.role || agent?.role || 'pincode';
        const agentName = agent?.name || req.agent?.name || 'Agent';
        const state = (data.state || agent?.territory?.state || '').trim();
        const district = (data.district || agent?.territory?.district || '').trim();
        const division = (data.division || agent?.territory?.division || '').trim();
        const pincode = (data.pincode || agent?.territory?.pincode || '').trim();
        const territory = data.territory || [district, division, pincode].filter(Boolean).join(' → ') || (state ? `${state} Scope` : '');
        const vendorName = data.vendorName || data.storeName || '';
        const storeName = data.storeName || data.vendorName || '';
        const ticket = new Ticket_1.default({
            ticketId: generateTicketId(),
            creator: agentId,
            creatorRole: agentRole,
            creatorName: agentName,
            category: data.category,
            description: data.description,
            priority: data.priority ?? 'medium',
            status: 'open',
            state,
            district,
            division,
            pincode,
            territory,
            vendorName,
            storeName,
            attachmentName: data.attachmentName,
            attachmentUrl: data.attachmentUrl,
            assignedAgent: data.assignedAgent
        });
        await ticket.save();
        await ticket.populate('creator', 'name email role phone');
        // Invalidate dashboard stats cache
        await cache_service_1.cacheService.delByPrefix('dashboard:');
        return res.status(201).json({ message: 'Support ticket created successfully', ticket });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            const errMsgs = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return res.status(400).json({ message: `Validation failed: ${errMsgs}`, errors: error.errors });
        }
        console.error('Create ticket error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createTicket = createTicket;
// PATCH /api/tickets/:id/status
const updateTicketStatus = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const agentRole = req.agent?.role;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { status, resolutionDetails, remarks, assignedAgent } = req.body;
        const validStatuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated_to_admin'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
        }
        const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
        const filter = { _id: req.params.id };
        if (!isAdminOrExecutive) {
            filter.$or = [{ creator: agentId }, { assignedTo: agentId }];
        }
        const ticket = await Ticket_1.default.findOne(filter);
        if (!ticket)
            return res.status(404).json({ message: 'Ticket not found or access denied' });
        if (status)
            ticket.status = status;
        if (resolutionDetails)
            ticket.resolutionDetails = resolutionDetails;
        if (remarks)
            ticket.resolutionDetails = ticket.resolutionDetails ? `${ticket.resolutionDetails} | ${remarks}` : remarks;
        if (assignedAgent)
            ticket.assignedAgent = assignedAgent;
        ticket.updatedAt = new Date();
        await ticket.save();
        await ticket.populate([
            { path: 'creator', select: 'name email role phone' },
            { path: 'assignedTo', select: 'name email role phone' }
        ]);
        // Invalidate dashboard stats cache
        await cache_service_1.cacheService.delByPrefix('dashboard:');
        return res.status(200).json({ message: 'Ticket status updated', ticket });
    }
    catch (error) {
        console.error('Update ticket status error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateTicketStatus = updateTicketStatus;
//# sourceMappingURL=ticket.controller.js.map