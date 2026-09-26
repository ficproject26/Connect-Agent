import { Request, Response } from 'express';
import { z } from 'zod';
import Ticket from '../models/Ticket';
import Agent from '../models/Agent';
import { getAgentTerritoryScope } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';

// Simple unique ticket ID generator — format TKT-XXXXXX
const generateTicketId = () =>
  `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str: string) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');
const containsRegex = (str: string) => new RegExp(escapeRegex(str.trim()), 'i');

const createTicketSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Issue details are required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  vendorName: z.string().optional(),
  storeName: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  division: z.string().optional(),
  pincode: z.string().optional(),
  territory: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
  assignedAgent: z.string().optional()
});

// GET /api/tickets
export const getTickets = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentRole = (req as any).agent?.role;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '50', status, priority, mine } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, any> = {};
    const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';

    if (mine === 'true') {
      filter.creator = agentId;
    } else if (!isAdminOrExecutive) {
      const scope = await getAgentTerritoryScope(agentId);
      const conditions: any[] = [{ creator: agentId }, { assignedTo: agentId }];

      if (scope) {
        if (scope.role === 'state' && scope.state) {
          conditions.push(
            { state: exactRegex(scope.state) },
            { territory: containsRegex(scope.state) }
          );
        } else if (scope.role === 'district' && scope.district) {
          conditions.push(
            { district: exactRegex(scope.district) },
            { territory: containsRegex(scope.district) }
          );
        } else if (scope.role === 'division' && scope.division) {
          conditions.push(
            { division: containsRegex(scope.division) },
            { territory: containsRegex(scope.division) }
          );
        } else if (scope.role === 'pincode' && scope.pincode) {
          conditions.push(
            { pincode: scope.pincode },
            { territory: containsRegex(scope.pincode) }
          );
        }
      }

      filter.$or = conditions;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
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
  } catch (error) {
    console.error('Get tickets error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/tickets/:id
export const getTicketById = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentRole = (req as any).agent?.role;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
    const filter: any = { _id: req.params.id };
    if (!isAdminOrExecutive) {
      filter.$or = [{ creator: agentId }, { assignedTo: agentId }];
    }

    const ticket = await Ticket.findOne(filter)
      .populate('creator', 'name email role phone')
      .populate('assignedTo', 'name email role phone')
      .lean();

    if (!ticket) return res.status(404).json({ message: 'Ticket not found or access denied' });
    return res.status(200).json({ ticket });
  } catch (error) {
    console.error('Get ticket by id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/tickets
export const createTicket = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = createTicketSchema.parse(req.body);

    // Retrieve agent profile and verify territory jurisdiction
    const scope = await getAgentTerritoryScope(agentId);
    let agent = await Agent.findById(agentId);
    const agentRole = scope?.role || (req as any).agent?.role || agent?.role || 'pincode';
    const agentName = agent?.name || (req as any).agent?.name || 'Agent';

    const state = (data.state || scope?.state || agent?.assignedTerritory?.state || agent?.territory?.state || '').trim();
    const district = (data.district || scope?.district || agent?.assignedTerritory?.district || agent?.territory?.district || '').trim();
    const division = (data.division || scope?.division || agent?.assignedTerritory?.division || agent?.territory?.division || '').trim();
    const pincode = (data.pincode || scope?.pincode || agent?.assignedTerritory?.pincode || agent?.territory?.pincode || '').trim();

    // Backend territory authorization validation
    if (scope) {
      if (scope.role === 'state' && scope.state && state && state.toLowerCase() !== scope.state.toLowerCase()) {
        return res.status(403).json({ message: `State Agent is restricted to State ${scope.state}. Requested: ${state}` });
      }
      if (scope.role === 'district' && scope.district && district && district.toLowerCase() !== scope.district.toLowerCase()) {
        return res.status(403).json({ message: `District Agent is restricted to District ${scope.district}. Requested: ${district}` });
      }
      if (scope.role === 'division' && scope.division && division && !division.toLowerCase().includes(scope.division.toLowerCase())) {
        return res.status(403).json({ message: `Division Agent is restricted to Division ${scope.division}. Requested: ${division}` });
      }
      if (scope.role === 'pincode' && scope.pincode && pincode && pincode !== scope.pincode) {
        return res.status(403).json({ message: `Pincode Agent is restricted to Pincode ${scope.pincode}. Requested: ${pincode}` });
      }
    }

    const territory = data.territory || [district, division, pincode].filter(Boolean).join(' → ') || (state ? `${state} Scope` : '');
    const vendorName = data.vendorName || data.storeName || '';
    const storeName = data.storeName || data.vendorName || '';

    const ticket = new Ticket({
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
    await cacheService.delByPrefix('dashboard:');

    return res.status(201).json({ message: 'Support ticket created successfully', ticket });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const errMsgs = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ message: `Validation failed: ${errMsgs}`, errors: error.errors });
    }
    console.error('Create ticket error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/tickets/:id/status
export const updateTicketStatus = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentRole = (req as any).agent?.role;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { status, resolutionDetails, remarks, assignedAgent } = req.body;
    const validStatuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated_to_admin'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
    const filter: any = { _id: req.params.id };
    if (!isAdminOrExecutive) {
      filter.$or = [{ creator: agentId }, { assignedTo: agentId }];
    }

    const ticket = await Ticket.findOne(filter);

    if (!ticket) return res.status(404).json({ message: 'Ticket not found or access denied' });

    if (status) ticket.status = status;
    if (resolutionDetails) ticket.resolutionDetails = resolutionDetails;
    if (remarks) ticket.resolutionDetails = ticket.resolutionDetails ? `${ticket.resolutionDetails} | ${remarks}` : remarks;
    if (assignedAgent) ticket.assignedAgent = assignedAgent;
    ticket.updatedAt = new Date();
    await ticket.save();

    await ticket.populate([
      { path: 'creator', select: 'name email role phone' },
      { path: 'assignedTo', select: 'name email role phone' }
    ]);

    // Invalidate dashboard stats cache
    await cacheService.delByPrefix('dashboard:');

    return res.status(200).json({ message: 'Ticket status updated', ticket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

