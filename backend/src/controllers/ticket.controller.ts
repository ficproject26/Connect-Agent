import { Request, Response } from 'express';
import { z } from 'zod';
import Ticket from '../models/Ticket';

// Simple unique ticket ID generator — no extra dependency needed
const generateTicketId = () =>
  `TKT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const createTicketSchema = z.object({
  category: z.string().min(1, 'Category required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

// GET /api/tickets
export const getTickets = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentRole = (req as any).agent?.role;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '20', status, priority, mine } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {};
    const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';

    if (mine === 'true') {
      filter.creator = agentId;
    } else if (!isAdminOrExecutive) {
      filter.$or = [{ creator: agentId }, { assignedTo: agentId }];
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('creator', 'name email role')
      .populate('assignedTo', 'name email role')
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

    const ticket = new Ticket({
      ...data,
      ticketId: generateTicketId(),
      creator: agentId,
      status: 'open',
      priority: data.priority ?? 'medium'
    });

    await ticket.save();
    await ticket.populate('creator', 'name email role');

    return res.status(201).json({ message: 'Support ticket created', ticket });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
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

    const { status, resolutionDetails } = req.body;
    const validStatuses = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const isAdminOrExecutive = agentRole === 'admin' || agentRole === 'executive';
    const filter: any = { _id: req.params.id };
    if (!isAdminOrExecutive) {
      filter.$or = [{ creator: agentId }, { assignedTo: agentId }];
    }

    const ticket = await Ticket.findOne(filter);

    if (!ticket) return res.status(404).json({ message: 'Ticket not found or access denied' });

    ticket.status = status;
    if (resolutionDetails) ticket.resolutionDetails = resolutionDetails;
    ticket.updatedAt = new Date();
    await ticket.save();

    await ticket.populate([
      { path: 'creator', select: 'name email role' },
      { path: 'assignedTo', select: 'name email role' }
    ]);

    return res.status(200).json({ message: 'Ticket status updated', ticket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
