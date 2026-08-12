import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import Vendor from '../models/Vendor';

const createVendorSchema = z.object({
  businessName: z.string().min(1, 'Business name required'),
  ownerName: z.string().optional(),
  phone: z.string().min(10, 'Valid phone required'),
  email: z.string().optional(),
  category: z.string().optional(),
  gst: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  division: z.string().optional(),
  pincode: z.string().optional(),
  kycStatus: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional()
});

const updateVendorSchema = z.object({
  businessName: z.string().optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  gst: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  division: z.string().optional(),
  pincode: z.string().optional(),
  kycStatus: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional()
});

// GET /api/vendors — paginated list with optional filters
export const getVendors = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '50', status, category, search } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { businessName: { $regex: search as string, $options: 'i' } },
        { ownerName: { $regex: search as string, $options: 'i' } },
        { 'location.address': { $regex: search as string, $options: 'i' } }
      ];
    }

    const total = await Vendor.countDocuments(filter);
    const vendors = await Vendor.find(filter)
      .populate('assignedAgent', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      vendors,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/vendors/:id
export const getVendorById = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const vendor = await Vendor.findById(req.params.id)
      .populate('assignedAgent', 'name email role phone')
      .populate('documents');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    return res.status(200).json({ vendor });
  } catch (error) {
    console.error('Get vendor by id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/vendors
export const createVendor = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = createVendorSchema.parse(req.body);

    const vendor = new Vendor({
      ...data,
      ownerName: data.ownerName || 'Merchant Owner',
      location: {
        address: data.location?.address || `${data.district || ''}, ${data.state || ''} ${data.pincode || ''}`,
        latitude: data.location?.latitude || 0,
        longitude: data.location?.longitude || 0
      },
      assignedAgent: agentId,
      joiningType: 'agent',
      createdVia: 'agent',
      status: 'pending',
      kycStatus: 'pending'
    });

    await vendor.save();

    // Also sync vendor to users collection for Admin Portal join requests
    try {
      const db = mongoose.connection.db;
      const vendorEmail = data.email ? data.email.toLowerCase() : '';
      if (db && vendorEmail) {
        await db.collection('users').updateOne(
          { email: vendorEmail },
          {
            $set: {
              name: data.businessName || (data as any).name || data.ownerName,
              businessName: data.businessName || (data as any).name,
              contactPerson: data.ownerName || (data as any).contactPerson || (data as any).name,
              email: vendorEmail,
              phone: data.phone || '',
              role: 'Vendor',
              vendorType: data.category || 'General Store',
              category: data.category || 'General Store',
              status: 'pending',
              kycStatus: 'pending',
              joiningType: 'agent',
              createdVia: 'agent',
              assignedAgent: agentId,
              agentId: agentId,
              onboardedBy: agentId,
              assignedState: data.state || '',
              assignedDistrict: data.district || '',
              assignedDivision: (data as any).division || '',
              pincode: data.pincode || '',
              address: data.location?.address || `${data.district || ''}, ${data.state || ''} ${data.pincode || ''}`,
              registrationId: (vendor as any).registrationId || `REG-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`,
              createdAt: new Date()
            }
          },
          { upsert: true }
        );
      }
    } catch (syncErr) {
      console.error('Error syncing vendor to admin users collection:', syncErr);
    }
    return res.status(201).json({ message: 'Vendor created successfully', vendor });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create vendor error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/vendors/:id
export const updateVendor = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = updateVendorSchema.parse(req.body);

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    return res.status(200).json({ message: 'Vendor updated', vendor });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Update vendor error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/vendors/:id/status
export const updateVendorStatus = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { status } = req.body;
    const validStatuses = ['pending', 'verified', 'active', 'inactive'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('category', 'name');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    return res.status(200).json({ message: 'Vendor status updated', vendor });
  } catch (error) {
    console.error('Update vendor status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
