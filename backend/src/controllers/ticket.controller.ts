import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket';
import Agent from '../models/Agent';
import { getAgentTerritoryScope } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';
import { publishEntityEvent } from '../realtime/eventBus';

// Simple unique ticket ID generator — format TKT-XXXXXX
const generateTicketId = () =>
  `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str: string) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');
const containsRegex = (str: string) => new RegExp(escapeRegex(str.trim()), 'i');

/**
 * Resolve the authorized responsible agent for a given territory (Pincode -> Division -> District)
 */
async function resolveResponsibleAgent(pincode?: string, division?: string, district?: string, state?: string) {
  const db = mongoose.connection.db;

  // 1. Try to find approved Pincode Agent matching pincode
  if (pincode && pincode.trim()) {
    const cleanPin = pincode.trim();
    // Check Agent collection
    const pinAgent = await Agent.findOne({
      role: 'pincode',
      $or: [
        { 'assignedTerritory.pincode': cleanPin },
        { 'territory.pincode': cleanPin },
        { pincode: cleanPin },
        { assignedPincode: cleanPin }
      ],
      kycStatus: { $regex: /^(approved|verified)$/i }
    }).select('_id name email role phone registrationId assignedTerritory territory').lean();

    if (pinAgent) return pinAgent;

    // Check users collection
    if (db) {
      const pinUser = await db.collection('users').findOne({
        $and: [
          { $or: [{ role: /pincode/i }, { level: /pincode/i }, { role: 'agent', level: 'pincode' }] },
          {
            $or: [
              { 'assignedTerritory.pincode': cleanPin },
              { 'territory.pincode': cleanPin },
              { pincode: cleanPin },
              { assignedPincode: cleanPin }
            ]
          },
          {
            $or: [
              { kycStatus: { $regex: /^(approved|verified)$/i } },
              { status: { $regex: /^(approved|active)$/i } },
              { isApproved: true }
            ]
          }
        ]
      });
      if (pinUser) return pinUser;
    }
  }

  // 2. Try to find Division Agent matching division
  if (division && division.trim() && db) {
    const cleanDiv = division.toLowerCase().replace(/division|manager/g, '').trim();
    const divUser = await db.collection('users').findOne({
      $and: [
        { $or: [{ role: /division/i }, { level: /division/i }, { role: 'agent', level: 'division' }] },
        {
          $or: [
            { 'assignedTerritory.division': new RegExp(cleanDiv, 'i') },
            { 'territory.division': new RegExp(cleanDiv, 'i') },
            { division: new RegExp(cleanDiv, 'i') },
            { assignedDivision: new RegExp(cleanDiv, 'i') }
          ]
        },
        {
          $or: [
            { kycStatus: { $regex: /^(approved|verified)$/i } },
            { status: { $regex: /^(approved|active)$/i } },
            { isApproved: true }
          ]
        }
      ]
    });
    if (divUser) return divUser;
  }

  // 3. Try to find District Agent matching district
  if (district && district.trim() && db) {
    const cleanDist = district.toLowerCase().trim();
    const distUser = await db.collection('users').findOne({
      $and: [
        { $or: [{ role: /district/i }, { level: /district/i }, { role: 'agent', level: 'district' }] },
        {
          $or: [
            { 'assignedTerritory.district': new RegExp(cleanDist, 'i') },
            { 'territory.district': new RegExp(cleanDist, 'i') },
            { district: new RegExp(cleanDist, 'i') },
            { assignedDistrict: new RegExp(cleanDist, 'i') }
          ]
        },
        {
          $or: [
            { kycStatus: { $regex: /^(approved|verified)$/i } },
            { status: { $regex: /^(approved|active)$/i } },
            { isApproved: true }
          ]
        }
      ]
    });
    if (distUser) return distUser;
  }

  return null;
}

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

    // Support both string UUID and ObjectId matches
    const agentQueryValues: any[] = [agentId];
    if (mongoose.Types.ObjectId.isValid(agentId)) {
      agentQueryValues.push(new mongoose.Types.ObjectId(agentId));
    }

    if (mine === 'true') {
      filter.creator = { $in: agentQueryValues };
    } else if (!isAdminOrExecutive) {
      const scope = await getAgentTerritoryScope(agentId);
      const conditions: any[] = [
        { creator: { $in: agentQueryValues } },
        { assignedTo: { $in: agentQueryValues } }
      ];

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
      .select('ticketId creator creatorRole creatorName assignedTo assignedAgent assignedAgentIdStr assignedAgentRole assignedAgentPhone assignedAgentPincode assignedAgentDistrict assignedAgentDivision assignedAgentState assignmentStatus assignmentHistory vendorName storeName state district division pincode territory category description priority status attachmentName attachmentUrl resolutionDetails createdAt updatedAt')
      .populate('creator', 'name email role phone')
      .populate('assignedTo', 'name email role phone')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Enrich tickets with assigned agent details if missing with safe error handling
    const enrichedTickets = await Promise.all(tickets.map(async (t: any) => {
      try {
        if (t.assignedTo && typeof t.assignedTo === 'object' && t.assignedTo.name) {
          t.assignedAgent = t.assignedAgent || t.assignedTo.name;
          t.assignedAgentRole = t.assignedAgentRole || t.assignedTo.role || t.assignedTo.level;
          t.assignedAgentPhone = t.assignedAgentPhone || t.assignedTo.phone || t.assignedTo.mobile;
          t.assignmentStatus = t.assignmentStatus || 'assigned';
        } else if (!t.assignedAgent && t.pincode) {
          const agent: any = await resolveResponsibleAgent(t.pincode, t.division, t.district, t.state);
          if (agent) {
            t.assignedAgent = agent.name;
            t.assignedAgentIdStr = agent.registrationId || agent.agentId || String(agent._id);
            const rawR = (agent.role || agent.level || 'pincode').toLowerCase();
            t.assignedAgentRole = rawR === 'agent' ? (agent.level || 'Pincode Agent') : rawR;
            t.assignedAgentPhone = agent.phone || agent.mobile || '';
            t.assignedAgentPincode = agent.pincode || agent.assignedTerritory?.pincode || t.pincode;
            t.assignedAgentDistrict = agent.district || agent.assignedTerritory?.district || t.district;
            t.assignedAgentDivision = agent.division || agent.assignedTerritory?.division || t.division;
            t.assignedAgentState = agent.state || agent.assignedTerritory?.state || t.state;
            t.assignmentStatus = 'assigned';
          } else {
            t.assignmentStatus = 'unassigned';
          }
        } else if (!t.assignmentStatus) {
          t.assignmentStatus = (t.assignedAgent && t.assignedAgent !== 'Unassigned') ? 'assigned' : 'unassigned';
        }
      } catch (enrichErr) {
        if (!t.assignmentStatus) t.assignmentStatus = 'unassigned';
      }
      return t;
    }));

    return res.status(200).json({
      tickets: enrichedTickets,
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
      const agentQueryValues: any[] = [agentId];
      if (mongoose.Types.ObjectId.isValid(agentId)) {
        agentQueryValues.push(new mongoose.Types.ObjectId(agentId));
      }
      filter.$or = [{ creator: { $in: agentQueryValues } }, { assignedTo: { $in: agentQueryValues } }];
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

    // Automatically resolve the responsible agent based on territory hierarchy
    const responsibleAgent: any = await resolveResponsibleAgent(pincode, division, district, state);
    let assignedTo = undefined;
    let assignedAgent = data.assignedAgent || (responsibleAgent ? responsibleAgent.name : 'Unassigned');
    let assignedAgentIdStr = undefined;
    let assignedAgentRole = undefined;
    let assignedAgentPhone = undefined;
    let assignedAgentPincode = undefined;
    let assignedAgentDistrict = undefined;
    let assignedAgentDivision = undefined;
    let assignedAgentState = undefined;
    let assignmentStatus: 'assigned' | 'unassigned' = 'unassigned';

    if (responsibleAgent) {
      assignedTo = responsibleAgent._id;
      assignedAgent = responsibleAgent.name;
      assignedAgentIdStr = responsibleAgent.registrationId || responsibleAgent.agentId || String(responsibleAgent._id);
      const rawR = (responsibleAgent.role || responsibleAgent.level || 'pincode').toLowerCase();
      assignedAgentRole = rawR === 'agent' ? (responsibleAgent.level || 'Pincode Agent') : rawR;
      assignedAgentPhone = responsibleAgent.phone || responsibleAgent.mobile || '';
      assignedAgentPincode = responsibleAgent.pincode || responsibleAgent.assignedTerritory?.pincode || pincode;
      assignedAgentDistrict = responsibleAgent.district || responsibleAgent.assignedTerritory?.district || district;
      assignedAgentDivision = responsibleAgent.division || responsibleAgent.assignedTerritory?.division || division;
      assignedAgentState = responsibleAgent.state || responsibleAgent.assignedTerritory?.state || state;
      assignmentStatus = 'assigned';
    } else if (data.assignedAgent && data.assignedAgent !== 'Unassigned') {
      assignmentStatus = 'assigned';
      assignedAgent = data.assignedAgent;
      assignedAgentRole = data.assignedAgent.includes('District') ? 'District Lead' :
                          data.assignedAgent.includes('Division') ? 'Division Lead' :
                          data.assignedAgent.includes('Pincode') ? 'Pincode Agent' : 'Assigned Agent';
    }

    const ticket = new Ticket({
      ticketId: generateTicketId(),
      creator: agentId,
      creatorRole: agentRole,
      creatorName: agentName,
      assignedTo,
      assignedAgent,
      assignedAgentIdStr,
      assignedAgentRole,
      assignedAgentPhone,
      assignedAgentPincode,
      assignedAgentDistrict,
      assignedAgentDivision,
      assignedAgentState,
      assignmentStatus,
      assignmentHistory: assignmentStatus === 'assigned' ? [{
        agentId: assignedAgentIdStr,
        agentName: assignedAgent,
        role: assignedAgentRole,
        assignedBy: agentRole,
        assignedAt: new Date(),
        reason: 'Auto-assigned by territory hierarchy upon ticket creation'
      }] : [],
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
      attachmentUrl: data.attachmentUrl
    });

    await ticket.save();
    await ticket.populate('creator', 'name email role phone');

    // Invalidate dashboard stats cache
    await cacheService.delByPrefix('dashboard:');

    // Publish Realtime Ticket Event
    publishEntityEvent({
      event: 'ENTITY_CREATED',
      entity: 'ticket',
      entityId: ticket._id.toString(),
      action: 'created',
      scope: {
        state: ticket.state,
        district: ticket.district,
        division: ticket.division,
        pincode: ticket.pincode
      },
      data: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        category: ticket.category,
        priority: ticket.priority
      }
    }).catch(() => {});

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
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    if (status) ticket.status = status;
    if (resolutionDetails) {
      ticket.resolutionDetails = resolutionDetails;
    } else if (remarks) {
      const trimmedRemark = String(remarks).trim();
      const existingLogs = (ticket.resolutionDetails || '')
        .split('|')
        .map((s: string) => s.trim())
        .filter(Boolean);
      const lastLog = existingLogs.length > 0 ? existingLogs[existingLogs.length - 1] : '';
      if (lastLog !== trimmedRemark) {
        existingLogs.push(trimmedRemark);
        ticket.resolutionDetails = existingLogs.join(' | ');
      }
    }

    if (assignedAgent) {
      ticket.assignedAgent = assignedAgent;
      ticket.assignmentStatus = assignedAgent === 'Unassigned' ? 'unassigned' : 'assigned';

      // Look up target agent in users/agents
      const cleanTarget = String(assignedAgent).toLowerCase().trim();
      let matchedAgent: any = null;
      const db = mongoose.connection.db;
      if (db) {
        matchedAgent = await db.collection('users').findOne({
          $or: [
            { name: exactRegex(assignedAgent) },
            { email: cleanTarget }
          ]
        });
      }

      if (matchedAgent) {
        ticket.assignedTo = matchedAgent._id;
        ticket.assignedAgent = matchedAgent.name;
        ticket.assignedAgentIdStr = matchedAgent.registrationId || matchedAgent.agentId || String(matchedAgent._id);
        const rawR = (matchedAgent.role || matchedAgent.level || 'pincode').toLowerCase();
        ticket.assignedAgentRole = rawR === 'agent' ? (matchedAgent.level || 'Pincode Agent') : rawR;
        ticket.assignedAgentPhone = matchedAgent.phone || matchedAgent.mobile || '';
        ticket.assignedAgentPincode = matchedAgent.pincode || matchedAgent.assignedTerritory?.pincode || ticket.pincode;
        ticket.assignedAgentDistrict = matchedAgent.district || matchedAgent.assignedTerritory?.district || ticket.district;
        ticket.assignedAgentDivision = matchedAgent.division || matchedAgent.assignedTerritory?.division || ticket.division;
        ticket.assignedAgentState = matchedAgent.state || matchedAgent.assignedTerritory?.state || ticket.state;
      } else {
        ticket.assignedAgentRole = assignedAgent.includes('District') ? 'District Lead' :
                                  assignedAgent.includes('Division') ? 'Division Lead' :
                                  assignedAgent.includes('Pincode') ? 'Pincode Agent' : 'Support Desk';
      }

      ticket.assignmentHistory = ticket.assignmentHistory || [];
      ticket.assignmentHistory.push({
        agentId: ticket.assignedAgentIdStr,
        agentName: ticket.assignedAgent,
        role: ticket.assignedAgentRole,
        assignedBy: agentRole || 'admin',
        assignedAt: new Date(),
        reason: remarks || `Assigned to ${ticket.assignedAgent}`
      });
    }
    ticket.updatedAt = new Date();
    await ticket.save();

    await ticket.populate([
      { path: 'creator', select: 'name email role phone' },
      { path: 'assignedTo', select: 'name email role phone' }
    ]);

    // Invalidate dashboard stats cache
    await cacheService.delByPrefix('dashboard:');

    // Publish Realtime Ticket Status Event
    publishEntityEvent({
      event: 'ENTITY_STATUS_CHANGED',
      entity: 'ticket',
      entityId: ticket._id.toString(),
      action: 'status_changed',
      scope: {
        state: ticket.state,
        district: ticket.district,
        division: ticket.division,
        pincode: ticket.pincode,
        targetAgentId: ticket.creator ? (ticket.creator as any)._id?.toString() || ticket.creator.toString() : undefined
      },
      data: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status
      }
    }).catch(() => {});

    return res.status(200).json({ message: 'Ticket status updated', ticket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

