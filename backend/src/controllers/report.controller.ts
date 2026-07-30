import { Request, Response } from 'express';
import { z } from 'zod';
import Report from '../models/Report';

const createReportSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'vendor', 'performance', 'visit']),
  content: z.record(z.unknown()),
  remarks: z.string().optional()
});

const reviewReportSchema = z.object({
  remarks: z.string().min(1, 'Review remarks required')
});

// GET /api/reports
export const getReports = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '20', type } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = { agent: agentId };
    if (type) filter.type = type;

    const total = await Report.countDocuments(filter);
    const reports = await Report.find(filter)
      .populate('agent', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      reports,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/:id
export const getReportById = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const report = await Report.findOne({ _id: req.params.id, agent: agentId })
      .populate('agent', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!report) return res.status(404).json({ message: 'Report not found or access denied' });
    return res.status(200).json({ report });
  } catch (error) {
    console.error('Get report by id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports
export const createReport = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = createReportSchema.parse(req.body);

    const report = new Report({ ...data, agent: agentId });
    await report.save();
    await report.populate('agent', 'name email role');

    return res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create report error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/reports/:id/review — senior agent reviews a report
export const reviewReport = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { remarks } = reviewReportSchema.parse(req.body);

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { remarks, reviewedBy: agentId, reviewedAt: new Date() },
      { new: true }
    )
      .populate('agent', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!report) return res.status(404).json({ message: 'Report not found' });
    return res.status(200).json({ message: 'Report reviewed', report });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Review report error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
