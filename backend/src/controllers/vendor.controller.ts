import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Vendor from '../models/Vendor';
import { getAgentTerritoryScope, buildVendorScopeFilter } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';
import {
  validateAgentJurisdiction,
  validateGeographicConsistency,
  validateVendorFieldFormats
} from '../utils/territoryValidation';

const createVendorSchema = z.object({
  businessName: z.string().optional(),
  name: z.string().optional(),
  ownerName: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  category: z.string().optional(),
  storeType: z.string().optional(),
  gst: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  division: z.string().optional(),
  pincode: z.string().optional(),
  kycStatus: z.string().optional(),
  status: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional()
}).passthrough();

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

// GET /api/vendors — paginated list with optional filters and date range
export const getVendors = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const scope = await getAgentTerritoryScope(agentId);
    const scopeFilter = buildVendorScopeFilter(scope);

    const { page = '1', limit = '50', status, category, search, startDate, endDate, dateFilter } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filterConditions: any[] = [scopeFilter];

    if (status && status !== 'all') {
      filterConditions.push({ status: { $regex: new RegExp(`^${status}$`, 'i') } });
    }
    if (category && category !== 'all') {
      filterConditions.push({
        $or: [
          { category: { $regex: new RegExp(`^${category}$`, 'i') } },
          { storeType: { $regex: new RegExp(`^${category}$`, 'i') } }
        ]
      });
    }
    if (search) {
      const s = String(search).trim();
      filterConditions.push({
        $or: [
          { businessName: { $regex: s, $options: 'i' } },
          { ownerName: { $regex: s, $options: 'i' } },
          { phone: { $regex: s, $options: 'i' } },
          { registrationId: { $regex: s, $options: 'i' } },
          { gst: { $regex: s, $options: 'i' } },
          { 'location.address': { $regex: s, $options: 'i' } }
        ]
      });
    }

    // Date Range Period filtering on createdAt
    const dateConditions: Record<string, unknown> = {};
    if (startDate) {
      const s = new Date(startDate as string);
      if (!isNaN(s.getTime())) dateConditions.$gte = s;
    }
    if (endDate) {
      const e = new Date(endDate as string);
      if (!isNaN(e.getTime())) dateConditions.$lte = e;
    }
    if (!startDate && !endDate && dateFilter && dateFilter !== 'all') {
      const now = new Date();
      if (dateFilter === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        dateConditions.$gte = startOfToday;
        dateConditions.$lte = endOfToday;
      } else if (dateFilter === 'yesterday') {
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        dateConditions.$gte = startOfYesterday;
        dateConditions.$lte = endOfYesterday;
      } else if (dateFilter === '7days') {
        dateConditions.$gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === '30days') {
        dateConditions.$gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateFilter === 'this_month') {
        // First day of current calendar month at 00:00:00 through last day of current calendar month at 23:59:59.999
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateConditions.$gte = startOfMonth;
        dateConditions.$lte = endOfMonth;
      } else if (dateFilter === 'last_month') {
        const startOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        const endOfLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        dateConditions.$gte = startOfLast;
        dateConditions.$lte = endOfLast;
      } else if (dateFilter === 'this_year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateConditions.$gte = startOfYear;
        dateConditions.$lte = endOfYear;
      }
    }

    if (Object.keys(dateConditions).length > 0) {
      filterConditions.push({ createdAt: dateConditions });
    }

    const finalFilter = filterConditions.length === 1 ? filterConditions[0] : { $and: filterConditions };

    const rawVendors = await Vendor.find(finalFilter)
      .select('businessName ownerName phone email category storeType gst state district division pincode kycStatus location status documents assignedAgent joiningType createdVia registrationSource agentId onboardedBy agentName agentRegistrationId registrationId role createdAt updatedAt')
      .populate('assignedAgent', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Deduplicate vendor records that represent the exact same vendor registration,
    // ensuring the application returns the canonical record.
    const canonicalMap = new Map<string, any>();
    for (const v of rawVendors) {
      const gst = v.gst ? v.gst.trim().toUpperCase() : '';
      const phone = v.phone ? v.phone.replace(/\D/g, '') : '';
      const pin = v.pincode ? v.pincode.trim() : '';
      const name = (v.businessName || (v as any).name || '').trim().toLowerCase();

      // Canonical key for a single business establishment registration:
      // Preserves separate valid registrations for different branches/locations
      const canonicalKey = (phone && pin && name)
        ? `VENDOR_${phone}_${pin}_${name}`
        : (v.registrationId ? `REG_${v.registrationId}` : `ID_${v._id}`);

      if (!canonicalMap.has(canonicalKey)) {
        canonicalMap.set(canonicalKey, v);
      } else {
        // If duplicate records exist in the DB, prefer active / approved status or earlier registration
        const existing = canonicalMap.get(canonicalKey);
        const isExistingApproved = (existing.status || '').toLowerCase() === 'active' || existing.kycStatus === 'approved';
        const isCurrentApproved = (v.status || '').toLowerCase() === 'active' || v.kycStatus === 'approved';
        if (!isExistingApproved && isCurrentApproved) {
          canonicalMap.set(canonicalKey, v);
        }
      }
    }

    const deduplicated = Array.from(canonicalMap.values());
    const total = deduplicated.length;
    const paginatedVendors = deduplicated.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.status(200).json({
      vendors: paginatedVendors,
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
    if (data.email) {
      data.email = data.email.toLowerCase().trim();
    }

    // 1. Strict field format validation
    const fieldValidation = validateVendorFieldFormats({
      phone: data.phone,
      email: data.email,
      panNumber: (data as any).panNumber || (data as any).pan,
      aadhaarNumber: (data as any).aadhaarNumber || (data as any).aadhaar,
      pincode: data.pincode
    });
    if (!fieldValidation.valid) {
      return res.status(400).json({ message: fieldValidation.error });
    }

    // 2. Fetch Logged-in Agent's Approved Territory Scope
    const scope = await getAgentTerritoryScope(agentId);
    if (!scope) {
      return res.status(403).json({ message: 'Agent territory profile could not be determined.' });
    }

    // 3. Security Check: Verify Requested Territory Belongs to Agent's Allowed Jurisdiction
    const jurisdiction = validateAgentJurisdiction(scope, {
      state: data.state,
      district: data.district,
      division: (data as any).division,
      pincode: data.pincode
    });
    if (!jurisdiction.valid) {
      return res.status(403).json({ message: jurisdiction.error });
    }

    // 4. Geographic Consistency Check
    const geoConsistency = validateGeographicConsistency({
      state: data.state,
      district: data.district,
      division: (data as any).division,
      pincode: data.pincode
    });
    if (!geoConsistency.consistent) {
      return res.status(400).json({ message: geoConsistency.error });
    }

    // 5. Prevent duplicate vendor registration insertion
    const normPhone = (data.phone || '').replace(/\D/g, '');
    const normPin = (data.pincode || '').trim();
    const normName = (data.businessName || (data as any).name || '').trim();
    const normGst = (data.gst || '').trim().toUpperCase();

    let existingVendor = null;
    if (normGst && normPin) {
      existingVendor = await Vendor.findOne({ gst: normGst, pincode: normPin }).populate('assignedAgent', 'name email role');
    }
    if (!existingVendor && normPhone && normPin && normName) {
      existingVendor = await Vendor.findOne({
        phone: normPhone,
        pincode: normPin,
        businessName: { $regex: new RegExp(`^${normName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      }).populate('assignedAgent', 'name email role');
    }

    if (existingVendor) {
      return res.status(200).json({
        message: 'Vendor already registered with this jurisdiction details',
        vendor: existingVendor,
        isExisting: true
      });
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const generatedRegId = `REG-${dateStr}-${randDigits}`;

    const vendor = new Vendor({
      ...data,
      businessName: data.businessName || (data as any).name || 'Merchant Store',
      ownerName: data.ownerName || (data as any).contactPerson || 'Merchant Owner',
      location: {
        address: data.location?.address || `${(data as any).buildingNo ? `${(data as any).buildingNo}, ` : ''}${(data as any).streetName ? `${(data as any).streetName}, ` : ''}${(data as any).postOffice ? `${(data as any).postOffice}, ` : ''}${(data as any).taluk ? `${(data as any).taluk}, ` : ''}${data.district || ''}, ${data.state || ''} - ${data.pincode || ''}`,
        latitude: data.location?.latitude || 0,
        longitude: data.location?.longitude || 0
      },
      assignedAgent: agentId,
      agentId: agentId,
      onboardedBy: agentId,
      joiningType: 'agent',
      createdVia: 'agent',
      registrationSource: 'agent',
      registrationId: generatedRegId,
      role: 'Vendor',
      status: 'pending',
      kycStatus: 'pending'
    });

    await vendor.save();

    // Also sync vendor to users collection for Admin Portal join requests
    try {
      const db = mongoose.connection.db;
      const vendorEmail = data.email ? data.email.toLowerCase() : `vendor_${Date.now()}@connect.app`;
      const salt = await bcrypt.genSalt(10);
      const defaultHashedPassword = await bcrypt.hash('Vendor@12345', salt);

      if (db) {
        await db.collection('users').updateOne(
          { email: vendorEmail },
          {
            $set: {
              name: data.businessName || (data as any).name || data.ownerName || 'Merchant Vendor',
              businessName: data.businessName || (data as any).name || data.ownerName || 'Merchant Store',
              contactPerson: data.ownerName || (data as any).contactPerson || (data as any).name || 'Owner',
              email: vendorEmail,
              phone: data.phone || undefined,
              password: defaultHashedPassword,
              role: 'Vendor',
              vendorType: data.category || (data as any).storeType || 'Services',
              category: data.category || (data as any).storeType || 'Services',
              status: 'pending',
              kycStatus: 'pending',
              joiningType: 'agent',
              createdVia: 'agent',
              registrationSource: 'agent',
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
        ).catch(() => {});
      }
    } catch (syncErr) {
      console.error('Error syncing vendor to admin users collection:', syncErr);
    }
    // Invalidate dashboard and hierarchy caches on new vendor onboarding
    await Promise.all([
      cacheService.delByPrefix('dashboard:'),
      cacheService.delByPrefix('hierarchy:')
    ]);

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

    // Invalidate dashboard and hierarchy caches
    await Promise.all([
      cacheService.delByPrefix('dashboard:'),
      cacheService.delByPrefix('hierarchy:')
    ]);

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

    // Invalidate dashboard and hierarchy caches
    await Promise.all([
      cacheService.delByPrefix('dashboard:'),
      cacheService.delByPrefix('hierarchy:')
    ]);

    return res.status(200).json({ message: 'Vendor status updated', vendor });
  } catch (error) {
    console.error('Update vendor status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
