import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import Target from '../models/Target';
import TargetAssignment from '../models/TargetAssignment';
import Agent from '../models/Agent';
import Notification from '../models/Notification';
import { getAgentTerritoryScope, buildTerritoryFilter } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';
import { publishEntityEvent } from '../realtime/eventBus';

const createTargetSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  targetValue: z.number().positive('Target value must be positive'),
  priority: z.enum(['High', 'Medium', 'Low', 'high', 'medium', 'low']).optional().default('Medium')
});

const assignTargetSchema = z.object({
  assignedTo: z.string().min(1, 'assignedTo agent ID required'),
  dueDate: z.string().min(1, 'Due date required')
});

const allocateTargetSchema = z.object({
  assignedTo: z.string().optional(),
  district: z.string().optional(),
  divisionName: z.string().optional(),
  pincode: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily'),
  targetValue: z.number().positive('Target value must be positive'),
  priority: z.enum(['High', 'Medium', 'Low', 'high', 'medium', 'low']).optional().default('Medium'),
  dueDate: z.string().optional()
});

// GET /api/targets — list targets created by or assigned to the agent
export const getTargets = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '20', type } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = { createdBy: agentId };
    if (type) filter.type = type;

    const total = await Target.countDocuments(filter);
    const targets = await Target.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      targets,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get targets error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/targets — create a new target
export const createTarget = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = createTargetSchema.parse(req.body);

    const target = new Target({ ...data, createdBy: agentId });
    await target.save();
    await target.populate('createdBy', 'name email role');

    return res.status(201).json({ message: 'Target created successfully', target });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create target error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/targets/allocate — allocate and assign target to division/pincode agent in one call
