import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Vendor from '../models/Vendor';
import Agent from '../models/Agent';
import { getAgentTerritoryScope, buildVendorScopeFilter, getDivisionPincodes } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';
import {
  validateAgentJurisdiction,
  validateGeographicConsistency,
  validateVendorFieldFormats
} from '../utils/territoryValidation';
import {
  formatName,
  formatPan,
  formatIfsc,
  normalizeEmail,
  sanitizeIndianMobile
} from '../utils/formValidation';
import { publishEntityEvent } from '../realtime/eventBus';

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
  name: z.string().optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  category: z.string().optional(),
  storeType: z.string().optional(),
  gst: z.string().optional(),
  businessGst: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  division: z.string().optional(),
  pincode: z.string().optional(),
  kycStatus: z.string().optional(),
  status: z.string().optional(),
  fullAddress: z.string().optional(),
  location: z.object({
    address: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional()
}).passthrough();

// GET /api/vendors — paginated list with optional filters and date range
export const getVendors = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const scope = await getAgentTerritoryScope(agentId);
    let divisionPincodes: string[] = [];
    if (scope?.role === 'division' && scope.division) {
      divisionPincodes = await getDivisionPincodes(scope.division);
    }
    const scopeFilter = buildVendorScopeFilter(scope, divisionPincodes);

    const { page = '1', limit = '50', status, category, search, startDate, endDate, dateFilter } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filterConditions: any[] = [
      scopeFilter,
      {
        $or: [
          { businessName: { $exists: true, $nin: ['', null] } },
          { name: { $exists: true, $nin: ['', null] } }
        ]
      }
    ];

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
      .select('businessName name ownerName phone email category storeType gst state district division pincode kycStatus location status documents assignedAgent joiningType createdVia registrationSource agentId onboardedBy agentName agentRegistrationId registrationId role createdAt updatedAt')
      .populate('assignedAgent', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    // Enrich assignedAgent name if populate did not resolve an agent document
    for (const v of (rawVendors as any[])) {
      if (!v.assignedAgent || typeof v.assignedAgent !== 'object' || !v.assignedAgent.name) {
        if (v.agentName && typeof v.agentName === 'string' && v.agentName.trim()) {
          v.assignedAgent = { name: v.agentName.trim(), role: 'field' };
        } else if (v.onboardedBy && typeof v.onboardedBy === 'string' && !v.onboardedBy.match(/^[0-9a-fA-F]{24}$/)) {
          v.assignedAgent = { name: v.onboardedBy.trim(), role: 'field' };
        }
      }
    }

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

    const deduplicated = Array.from(canonicalMap.values()).map((v: any) => {
      const realName = (v.businessName || v.name || '').trim();
      const rawKyc = (v.kycStatus || '').toString().toLowerCase().trim();
      let normalizedKyc = 'pending';
      if (rawKyc === 'approved' || rawKyc === 'verified') normalizedKyc = 'approved';
      else if (rawKyc === 'rejected') normalizedKyc = 'rejected';
      else if (String(v.status || '').toLowerCase() === 'approved' || String(v.status || '').toLowerCase() === 'active') normalizedKyc = 'approved';
      return {
        ...v,
        name: realName,
        businessName: realName,
        kycStatus: normalizedKyc
      };
    });
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

    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
    const query = isObjectId
      ? { $or: [{ _id: rawId }, { registrationId: rawId }] }
      : { registrationId: rawId };

    const vendor = await Vendor.findOne(query)
      .populate('assignedAgent', 'name email role phone')
      .populate('documents')
      .lean();

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
      data.email = normalizeEmail(data.email);
    }
    if ((data as any).ownerName) {
      (data as any).ownerName = formatName((data as any).ownerName);
    }
    if (data.phone) {
      data.phone = sanitizeIndianMobile(data.phone);
    }

    // 1. Strict field format validation
    const fieldValidation = validateVendorFieldFormats({
      ownerName: (data as any).ownerName || (data as any).contactPerson || req.body.ownerName || req.body.contactPerson,
      phone: data.phone,
      email: data.email,
      panNumber: (data as any).panNumber || (data as any).pan || req.body.panNumber || req.body.pan,
      aadhaarNumber: (data as any).aadhaarNumber || (data as any).aadhaar || req.body.aadhaarNumber || req.body.aadhaar,
      pincode: data.pincode,
      accountNumber: (data as any).accountNumber || (data as any).bankDetails?.accountNumber || req.body.accountNumber || req.body.bankDetails?.accountNumber,
      bankName: (data as any).bankName || (data as any).bankDetails?.bankName || req.body.bankName || req.body.bankDetails?.bankName,
      ifscCode: (data as any).ifscCode || (data as any).bankDetails?.ifscCode || req.body.ifscCode || req.body.bankDetails?.ifscCode
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
    const jurisdiction = await validateAgentJurisdiction(scope, {
      state: data.state,
      district: data.district,
      division: (data as any).division,
      pincode: data.pincode
    });
    if (!jurisdiction.valid) {
      return res.status(403).json({ message: jurisdiction.error });
    }

    // 4. Geographic Consistency Check against Admin Pincode Management DB
    const geoConsistency = await validateGeographicConsistency({
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

    // Fetch onboarding agent details
    let agentDoc: any = null;
    try {
      agentDoc = await Agent.findById(agentId);
    } catch (e) {
      // non-blocking
    }

    const rawRole = agentDoc?.role || (req as any).agent?.role || 'pincode';
    const roleLower = String(rawRole).toLowerCase();
    const formattedAgentRole = roleLower.includes('state') ? 'State Agent'
      : roleLower.includes('dist') ? 'District Agent'
      : roleLower.includes('divis') ? 'Divisional Agent'
      : 'Pincode Agent';

    const onboardingAgent = {
      id: agentDoc?.registrationId || String(agentId),
      name: agentDoc?.name || (req as any).agent?.name || 'Field Agent',
      phone: agentDoc?.phone || (agentDoc as any)?.mobile || '',
      mobile: agentDoc?.phone || (agentDoc as any)?.mobile || '',
      role: formattedAgentRole,
      tier: formattedAgentRole,
      submittedAt: new Date().toISOString()
    };

    // Dynamically resolve responsible admin using the vendor's actual business PIN code
    const db = mongoose.connection.db;
    let responsibleAdmin: any = null;
    let initialApprovalStatus = 'PENDING_PINCODE_APPROVAL';

    if (db && data.pincode) {
      const pin = String(data.pincode).trim();
      const div = String((data as any).division || '').trim();
      const dist = String(data.district || '').trim();
      const st = String(data.state || '').trim();

      // 1. Pincode Admin specifically assigned to this PIN code
      const pinAdmin = await db.collection('users').findOne({
        $and: [
          {
            $or: [
              { role: { $regex: '^pincode admin', $options: 'i' } },
              { adminRole: 'pincode-admin' },
              { role: { $regex: 'pincode.*admin', $options: 'i' } }
            ]
          },
          {
            $or: [
              { pincode: pin },
              { assignedPincode: pin }
            ]
          }
        ],
        status: { $in: ['approved', 'active'] }
      });

      if (pinAdmin) {
        responsibleAdmin = {
          id: String(pinAdmin._id || pinAdmin.id),
          adminId: String(pinAdmin._id || pinAdmin.id),
          name: pinAdmin.name,
          phone: pinAdmin.mobile || pinAdmin.phone || '',
          mobile: pinAdmin.mobile || pinAdmin.phone || '',
          email: pinAdmin.email || '',
          role: 'Pincode Admin',
          adminRole: 'pincode-admin',
          state: pinAdmin.state || st,
          district: pinAdmin.district || dist,
          division: pinAdmin.division || div,
          pincode: pin
        };
      } else if (div) {
        // 2. Division Admin
        const divAdmin = await db.collection('users').findOne({
          $or: [
            { role: { $regex: 'division.*admin', $options: 'i' } },
            { adminRole: { $regex: 'division', $options: 'i' } }
          ],
          district: { $regex: `^${dist}`, $options: 'i' },
          division: { $regex: `^${div}`, $options: 'i' },
          status: { $in: ['approved', 'active'] }
        });

        if (divAdmin) {
          responsibleAdmin = {
            id: String(divAdmin._id || divAdmin.id),
            adminId: String(divAdmin._id || divAdmin.id),
            name: divAdmin.name,
            phone: divAdmin.mobile || divAdmin.phone || '',
            role: 'Divisional Admin',
            adminRole: 'divisional-admin',
            state: divAdmin.state || st,
            district: divAdmin.district || dist,
            division: div,
            pincode: pin
          };
          initialApprovalStatus = 'PENDING_ADMIN_ASSIGNMENT';
        }
      } else if (dist) {
        // 3. District Admin
        const distAdmin = await db.collection('users').findOne({
          $or: [
            { role: { $regex: 'district.*admin', $options: 'i' } },
            { adminRole: { $regex: 'district', $options: 'i' } }
          ],
          district: { $regex: `^${dist}`, $options: 'i' },
          status: { $in: ['approved', 'active'] }
        });

        if (distAdmin) {
          responsibleAdmin = {
            id: String(distAdmin._id || distAdmin.id),
            adminId: String(distAdmin._id || distAdmin.id),
            name: distAdmin.name,
            phone: distAdmin.mobile || distAdmin.phone || '',
            role: 'District Admin',
            adminRole: 'district-admin',
            state: distAdmin.state || st,
            district: distAdmin.district || dist,
            division: div,
            pincode: pin
          };
          initialApprovalStatus = 'PENDING_ADMIN_ASSIGNMENT';
        }
      }
    }

    if (!responsibleAdmin) {
      initialApprovalStatus = 'PENDING_ADMIN_ASSIGNMENT';
    }

    const vendor = new Vendor({
      onboardingAgent,
      onboardingAgentName: onboardingAgent.name,
      onboardingAgentPhone: onboardingAgent.phone,
      onboardingAgentRole: onboardingAgent.role,
      onboardingAgentId: onboardingAgent.id,
      responsibleAdmin,
      responsibleAdminId: responsibleAdmin?.id || null,
      responsibleAdminName: responsibleAdmin?.name || null,
      responsibleAdminRole: responsibleAdmin?.role || null,
      responsibleAdminPhone: responsibleAdmin?.phone || null,
      responsibleAdminPincode: responsibleAdmin?.pincode || data.pincode,
      approvalStatus: initialApprovalStatus,
      submittedAt: new Date(),
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
              onboardingAgent,
              responsibleAdmin,
              approvalStatus: initialApprovalStatus,
              submittedAt: new Date(),
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

    // Link Field Shop Visit if fieldVisitId was provided
    const fvId = (req.body as any)?.fieldVisitId || (data as any)?.fieldVisitId;
    if (fvId && mongoose.Types.ObjectId.isValid(fvId)) {
      try {
        const FieldVisit = mongoose.model('FieldVisit');
        await FieldVisit.findByIdAndUpdate(fvId, {
          $set: {
            vendorId: vendor._id,
            vendor: vendor._id,
            onboardingStatus: 'COMPLETED'
          }
        });
      } catch (fvErr) {
        console.warn('Could not link field visit to newly created vendor:', fvErr);
      }
    }

    // Publish Realtime Entity Event
    publishEntityEvent({
      event: 'ENTITY_CREATED',
      entity: 'vendor',
      entityId: vendor._id.toString(),
      action: 'created',
      scope: {
        state: vendor.state,
        district: vendor.district,
        division: (vendor as any).division,
        pincode: vendor.pincode
      },
      data: {
        _id: vendor._id,
        registrationId: (vendor as any).registrationId,
        businessName: vendor.businessName,
        status: vendor.status,
        kycStatus: vendor.kycStatus
      }
    }).catch(() => {});

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
    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
    const query = isObjectId
      ? { $or: [{ _id: rawId }, { registrationId: rawId }] }
      : { registrationId: rawId };

    const existingVendor = await Vendor.findOne(query);
    if (!existingVendor) return res.status(404).json({ message: 'Vendor not found' });

    const currentKyc = (existingVendor.kycStatus || '').toLowerCase().trim();
    if (currentKyc === 'approved' || currentKyc === 'verified') {
      return res.status(403).json({
        message: 'Modifications locked: Cannot edit vendor details once KYC status is Approved.'
      });
    }

    // Field format validation
    const fieldValidation = validateVendorFieldFormats({
      ownerName: (data as any).ownerName || (data as any).name || (data as any).contactPerson || req.body.ownerName || req.body.name || req.body.contactPerson,
      phone: data.phone,
      email: data.email,
      panNumber: (data as any).panNumber || (data as any).pan || (data as any).businessGst || req.body.panNumber || req.body.pan,
      aadhaarNumber: (data as any).aadhaarNumber || (data as any).aadhaar || req.body.aadhaarNumber || req.body.aadhaar,
      pincode: data.pincode,
      accountNumber: (data as any).accountNumber || (data as any).bankDetails?.accountNumber || req.body.accountNumber || req.body.bankDetails?.accountNumber,
      bankName: (data as any).bankName || (data as any).bankDetails?.bankName || req.body.bankName || req.body.bankDetails?.bankName,
      ifscCode: (data as any).ifscCode || (data as any).bankDetails?.ifscCode || req.body.ifscCode || req.body.bankDetails?.ifscCode
    });
    if (!fieldValidation.valid) {
      return res.status(400).json({ message: fieldValidation.error });
    }

    if (data.email) {
      data.email = normalizeEmail(data.email);
    }
    if ((data as any).ownerName) {
      (data as any).ownerName = formatName((data as any).ownerName);
    }
    if (data.phone) {
      data.phone = sanitizeIndianMobile(data.phone);
    }

    const updateFields: any = { ...data, updatedAt: new Date() };
    // Prevent privilege escalation or unauthorized status bypass via updateVendor
    delete updateFields.status;
    delete updateFields.kycStatus;
    delete updateFields.role;

    if (data.businessName && !data.name) {
      updateFields.name = data.businessName;
    }
    if ((data as any).name && !data.businessName) {
      updateFields.businessName = (data as any).name;
    }
    if ((data as any).fullAddress) {
      updateFields.location = {
        ...(updateFields.location || {}),
        address: (data as any).fullAddress
      };
    }

    const vendor = await Vendor.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('category', 'name').populate('assignedAgent', 'name email role phone');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Invalidate dashboard and hierarchy caches
    await Promise.all([
      cacheService.delByPrefix('dashboard:'),
      cacheService.delByPrefix('hierarchy:')
    ]);

    // Publish Realtime Entity Event
    publishEntityEvent({
      event: 'ENTITY_UPDATED',
      entity: 'vendor',
      entityId: vendor._id.toString(),
      action: 'updated',
      scope: {
        state: vendor.state,
        district: vendor.district,
        division: (vendor as any).division,
        pincode: vendor.pincode
      },
      data: {
        _id: vendor._id,
        registrationId: (vendor as any).registrationId,
        businessName: vendor.businessName,
        status: vendor.status,
        kycStatus: vendor.kycStatus
      }
    }).catch(() => {});

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

    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
    const query = isObjectId
      ? { $or: [{ _id: rawId }, { registrationId: rawId }] }
      : { registrationId: rawId };

    const vendor = await Vendor.findOneAndUpdate(
      query,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).populate('category', 'name');

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // Invalidate dashboard and hierarchy caches
    await Promise.all([
      cacheService.delByPrefix('dashboard:'),
      cacheService.delByPrefix('hierarchy:')
    ]);

    // Publish Realtime Entity Event
    publishEntityEvent({
      event: 'ENTITY_STATUS_CHANGED',
      entity: 'vendor',
      entityId: vendor._id.toString(),
      action: 'status_changed',
      scope: {
        state: vendor.state,
        district: vendor.district,
        division: (vendor as any).division,
        pincode: vendor.pincode
      },
      data: {
        _id: vendor._id,
        registrationId: (vendor as any).registrationId,
        status: vendor.status
      }
    }).catch(() => {});

    return res.status(200).json({ message: 'Vendor status updated', vendor });
  } catch (error) {
    console.error('Update vendor status error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
