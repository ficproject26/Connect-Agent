import { Request, Response } from 'express';
import { z } from 'zod';
import FieldVisit from '../models/FieldVisit';
import Vendor from '../models/Vendor';

const startVisitSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID is required'),
  latitude: z.number({ required_error: 'Latitude required' }),
  longitude: z.number({ required_error: 'Longitude required' }),
  photoBeforeVisit: z.string().optional()
});

const completeVisitSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  photoAfterVisit: z.string().optional(),
  remarks: z.string().optional()
});

// POST /api/field-visits/start — check-in at a vendor store location
export const startFieldVisit = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = startVisitSchema.parse(req.body);

    const vendor = await Vendor.findById(data.vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    const visit = new FieldVisit({
      agent: agentId,
      vendor: data.vendorId,
      checkInLocation: {
        latitude: data.latitude,
        longitude: data.longitude
      },
      photoBeforeVisit: data.photoBeforeVisit,
      status: 'started',
      visitDate: new Date()
    });

    await visit.save();
    await visit.populate([
      { path: 'agent', select: 'name email role phone' },
      { path: 'vendor', select: 'storeName contactPerson phone address' }
    ]);

    return res.status(201).json({ message: 'Field visit started', visit });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Start field visit error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/field-visits/:id/complete — complete active field visit
export const completeFieldVisit = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const data = completeVisitSchema.parse(req.body);

    const visit = await FieldVisit.findOne({ _id: id, agent: agentId, status: 'started' });
    if (!visit) return res.status(404).json({ message: 'Active field visit record not found' });

    visit.status = 'completed';
    if (data.remarks) visit.remarks = data.remarks;
    if (data.photoAfterVisit) visit.photoAfterVisit = data.photoAfterVisit;
    if (data.latitude && data.longitude) {
      visit.checkOutLocation = { latitude: data.latitude, longitude: data.longitude };
    }

    await visit.save();
    await visit.populate([
      { path: 'agent', select: 'name email role' },
      { path: 'vendor', select: 'storeName contactPerson phone' }
    ]);

    return res.status(200).json({ message: 'Field visit completed successfully', visit });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Complete field visit error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/field-visits — get list of field visits
export const getFieldVisits = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '20', status, vendorId } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = { agent: agentId };
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;

    const total = await FieldVisit.countDocuments(filter);
    const visits = await FieldVisit.find(filter)
      .populate('vendor', 'storeName contactPerson phone pincode')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      visits,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get field visits error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