export const allocateTarget = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = allocateTargetSchema.parse(req.body);

    const agentEmail = (req as any).agent?.email;
    const scope = await getAgentTerritoryScope(agentId, agentEmail);
    const territoryFilter = buildTerritoryFilter(scope);

    let targetAgentId = data.assignedTo;
    let recipientName = data.divisionName || 'Division Agent';

    if (targetAgentId) {
      let allowedAgent = await Agent.findOne({ _id: targetAgentId, ...territoryFilter });
      if (!allowedAgent && mongoose.Types.ObjectId.isValid(targetAgentId)) {
        allowedAgent = await Agent.findOne({ _id: new mongoose.Types.ObjectId(targetAgentId), ...territoryFilter });
      }
      if (!allowedAgent) {
        const direct = await Agent.findById(targetAgentId).lean() || await Agent.findOne({ _id: targetAgentId }).lean();
        if (direct) {
          const directState = (direct.territory?.state || direct.assignedTerritory?.state || (direct as any).state || '').toLowerCase();
          const scopeState = (scope?.state || '').toLowerCase();
          if (!scopeState || directState.includes(scopeState) || scopeState.includes(directState)) {
            allowedAgent = direct as any;
          }
        }
      }
      if (!allowedAgent) {
        const db = mongoose.connection.db;
        if (db) {
          const userDoc = await db.collection('users').findOne({
            $or: [
              { _id: targetAgentId as any },
              { id: targetAgentId },
              { agentId: targetAgentId }
            ]
          });
          if (userDoc) {
            const uState = (userDoc.territory?.state || userDoc.assignedTerritory?.state || userDoc.state || '').toLowerCase();
            const scopeState = (scope?.state || '').toLowerCase();
            if (!scopeState || uState.includes(scopeState) || scopeState.includes(uState)) {
              allowedAgent = userDoc as any;
            }
          }
        }
      }
      if (!allowedAgent) {
        return res.status(403).json({ message: 'Target cannot be allocated to an agent outside authorized territory' });
      }

      // If specific district / division / pincode was selected for the target, verify agent matches
      const agtDist = (allowedAgent.assignedTerritory?.district || allowedAgent.territory?.district || (allowedAgent as any).district || '').trim().toLowerCase();
      const agtDistId = (allowedAgent.assignedTerritory?.districtId || '').trim().toLowerCase();
      const agtDiv = (allowedAgent.assignedTerritory?.division || allowedAgent.territory?.division || (allowedAgent as any).division || '').trim().toLowerCase();
      const agtPin = (allowedAgent.assignedTerritory?.pincode || allowedAgent.territory?.pincode || (allowedAgent as any).pincode || '').trim();

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
    } else if (data.divisionName) {
      const matchedAgent = await Agent.findOne({
        ...territoryFilter,
        $or: [
          { name: new RegExp(data.divisionName, 'i') },
          { 'assignedTerritory.division': new RegExp(data.divisionName, 'i') },
          { 'territory.division': new RegExp(data.divisionName, 'i') },
          { division: new RegExp(data.divisionName, 'i') }
        ]
      });
      if (matchedAgent) {
        targetAgentId = (matchedAgent._id as any).toString();
        recipientName = matchedAgent.name;
      }
    }

    const title = data.title || `Daily Merchant Target: ${data.targetValue} visits (${recipientName})`;

    const target = new Target({
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
      assignment = new TargetAssignment({
        target: target._id,
        assignedTo: targetAgentId,
        assignedBy: agentId,
        dueDate,
        status: 'assigned'
      });
      await assignment.save();

      // Create Notification for the assigned agent
      await Notification.create({
        receiver: targetAgentId,
        title: 'New Target Assigned',
        message: `You have been assigned a target of ${data.targetValue} visits: ${title}`,
        priority: 'high',
        category: 'target_assigned'
      });
      // Invalidate dashboard stats cache
      await cacheService.delByPrefix('dashboard:');
    }

    // Publish Realtime Target Event
    publishEntityEvent({
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
    }).catch(() => {});

    return res.status(201).json({
      message: 'Target allocated successfully',
      target,
      assignment
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Allocate target error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/targets/subordinates — list subordinates for target allocation dropdown
export const getSubordinates = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    if (!agentId && !agentEmail) return res.status(401).json({ message: 'Unauthorized' });

    const { district, division, role } = req.query;
    const scope = await getAgentTerritoryScope(agentId, agentEmail);
    const filter: any = buildTerritoryFilter(scope);

    filter.status = { $nin: ['rejected', 'suspended'] };

    if (district) {
      filter.$and = filter.$and || [];
      const dClean = (district as string).trim();
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
    if (division) {
      filter.$and = filter.$and || [];
      const divClean = (division as string).trim();
      const baseDiv = divClean.replace(/\s+division$/i, '').trim();
      const divRegex = new RegExp(`^\\s*${baseDiv}(\\s+division)?\\s*$`, 'i');
      filter.$and.push({
        $or: [
          { 'assignedTerritory.division': divRegex },
          { 'assignedTerritory.divisionId': new RegExp(`^\\s*${divClean}\\s*$`, 'i') },
          { 'territory.division': divRegex },
          { division: divRegex },
          { assignedDivision: divRegex }
        ]
      });
    }
    if (role) {
      const rClean = (role as string).toLowerCase().trim();
      filter.$and = filter.$and || [];
      let rolePatterns = [rClean];
      if (rClean === 'district') {
        rolePatterns = ['district', 'district_agent', 'district_lead', 'district admin'];
      } else if (rClean === 'division') {
        rolePatterns = ['division', 'division_agent', 'division_lead', 'division_manager'];
      } else if (rClean === 'pincode') {
        rolePatterns = ['pincode', 'pincode_agent'];
      }

      filter.$and.push({
        $or: [
          { role: { $in: rolePatterns.map(p => new RegExp(`^${p}$`, 'i')) } },
          { level: { $in: [rClean, ...rolePatterns].map(p => new RegExp(`^${p}$`, 'i')) } },
          { role: 'agent', level: { $in: [rClean, ...rolePatterns].map(p => new RegExp(`^${p}$`, 'i')) } }
        ]
      });
    }

    let subordinates = await Agent.find(filter)
      .select('_id name role level assignedTerritory territory state district division pincode email phone status kycStatus performanceScore')
      .sort({ createdAt: -1 })
      .lean();

    // Query 'users' collection in MongoDB for agents registered or stored in users collection
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userFilter: any = { status: { $nin: ['rejected', 'suspended'] } };
        const rClean = role ? (role as string).toLowerCase().trim() : '';

        if (rClean === 'district') {
          userFilter.$or = [
            { role: { $in: ['district', 'district_agent', 'district_lead', 'District Admin', 'agent'] } },
            { level: /district/i }
          ];
        } else if (rClean === 'division') {
          userFilter.$or = [
            { role: { $in: ['division', 'division_agent', 'division_lead', 'division_manager', 'agent'] } },
            { level: /division/i }
          ];
        } else if (rClean === 'pincode') {
          userFilter.$or = [
            { role: { $in: ['pincode', 'pincode_agent', 'agent'] } },
            { level: /pincode/i }
          ];
        }

        const userDocs = await db.collection('users').find(userFilter).limit(50).maxTimeMS(4000).toArray();
        const existingEmails = new Set(subordinates.map(s => (s.email || '').toLowerCase()));
        const existingIds = new Set(subordinates.map(s => String(s._id)));

        for (const u of userDocs) {
          const uId = String(u._id);
          const uEmail = (u.email || '').toLowerCase();
          if (existingIds.has(uId) || (uEmail && existingEmails.has(uEmail))) continue;

          const uRole = (u.role || u.level || 'pincode').toLowerCase();
          const uState = (u.assignedTerritory?.state || u.territory?.state || u.state || u.assignedState || '').trim();
          const uDist = (u.assignedTerritory?.district || u.territory?.district || u.district || u.assignedDistrict || '').trim();
          const uDiv = (u.assignedTerritory?.division || u.territory?.division || u.division || u.assignedDivision || '').trim();

          // Check scope authorization
          if (scope?.state && uState && !uState.toLowerCase().includes(scope.state.toLowerCase()) && !scope.state.toLowerCase().includes(uState.toLowerCase())) {
            continue;
          }
          if (district) {
            const baseDist = (district as string).replace(/\s+district$/i, '').trim().toLowerCase();
            if (!uDist || (!uDist.toLowerCase().includes(baseDist) && !baseDist.includes(uDist.toLowerCase()))) {
              continue;
            }
          }
          if (division) {
            const baseDiv = (division as string).replace(/\s+division$/i, '').trim().toLowerCase();
            if (!uDiv || (!uDiv.toLowerCase().includes(baseDiv) && !baseDiv.includes(uDiv.toLowerCase()))) {
              continue;
            }
          }

          // Map normalized role
          let normRole = rClean || (uRole.includes('district') ? 'district' : uRole.includes('division') ? 'division' : 'pincode');

          subordinates.push({
            _id: u._id,
            name: u.name || 'District Agent',
            role: normRole as any,
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
          } as any);

          if (uEmail) existingEmails.add(uEmail);
          existingIds.add(uId);
        }
      }
    } catch (usersErr) {
      console.warn('Fallback users query in getSubordinates failed gracefully:', usersErr);
    }

    const subIds = subordinates.map(s => s._id);
    let assignments: any[] = [];
    try {
      assignments = await TargetAssignment.find({ assignedTo: { $in: subIds } }).populate('target').lean();
    } catch (asgnErr) {
      console.warn('TargetAssignment metrics query failed gracefully:', asgnErr);
    }

    const subsWithMetrics = subordinates.map(sub => {
      const subAsgns = assignments.filter((a: any) => String(a.assignedTo) === String(sub._id));
      const assignedTargets = subAsgns.reduce((acc, a: any) => acc + (a.target?.targetValue || 1), 0);
      const completedTargets = subAsgns.filter((a: any) => a.status === 'completed').reduce((acc, a: any) => acc + (a.target?.targetValue || 1), 0);

      const rawRole = (sub.role || (sub as any).level || 'pincode').toLowerCase();
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
  } catch (error) {
    console.error('Get subordinates error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/targets/:id/assign — assign a target to another agent
export const assignTarget = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { id: targetId } = req.params;
    const data = assignTargetSchema.parse(req.body);

    const scope = await getAgentTerritoryScope(agentId);
    const territoryFilter = buildTerritoryFilter(scope);
    const allowedAgent = await Agent.findOne({ _id: data.assignedTo, ...territoryFilter });
    if (!allowedAgent) {
      return res.status(403).json({ message: 'Target cannot be assigned to an agent outside authorized territory' });
    }

    const target = await Target.findById(targetId);
    if (!target) return res.status(404).json({ message: 'Target not found' });

    const assignment = new TargetAssignment({
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
    await cacheService.delByPrefix('dashboard:');

    return res.status(201).json({ message: 'Target assigned successfully', assignment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Assign target error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/targets/assignments/mine — list assignments for the current agent and authorized territory
export const getMyAssignments = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '50', status } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;

    const isObjId = mongoose.Types.ObjectId.isValid(agentId);
    const objAgentId = isObjId ? new mongoose.Types.ObjectId(agentId) : null;

    const idMatches: any[] = [{ assignedTo: agentId }, { assignedBy: agentId }];
    if (objAgentId) {
      idMatches.push({ assignedTo: objAgentId }, { assignedBy: objAgentId });
    }

    let filter: Record<string, unknown> = {
      $or: idMatches
    };

    const scope = await getAgentTerritoryScope(agentId);
    if (scope && ['state', 'district', 'division'].includes(scope.role)) {
      const territoryFilter = buildTerritoryFilter(scope);
      const subordinates = await Agent.find(territoryFilter).select('_id').lean();
      const subordinateIds = subordinates.map(s => s._id);

      filter = {
        $or: [
          ...idMatches,
          { assignedTo: { $in: subordinateIds } }
        ]
      };
    }

    if (status) filter.status = status;

    let total = 0;
    let assignments: any[] = [];

    try {
      const [countResult, findResult] = await Promise.all([
        TargetAssignment.countDocuments(filter),
        TargetAssignment.find(filter)
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
    } catch (queryErr) {
      console.warn('TargetAssignment query warning:', queryErr);
      // Fallback: try querying without populate to prevent 500 error
      try {
        assignments = await TargetAssignment.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean();
        total = assignments.length;
      } catch (fallbackErr) {
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
          const agents = await Agent.find({ _id: { $in: missingAgentIds } })
            .select('name email role territory assignedTerritory')
            .lean();
          const agtMap = new Map(agents.map(ag => [String(ag._id), ag]));
          assignments.forEach(a => {
            if (a.assignedTo && typeof a.assignedTo !== 'object') {
              a.assignedTo = agtMap.get(String(a.assignedTo)) || { name: 'Agent', role: 'pincode' };
            }
          });
        } catch (e) {}
      }

      const missingTargetIds = assignments
        .filter(a => a.target && typeof a.target !== 'object')
        .map(a => a.target);
      if (missingTargetIds.length > 0) {
        try {
          const targets = await Target.find({ _id: { $in: missingTargetIds } })
            .select('title description type targetValue')
            .lean();
          const tgtMap = new Map(targets.map(tg => [String(tg._id), tg]));
          assignments.forEach(a => {
            if (a.target && typeof a.target !== 'object') {
              a.target = tgtMap.get(String(a.target)) || { title: 'Target Goal', targetValue: 0 };
            }
          });
        } catch (e) {}
      }
    }

    return res.status(200).json({
      assignments,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get my assignments error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/targets/assignments/:id/status — update assignment status
export const updateAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { status } = req.body;
    const validStatuses = ['assigned', 'accepted', 'in_progress', 'completed', 'pending', 'overdue', 'rejected', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const assignment = await TargetAssignment.findOne({ _id: req.params.id, assignedTo: agentId });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found or access denied' });

    assignment.status = status;
    if (status === 'completed') assignment.completedAt = new Date();
    assignment.updatedAt = new Date();
    await assignment.save();

    await assignment.populate([
      { path: 'target', select: 'title type targetValue' },
      { path: 'assignedBy', select: 'name email role' }
    ]);

    // Invalidate dashboard stats cache
    await cacheService.delByPrefix('dashboard:');

    // Publish Realtime Target Status Event
    publishEntityEvent({
      event: 'ENTITY_STATUS_CHANGED',
      entity: 'target',
      entityId: assignment._id.toString(),
      action: 'status_changed',
      scope: {
        targetAgentId: assignment.assignedBy ? (assignment.assignedBy as any)._id?.toString() || assignment.assignedBy.toString() : undefined
      },
      data: {
        assignmentId: assignment._id,
        targetId: (assignment.target as any)?._id || assignment.target,
        status: assignment.status
      }
    }).catch(() => {});

    return res.status(200).json({ message: 'Assignment status updated', assignment });
  } catch (error) {
    console.error('Update assignment status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

