import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket';
import Agent from '../models/Agent';
import Vendor from '../models/Vendor';
import { getAgentTerritoryScope } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';
import { publishEntityEvent } from '../realtime/eventBus';
import NotificationService from '../services/notification.service';

// Simple unique ticket ID generator — format TKT-XXXXXX
const generateTicketId = () =>
  `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactRegex = (str: string) => new RegExp(`^\\s*${escapeRegex(str.trim())}\\s*$`, 'i');
const containsRegex = (str: string) => new RegExp(escapeRegex(str.trim()), 'i');

/**
 * Resolve the authorized responsible agent for a given territory (Pincode -> Division -> District)
 * Cached with TTL to eliminate N+1 queries when populating ticket lists
 */
async function resolveResponsibleAgent(pincode?: string, division?: string, district?: string, state?: string) {
  const cacheKey = `respAgent:${(pincode || '').trim()}:${(division || '').trim()}:${(district || '').trim()}:${(state || '').trim()}`;
  try {
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached === false ? null : cached;
    }
  } catch (_) {}

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

    if (pinAgent) {
      await cacheService.set(cacheKey, pinAgent, 300).catch(() => {});
      return pinAgent;
    }

    // Check users collection
    if (db) {
      const pinUser = await db.collection('users').findOne({
        $and: [
          {
            role: {
              $in: ['pincode', 'pincode_agent', 'agent'],
              $nin: ['admin', 'super-admin', 'District Admin', 'Division Admin', 'Pincode Admin', 'manager', 'pincode_manager', 'Vendor', 'customer']
            }
          },
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
      if (pinUser && !/^(ADM-|usr_mgr|MGR-|cust_|ven-)/i.test(String(pinUser._id))) {
        await cacheService.set(cacheKey, pinUser, 300).catch(() => {});
        return pinUser;
      }
    }
  }

  // 2. Try to find Division Agent matching division
  if (division && division.trim() && db) {
    const cleanDiv = division.toLowerCase().replace(/division|manager/g, '').trim();
    const divUser = await db.collection('users').findOne({
      $and: [
        {
          role: {
            $in: ['division', 'division_agent', 'division_lead', 'agent'],
            $nin: ['admin', 'super-admin', 'District Admin', 'Division Admin', 'manager', 'division_manager', 'Vendor', 'customer']
          }
        },
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
    if (divUser && !/^(ADM-|usr_mgr|MGR-|cust_|ven-)/i.test(String(divUser._id))) {
      await cacheService.set(cacheKey, divUser, 300).catch(() => {});
      return divUser;
    }
  }

  // 3. Try to find District Agent matching district
  if (district && district.trim() && db) {
    const cleanDist = district.toLowerCase().trim();
    const distUser = await db.collection('users').findOne({
      $and: [
        {
          role: {
            $in: ['district', 'district_agent', 'district_lead', 'agent'],
            $nin: ['admin', 'super-admin', 'District Admin', 'Division Admin', 'manager', 'district_manager', 'Vendor', 'customer']
          }
        },
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
    if (distUser) {
      await cacheService.set(cacheKey, distUser, 300).catch(() => {});
      return distUser;
    }
  }

  await cacheService.set(cacheKey, false, 300).catch(() => {});
  return null;
}

/**
 * Resolves the authorized administrator for a submitting agent based on their role and territory:
 * - Pincode Agent -> Pincode Admin for the assigned pincode
 * - Division Agent -> Division Admin for the assigned division
 * - District Agent -> District Admin for the assigned district
 * - State Agent -> State Admin for the assigned state
 */
export async function resolveAuthorizedAdminForAgent(
  submittingRole: string,
  territory: { state?: string; district?: string; division?: string; pincode?: string }
) {
  const db = mongoose.connection.db;
  if (!db) return null;

  const rawRole = (submittingRole || '').toLowerCase().trim();
  const role = rawRole.replace(/_agent|_lead|agent/gi, '').trim() || 'pincode';
  const state = (territory.state || 'Tamil Nadu').trim();
  const district = (territory.district || '').trim();
  const division = (territory.division || '').trim();
  const pincode = (territory.pincode || '').trim();

  let targetAdmin: any = null;

  if (role === 'pincode') {
    if (!pincode) return null;
    targetAdmin = await db.collection('users').findOne({
      $or: [
        { role: { $regex: /^pincode\s*admin/i } },
        { adminRole: 'pincode-admin' },
        { role: { $regex: /pincode.*admin/i } }
      ],
      $and: [
        {
          $or: [
            { pincode: pincode },
            { assignedPincode: pincode },
            { 'assignedTerritory.pincode': pincode },
            { 'territory.pincode': pincode }
          ]
        },
        { status: { $in: ['active', 'approved', 'Active', 'Approved'] } }
      ]
    });
  } else if (role === 'division') {
    if (!division) return null;
    const cleanDiv = division.replace(/division|manager/gi, '').trim();
    targetAdmin = await db.collection('users').findOne({
      $or: [
        { role: { $regex: /^division\s*admin/i } },
        { adminRole: { $regex: /division/i } },
        { role: { $regex: /division.*admin/i } }
      ],
      $and: [
        {
          $or: [
            { division: new RegExp(escapeRegex(cleanDiv), 'i') },
            { assignedDivision: new RegExp(escapeRegex(cleanDiv), 'i') },
            { 'assignedTerritory.division': new RegExp(escapeRegex(cleanDiv), 'i') },
            { 'territory.division': new RegExp(escapeRegex(cleanDiv), 'i') }
          ]
        },
        { status: { $in: ['active', 'approved', 'Active', 'Approved'] } }
      ]
    });
  } else if (role === 'district') {
    if (!district) return null;
    const cleanDist = district.replace(/district/gi, '').trim();
    targetAdmin = await db.collection('users').findOne({
      $or: [
        { role: { $regex: /^district\s*admin/i } },
        { adminRole: { $regex: /district/i } },
        { role: { $regex: /district.*admin/i } }
      ],
      $and: [
        {
          $or: [
            { district: new RegExp(escapeRegex(cleanDist), 'i') },
            { assignedDistrict: new RegExp(escapeRegex(cleanDist), 'i') },
            { 'assignedTerritory.district': new RegExp(escapeRegex(cleanDist), 'i') },
            { 'territory.district': new RegExp(escapeRegex(cleanDist), 'i') }
          ]
        },
        { status: { $in: ['active', 'approved', 'Active', 'Approved'] } }
      ]
    });
  } else if (role === 'state') {
    const cleanState = (state || 'Tamil Nadu').trim();
    targetAdmin = await db.collection('users').findOne({
      $or: [
        { role: { $regex: /^state\s*admin/i } },
        { adminRole: { $regex: /state/i } },
        { role: { $regex: /state.*admin/i } }
      ],
      $and: [
        {
          $or: [
            { state: new RegExp(escapeRegex(cleanState), 'i') },
            { assignedState: new RegExp(escapeRegex(cleanState), 'i') },
            { 'assignedTerritory.state': new RegExp(escapeRegex(cleanState), 'i') },
            { 'territory.state': new RegExp(escapeRegex(cleanState), 'i') }
          ]
        },
        { status: { $in: ['active', 'approved', 'Active', 'Approved'] } }
      ]
    });

    if (!targetAdmin) {
      targetAdmin = await db.collection('users').findOne({
        $or: [
          { role: 'super-admin' },
          { role: 'superadmin' },
          { adminRole: 'super-admin' }
        ],
        status: { $in: ['active', 'approved', 'Active', 'Approved'] }
      });
    }
  }

  return targetAdmin;
}

const createTicketSchema = z.object({
  ticketType: z.enum(['my_issue', 'vendor_issue', 'agent_issue']).optional(),
  category: z.string().min(1, 'Category is required'),
  subject: z.string().optional(),
  description: z.string().min(1, 'Issue details are required'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  vendorId: z.string().optional(),
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

/**
 * Safely resolves and populates 'creator' and 'assignedTo' for ticket records.
 * Handles both MongoDB ObjectIds and custom string IDs (e.g. ADM-XXXXX, registration IDs)
 * from either the Agent or User collections without triggering Mongoose CastError.
 */
async function populateTicketParties(ticketDocs: any[]) {
  if (!ticketDocs || ticketDocs.length === 0) return ticketDocs;

  const rawIds = new Set<string>();
  ticketDocs.forEach((t) => {
    const cId = t.creator && typeof t.creator === 'object' ? (t.creator._id || t.creator.id) : t.creator;
    const aId = t.assignedTo && typeof t.assignedTo === 'object' ? (t.assignedTo._id || t.assignedTo.id) : t.assignedTo;
    if (cId) rawIds.add(String(cId).trim());
    if (aId) rawIds.add(String(aId).trim());
  });

  if (rawIds.size === 0) return ticketDocs;

  const allIdList = Array.from(rawIds);
  const objectIds: mongoose.Types.ObjectId[] = [];
  const stringIds: string[] = [];

  allIdList.forEach((id) => {
    if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
      objectIds.push(new mongoose.Types.ObjectId(id));
    }
    stringIds.push(id);
  });

  const partyMap = new Map<string, { _id: string; name: string; email?: string; role?: string; phone?: string }>();

  // 1. Query Agent collection
  const agentQueryOr: any[] = [];
  if (objectIds.length > 0) agentQueryOr.push({ _id: { $in: objectIds } });
  if (stringIds.length > 0) {
    agentQueryOr.push({ registrationId: { $in: stringIds } });
    agentQueryOr.push({ agentId: { $in: stringIds } });
  }

  if (agentQueryOr.length > 0) {
    const agents = await Agent.find({ $or: agentQueryOr })
      .select('_id name email role level phone mobile registrationId agentId')
      .lean();

    agents.forEach((ag: any) => {
      const obj = {
        _id: String(ag._id),
        name: ag.name || '',
        email: ag.email || '',
        role: ag.role || ag.level || '',
        phone: ag.phone || ag.mobile || ''
      };
      partyMap.set(String(ag._id), obj);
      if (ag.registrationId) partyMap.set(String(ag.registrationId), obj);
      if (ag.agentId) partyMap.set(String(ag.agentId), obj);
    });
  }

  // 2. Query users collection
  const db = mongoose.connection.db;
  if (db) {
    const userQueryOr: any[] = [];
    if (objectIds.length > 0) userQueryOr.push({ _id: { $in: objectIds } });
    if (stringIds.length > 0) {
      userQueryOr.push({ _id: { $in: stringIds } });
      userQueryOr.push({ id: { $in: stringIds } });
      userQueryOr.push({ registrationId: { $in: stringIds } });
    }

    if (userQueryOr.length > 0) {
      const users = await db.collection('users')
        .find({ $or: userQueryOr }, { projection: { _id: 1, id: 1, name: 1, email: 1, role: 1, level: 1, phone: 1, mobile: 1, registrationId: 1 } })
        .toArray();

      users.forEach((u: any) => {
        const obj = {
          _id: String(u._id),
          name: u.name || '',
          email: u.email || '',
          role: u.role || (u.level ? String(u.level) : ''),
          phone: u.phone || u.mobile || ''
        };
        const idKey = String(u._id);
        if (!partyMap.has(idKey)) partyMap.set(idKey, obj);
        if (u.id && !partyMap.has(String(u.id))) partyMap.set(String(u.id), obj);
        if (u.registrationId && !partyMap.has(String(u.registrationId))) partyMap.set(String(u.registrationId), obj);
      });
    }
  }

  // Populate into tickets
  ticketDocs.forEach((t) => {
    if (t.creator) {
      const cKey = String(t.creator && typeof t.creator === 'object' ? (t.creator._id || t.creator.id) : t.creator).trim();
      if (partyMap.has(cKey)) {
        t.creator = partyMap.get(cKey);
      } else if (t.creatorName) {
        t.creator = {
          _id: cKey,
          name: t.creatorName,
          role: t.creatorRole || 'Agent',
          email: '',
          phone: ''
        };
      } else if (typeof t.creator !== 'object') {
        t.creator = {
          _id: cKey,
          name: t.creatorRole || 'Agent',
          role: t.creatorRole || 'Agent',
          email: '',
          phone: ''
        };
      }
    }

    if (t.assignedTo) {
      const aKey = String(t.assignedTo && typeof t.assignedTo === 'object' ? (t.assignedTo._id || t.assignedTo.id) : t.assignedTo).trim();
      if (partyMap.has(aKey)) {
        t.assignedTo = partyMap.get(aKey);
      } else if (t.assignedAgent) {
        t.assignedTo = {
          _id: aKey,
          name: t.assignedAgent,
          role: t.assignedAgentRole || 'Support Executive',
          phone: t.assignedAgentPhone || '',
          email: ''
        };
      } else if (typeof t.assignedTo !== 'object') {
        t.assignedTo = {
          _id: aKey,
          name: 'Support Executive',
          role: 'Support Executive',
          phone: '',
          email: ''
        };
      }
    }
  });

  return ticketDocs;
}

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
          conditions.push({
            $and: [
              { state: exactRegex(scope.state) },
              { $or: [{ ticketType: 'vendor_issue' }, { ticketType: { $exists: false } }, { assignedTo: { $in: agentQueryValues } }, { creator: { $in: agentQueryValues } }] }
            ]
          });
        } else if (scope.role === 'district' && scope.district) {
          conditions.push({
            $and: [
              { district: exactRegex(scope.district) },
              { $or: [{ ticketType: 'vendor_issue' }, { ticketType: { $exists: false } }, { assignedTo: { $in: agentQueryValues } }, { creator: { $in: agentQueryValues } }] }
            ]
          });
        } else if (scope.role === 'division' && scope.division) {
          conditions.push({
            $and: [
              { division: containsRegex(scope.division) },
              { $or: [{ ticketType: 'vendor_issue' }, { ticketType: { $exists: false } }, { assignedTo: { $in: agentQueryValues } }, { creator: { $in: agentQueryValues } }] }
            ]
          });
        }
        // Note: For Pincode Agent, conditions remain creator or assignedTo, protecting agent isolation
      }

      filter.$or = conditions;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .select('ticketId creator creatorRole creatorName assignedTo assignedAgent assignedAgentIdStr assignedAgentRole assignedAgentPhone assignedAgentPincode assignedAgentDistrict assignedAgentDivision assignedAgentState assignmentStatus assignmentHistory vendorId vendorName storeName ticketType subject state district division pincode territory category description priority status attachmentName attachmentUrl resolutionDetails createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    await populateTicketParties(tickets);

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

    const rawTicket = await Ticket.findById(req.params.id).lean();
    if (!rawTicket) return res.status(404).json({ message: 'Ticket not found' });

    const [ticket] = await populateTicketParties([rawTicket]);

    const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
    if (!isAdminOrExecutive) {
      const agentIdStr = agentId.toString();
      const creatorIdStr = (ticket.creator as any)?._id?.toString() || ticket.creator?.toString();
      const assignedToIdStr = (ticket.assignedTo as any)?._id?.toString() || ticket.assignedTo?.toString();
      const isDirectParty = creatorIdStr === agentIdStr || assignedToIdStr === agentIdStr;

      if (!isDirectParty) {
        const scope = await getAgentTerritoryScope(agentId);
        if (!scope) {
          return res.status(403).json({ message: 'Access denied: outside your jurisdiction' });
        }

        if (scope.role === 'pincode') {
          return res.status(403).json({ message: 'Access denied: Pincode agent can only view tickets created by or assigned to them' });
        }
        if (scope.role === 'division') {
          if (!ticket.division || !ticket.division.toLowerCase().includes(scope.division?.toLowerCase() || '')) {
            return res.status(403).json({ message: 'Access denied: ticket is outside your division jurisdiction' });
          }
        } else if (scope.role === 'district') {
          if (!ticket.district || ticket.district.toLowerCase() !== scope.district?.toLowerCase()) {
            return res.status(403).json({ message: 'Access denied: ticket is outside your district jurisdiction' });
          }
        } else if (scope.role === 'state') {
          if (!ticket.state || ticket.state.toLowerCase() !== scope.state?.toLowerCase()) {
            return res.status(403).json({ message: 'Access denied: ticket is outside your state jurisdiction' });
          }
        }
      }
    }

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

    let state = (data.state || scope?.state || agent?.assignedTerritory?.state || agent?.territory?.state || '').trim();
    let district = (data.district || scope?.district || agent?.assignedTerritory?.district || agent?.territory?.district || '').trim();
    let division = (data.division || scope?.division || agent?.assignedTerritory?.division || agent?.territory?.division || '').trim();
    let pincode = (data.pincode || scope?.pincode || agent?.assignedTerritory?.pincode || agent?.territory?.pincode || '').trim();
    let vendorName = data.vendorName || data.storeName || '';
    let storeName = data.storeName || data.vendorName || '';
    let resolvedVendorId = data.vendorId;

    const ticketType = data.ticketType || (data.vendorId || data.vendorName ? 'vendor_issue' : 'my_issue');

    if (ticketType === 'vendor_issue') {
      if (!data.vendorId && !data.vendorName) {
        return res.status(400).json({ message: 'A valid vendor must be selected for Vendor Issue tickets' });
      }

      if (data.vendorId) {
        const vendorDoc = await Vendor.findOne({
          $or: [
            ...(mongoose.Types.ObjectId.isValid(data.vendorId) ? [{ _id: new mongoose.Types.ObjectId(data.vendorId) }] : []),
            { _id: data.vendorId },
            { registrationId: data.vendorId }
          ]
        }).lean();

        if (!vendorDoc) {
          return res.status(404).json({ message: 'Selected vendor not found' });
        }

        const isKycApproved = /^(approved|verified)$/i.test(vendorDoc.kycStatus || '');
        const isActive = /^(active|approved|verified)$/i.test(vendorDoc.status || '');
        if (!isKycApproved || !isActive) {
          return res.status(400).json({ message: 'Selected vendor is not active or fully approved' });
        }

        if (scope) {
          if (scope.role === 'state' && scope.state && vendorDoc.state && vendorDoc.state.toLowerCase() !== scope.state.toLowerCase()) {
            return res.status(403).json({ message: `Vendor is outside your state jurisdiction (${scope.state})` });
          }
          if (scope.role === 'district' && scope.district && vendorDoc.district && vendorDoc.district.toLowerCase() !== scope.district.toLowerCase()) {
            return res.status(403).json({ message: `Vendor is outside your district jurisdiction (${scope.district})` });
          }
          if (scope.role === 'division' && scope.division && vendorDoc.division && !vendorDoc.division.toLowerCase().includes(scope.division.toLowerCase())) {
            return res.status(403).json({ message: `Vendor is outside your division jurisdiction (${scope.division})` });
          }
          if (scope.role === 'pincode') {
            if (scope.pincode && vendorDoc.pincode && vendorDoc.pincode !== scope.pincode) {
              return res.status(403).json({ message: `Vendor is outside your pincode jurisdiction (${scope.pincode})` });
            }
            const vAgentIds = [
              vendorDoc.assignedAgent?.toString(),
              vendorDoc.agentId?.toString(),
              vendorDoc.onboardedBy?.toString(),
              vendorDoc.onboardedByAgentId?.toString()
            ].filter(Boolean);
            if (!vAgentIds.includes(agentId.toString())) {
              return res.status(403).json({ message: 'You can only raise vendor issue tickets for vendors assigned to you' });
            }
          }
        }

        vendorName = vendorDoc.businessName || vendorDoc.ownerName || vendorName;
        storeName = vendorDoc.businessName || storeName;
        state = vendorDoc.state || state;
        district = vendorDoc.district || district;
        division = vendorDoc.division || division;
        pincode = vendorDoc.pincode || pincode;
        resolvedVendorId = String(vendorDoc._id);
      }
    } else {
      // My Issue ticket: No vendor attached, defaults to agent territory
      vendorName = '';
      storeName = '';
      resolvedVendorId = undefined;
    }

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

    // Determine the submitting agent's trusted role from server-side authenticated context
    const rawRole = (scope?.role || (req as any).agent?.role || agent?.role || 'pincode').toLowerCase();
    const submittingRole = rawRole.includes('state') ? 'state' :
                           rawRole.includes('district') ? 'district' :
                           rawRole.includes('division') ? 'division' : 'pincode';

    // Agent's authoritative territory from trusted profile / scope
    const authState = (scope?.state || agent?.assignedTerritory?.state || agent?.territory?.state || 'Tamil Nadu').trim();
    const authDistrict = (scope?.district || agent?.assignedTerritory?.district || agent?.territory?.district || district || '').trim();
    const authDivision = (scope?.division || agent?.assignedTerritory?.division || agent?.territory?.division || division || '').trim();
    const authPincode = (scope?.pincode || agent?.assignedTerritory?.pincode || agent?.territory?.pincode || pincode || '').trim();

    // Route issues automatically to the authorized administrator based on agent's role and assigned territory
    const authorizedAdmin: any = await resolveAuthorizedAdminForAgent(submittingRole, {
      state: authState,
      district: authDistrict,
      division: authDivision,
      pincode: authPincode
    });

    if (!authorizedAdmin) {
      const roleLabel = submittingRole.charAt(0).toUpperCase() + submittingRole.slice(1);
      const territoryLabel = submittingRole === 'pincode' ? `Pincode ${authPincode}` :
                             submittingRole === 'division' ? `Division ${authDivision}` :
                             submittingRole === 'district' ? `District ${authDistrict}` :
                             `State ${authState}`;
      return res.status(400).json({
        message: `No authorized ${roleLabel} Admin found for your assigned territory (${territoryLabel}). Please verify your territory assignment or contact administration.`
      });
    }

    const adminId = authorizedAdmin._id;
    const adminIdStr = authorizedAdmin.id || authorizedAdmin.registrationId || String(authorizedAdmin._id);
    const adminName = authorizedAdmin.name || 'Authorized Admin';
    const adminRoleTitle = authorizedAdmin.role || authorizedAdmin.adminRole || `${submittingRole.charAt(0).toUpperCase() + submittingRole.slice(1)} Admin`;
    const adminPhone = authorizedAdmin.phone || authorizedAdmin.mobile || '';

    const assignedTo = adminId;
    const assignedAgent = adminName;
    const assignedAgentIdStr = adminIdStr;
    const assignedAgentRole = adminRoleTitle;
    const assignedAgentPhone = adminPhone;
    const assignedAgentPincode = authorizedAdmin.pincode || authorizedAdmin.assignedTerritory?.pincode || (submittingRole === 'pincode' ? authPincode : undefined);
    const assignedAgentDivision = authorizedAdmin.division || authorizedAdmin.assignedTerritory?.division || (['pincode', 'division'].includes(submittingRole) ? authDivision : undefined);
    const assignedAgentDistrict = authorizedAdmin.district || authorizedAdmin.assignedTerritory?.district || (['pincode', 'division', 'district'].includes(submittingRole) ? authDistrict : undefined);
    const assignedAgentState = authorizedAdmin.state || authorizedAdmin.assignedTerritory?.state || authState;
    const assignmentStatus = 'assigned';

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
        reason: `Auto-routed to authorized ${assignedAgentRole} for ${submittingRole} territory`
      }] : [],
      ticketType,
      subject: data.subject || (ticketType === 'vendor_issue' ? `Vendor Issue - ${vendorName}` : 'Agent Support Ticket'),
      vendorId: resolvedVendorId,
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
    const ticketObj: any = ticket.toObject ? ticket.toObject() : ticket;
    await populateTicketParties([ticketObj]);

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

    // Notify assigned agent
    if (ticket.assignedTo) {
      NotificationService.notifyTicketUpdate(ticket, ticket.assignedTo, 'assigned').catch(() => {});
    }

    return res.status(201).json({ message: 'Support ticket created successfully', ticket: ticketObj });
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

    const ticketObj: any = ticket.toObject ? ticket.toObject() : ticket;
    await populateTicketParties([ticketObj]);

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

    // Notify assigned agent and ticket creator of status change
    if (ticket.assignedTo) {
      NotificationService.notifyTicketUpdate(ticket, ticket.assignedTo, ticket.status).catch(() => {});
    }
    const creatorId = (ticket.creator as any)?._id || ticket.creator;
    if (creatorId && String(creatorId) !== String(ticket.assignedTo)) {
      NotificationService.notifyTicketUpdate(ticket, creatorId, ticket.status).catch(() => {});
    }

    return res.status(200).json({ message: 'Ticket status updated', ticket: ticketObj });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

