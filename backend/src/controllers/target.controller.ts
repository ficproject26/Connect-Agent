import { Request, Response } from 'express';
import { z } from 'zod';
import Target from '../models/Target';
import TargetAssignment from '../models/TargetAssignment';
import Agent from '../models/Agent';
import Notification from '../models/Notification';

const createTargetSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  targetValue: z.number().positive('Target value must be positive')
});

const assignTargetSchema = z.object({
  assignedTo: z.string().min(1, 'assignedTo agent ID required'),
  dueDate: z.string().min(1, 'Due date required')
});

const allocateTargetSchema = z.object({
  assignedTo: z.string().optional(),
  divisionName: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('daily'),
  targetValue: z.number().positive('Target value must be positive'),
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
      .limit(limitNum);

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

    let targetAgentId = data.assignedTo;
    let recipientName = data.divisionName || 'Division Agent';

    if (!targetAgentId && data.divisionName) {
      const matchedAgent = await Agent.findOne({
        $or: [
          { name: new RegExp(data.divisionName, 'i') },
          { 'territory.name': new RegExp(data.divisionName, 'i') }
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
    }

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
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const currentAgent = await Agent.findById(agentId);
    const userRole = currentAgent?.role || (req as any).agent?.role || 'district';

    const subordinateQuery: Record<string, unknown> = {};
    if (userRole === 'state') {
      subordinateQuery.role = { $in: ['district', 'division', 'pincode'] };
    } else if (userRole === 'district') {
      subordinateQuery.role = { $in: ['division', 'pincode'] };
    } else if (userRole === 'division') {
      subordinateQuery.role = 'pincode';
    } else {
      subordinateQuery.role = 'pincode';
    }

    const subordinates = await Agent.find(subordinateQuery)
      .select('_id name role territory email phone')
      .lean();

    return res.status(200).json({ subordinates });
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

    return res.status(201).json({ message: 'Target assigned successfully', assignment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Assign target error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/targets/assignments/mine — list assignments for the current agent
export const getMyAssignments = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '20', status } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = { assignedTo: agentId };
    if (status) filter.status = status;

    const total = await TargetAssignment.countDocuments(filter);
    const assignments = await TargetAssignment.find(filter)
      .populate('target', 'title description type targetValue')
      .populate('assignedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

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
    const validStatuses = ['assigned', 'accepted', 'in_progress', 'completed', 'pending', 'overdue'];
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

    return res.status(200).json({ message: 'Assignment status updated', assignment });
  } catch (error) {
    console.error('Update assignment status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

