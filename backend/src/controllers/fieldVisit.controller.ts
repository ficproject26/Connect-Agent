import { Request, Response } from 'express';
import { z } from 'zod';
import FieldVisit from '../models/FieldVisit';
import Vendor from '../models/Vendor';
import Agent from '../models/Agent';
import { getAgentTerritoryScope, buildTerritoryFilter } from '../utils/territoryScope';

const startVisitSchema = z.object({
  vendorId: z.string().min(1, 'Vendor ID is required'),
  latitude: z.number({ required_error: 'Latitude required' }),
  longitude: z.number({ required_error: 'Longitude required' }),
  accuracy: z.number().optional(),
  photoBeforeVisit: z.string().optional()
});

const completeVisitSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
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
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date()
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

// POST /api/field-visits/:id/complete — complete active field visit (idempotent)
export const completeFieldVisit = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    if (!agentId && !agentEmail) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    const data = completeVisitSchema.parse(req.body);

    // Look up visit by ID (support ObjectId or string)
    let visit = await FieldVisit.findById(id);
    if (!visit) {
      return res.status(404).json({ message: 'Field visit record not found' });
    }

    // Check authorization: must be the visiting agent or authorized superior
    const visitAgentStr = String(visit.agent);
    if (visitAgentStr !== String(agentId)) {
      const scope = await getAgentTerritoryScope(agentId, agentEmail);
      if (!scope) {
        return res.status(403).json({ message: 'Forbidden: Unauthorized to complete this field visit' });
      }
    }

    // Idempotency: If already completed, return existing completed record without duplicate mutation
    if (visit.status === 'completed') {
      await visit.populate([
        { path: 'agent', select: 'name email role phone' },
        { path: 'vendor', select: 'storeName contactPerson phone address' }
      ]);
      return res.status(200).json({
        message: 'Field visit is already completed',
        visit,
        alreadyCompleted: true
      });
    }

    // Mark completed with checkout location and timestamp
    visit.status = 'completed';
    visit.completedAt = new Date();
    if (data.remarks) visit.remarks = data.remarks;
    if (data.photoAfterVisit) visit.photoAfterVisit = data.photoAfterVisit;
    if (data.latitude !== undefined && data.longitude !== undefined) {
      visit.checkOutLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date()
      };
    }

    await visit.save();
    await visit.populate([
      { path: 'agent', select: 'name email role phone' },
      { path: 'vendor', select: 'storeName contactPerson phone address' }
    ]);

    return res.status(200).json({
      message: 'Field visit completed successfully',
      visit
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Complete field visit error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

import mongoose from 'mongoose';

// GET /api/field-visits — get list of field visits with territory cascading filters and authorization
export const getFieldVisits = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    const agentRole = (req as any).agent?.role;
    if (!agentId && !agentEmail) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '100', status, vendorId, agent: specificAgent, district, division, pincode, startDate, endDate, date } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = {};
    const scope = await getAgentTerritoryScope(agentId, agentEmail);
    if (!scope) return res.status(403).json({ message: 'Forbidden: Missing territory scope' });

    // Build list of allowed agent ids based on territory hierarchy
    const territoryFilter = buildTerritoryFilter(scope);
    const subordinates = await Agent.find(territoryFilter).select('_id email').lean();
    const allowedAgentIds = new Set([agentId, ...subordinates.map(s => String(s._id))]);
    const queryIds: any[] = [];
    for (const id of allowedAgentIds) {
      queryIds.push(id);
      if (mongoose.Types.ObjectId.isValid(id)) {
        queryIds.push(new mongoose.Types.ObjectId(id));
      }
    }

    // Role-based territory scoping
    if (scope.role === 'pincode' || agentRole === 'pincode' || agentRole === 'delivery_partner' || agentRole === 'technician') {
      const pinConds: any[] = [
        { agent: { $in: queryIds } },
        { recordedById: agentId },
        { managerId: agentId }
      ];
      if (scope.pincode) {
        pinConds.push({ pincode: scope.pincode }, { pincodeCode: scope.pincode });
      }
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: pinConds });
    } else if (scope.role === 'division') {
      const divConds: any[] = [
        { agent: { $in: queryIds } },
        { recordedById: { $in: queryIds } },
        { managerId: { $in: queryIds } }
      ];
      if (scope.division) {
        const cleanDiv = scope.division.replace(/\s+division$/i, '').trim();
        divConds.push(
          { division: new RegExp(cleanDiv, 'i') },
          { 'assignedTerritory.division': new RegExp(cleanDiv, 'i') }
        );
      }
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: divConds });
    } else if (scope.role === 'district') {
      const distConds: any[] = [
        { agent: { $in: queryIds } },
        { recordedById: { $in: queryIds } },
        { managerId: { $in: queryIds } }
      ];
      if (scope.district) {
        const cleanD = scope.district.replace(/\s+district$/i, '').trim();
        distConds.push(
          { district: new RegExp(cleanD, 'i') },
          { 'assignedTerritory.district': new RegExp(cleanD, 'i') }
        );
        try {
          const db = mongoose.connection.db;
          if (db) {
            const dDoc = await db.collection('districts').findOne({ name: new RegExp(`^${cleanD}$`, 'i') });
            if (dDoc) {
              distConds.push({ districtId: String(dDoc._id) }, { districtId: dDoc._id });
            }
          }
        } catch (_) {}
      }
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: distConds });
    } else if (scope.role === 'state') {
      const stateConds: any[] = [
        { agent: { $in: queryIds } },
        { recordedById: { $in: queryIds } },
        { managerId: { $in: queryIds } }
      ];
      if (scope.state) {
        const cleanS = scope.state.replace(/\s+state$/i, '').trim();
        stateConds.push(
          { state: new RegExp(cleanS, 'i') },
          { 'assignedTerritory.state': new RegExp(cleanS, 'i') }
        );
        try {
          const db = mongoose.connection.db;
          if (db) {
            const sDoc = await db.collection('states').findOne({ name: new RegExp(`^${cleanS}$`, 'i') });
            if (sDoc) {
              stateConds.push({ stateId: String(sDoc._id) }, { stateId: sDoc._id });
            }
          }
        } catch (_) {}
      }
      filter.$and = filter.$and || [];
      filter.$and.push({ $or: stateConds });
    }

    if (specificAgent && specificAgent !== 'all') {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { agent: specificAgent },
          { recordedById: specificAgent },
          { managerId: specificAgent },
          { recordedByName: new RegExp(String(specificAgent), 'i') }
        ]
      });
    }

    if (status && status !== 'all') {
      if (status === 'in_progress') {
        filter.status = { $in: ['in_progress', 'started'] };
      } else {
        filter.status = status;
      }
    }
    if (vendorId) filter.vendor = vendorId;

    // Optional Date filtering
    if (date || startDate || endDate) {
      const dateFilterObj: any = {};
      if (date) {
        const dStart = new Date(date as string);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(date as string);
        dEnd.setHours(23, 59, 59, 999);
        dateFilterObj.$gte = dStart;
        dateFilterObj.$lte = dEnd;
      } else {
        if (startDate) {
          const s = new Date(startDate as string);
          s.setHours(0, 0, 0, 0);
          dateFilterObj.$gte = s;
        }
        if (endDate) {
          const e = new Date(endDate as string);
          e.setHours(23, 59, 59, 999);
          dateFilterObj.$lte = e;
        }
      }
      filter.$or = [
        { visitDate: dateFilterObj },
        { createdAt: dateFilterObj }
      ];
    }

    // Optional drill-down filters
    if (district && district !== 'all') {
      const baseDist = (district as string).replace(/\s+district$/i, '').trim();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { district: new RegExp(baseDist, 'i') },
          { 'vendor.district': new RegExp(baseDist, 'i') }
        ]
      });
    }
    if (division && division !== 'all') {
      const baseDiv = (division as string).replace(/\s+division$/i, '').trim();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { division: new RegExp(baseDiv, 'i') },
          { 'vendor.division': new RegExp(baseDiv, 'i') }
        ]
      });
    }
    if (pincode && pincode !== 'all') {
      const cleanP = (pincode as string).trim();
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { pincode: cleanP },
          { pincodeCode: cleanP },
          { 'vendor.pincode': cleanP }
        ]
      });
    }

    const total = await FieldVisit.countDocuments(filter);
    const rawVisits = await FieldVisit.find(filter)
      .populate('agent', 'name email role phone territory assignedTerritory registrationId')
      .populate('vendor', 'storeName businessName contactPerson phone pincode address district division state')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Normalize visits to guarantee agent and vendor fields are populated even for legacy records
    const visits = rawVisits.map((v: any) => {
      const normalizedAgent = v.agent || {
        _id: v.recordedById || v.managerId || 'AGENT-REF',
        name: v.recordedByName || v.managerName || 'Field Agent',
        role: v.recordedByRole || v.managerRole || 'pincode',
        phone: ''
      };

      const normalizedVendor = v.vendor || {
        _id: v.vendorId || v.id || v._id,
        storeName: v.shopName || 'Store Location',
        businessName: v.shopName || 'Store Location',
        address: v.address || v.notes || '',
        state: v.state || scope.state,
        district: v.district || scope.district,
        division: v.division || scope.division,
        pincode: v.pincode || v.pincodeCode || scope.pincode
      };

      return {
        ...v,
        agent: normalizedAgent,
        vendor: normalizedVendor,
        state: v.state || normalizedVendor.state,
        district: v.district || normalizedVendor.district,
        division: v.division || normalizedVendor.division,
        pincode: v.pincode || v.pincodeCode || normalizedVendor.pincode,
        status: (v.status || '').toLowerCase() === 'started' ? 'in_progress' : v.status
      };
    });

    return res.status(200).json({
      visits,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get field visits error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/field-visits/agents — list cascading eligible agents strictly scoped to territory
export const getFieldVisitAgents = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    if (!agentId && !agentEmail) return res.status(401).json({ message: 'Unauthorized' });

    const scope = await getAgentTerritoryScope(agentId, agentEmail);
    if (!scope) return res.status(403).json({ message: 'Unauthorized territory' });

    const { role = 'division', district, division } = req.query;
    const rClean = (role as string).toLowerCase().trim();

    let reqDistrict = (district as string || '').trim();
    let reqDivision = (division as string || '').trim();

    // If district is an ID, resolve to canonical district name
    if (reqDistrict && reqDistrict !== 'all' && mongoose.isValidObjectId(reqDistrict)) {
      const foundA = await Agent.findById(reqDistrict).select('assignedTerritory territory').lean();
      if (foundA) {
        reqDistrict = foundA.assignedTerritory?.district || foundA.territory?.district || reqDistrict;
      } else {
        const db = mongoose.connection.db;
        if (db) {
          const foundU = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(reqDistrict) });
          if (foundU) {
            reqDistrict = foundU.assignedTerritory?.district || foundU.territory?.district || foundU.district || reqDistrict;
          }
        }
      }
    }

    // If division is an ID, resolve to canonical division name
    if (reqDivision && reqDivision !== 'all' && mongoose.isValidObjectId(reqDivision)) {
      const foundA = await Agent.findById(reqDivision).select('assignedTerritory territory').lean();
      if (foundA) {
        reqDivision = foundA.assignedTerritory?.division || foundA.territory?.division || reqDivision;
      } else {
        const db = mongoose.connection.db;
        if (db) {
          const foundU = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(reqDivision) });
          if (foundU) {
            reqDivision = foundU.assignedTerritory?.division || foundU.territory?.division || foundU.division || reqDivision;
          }
        }
      }
    }

    // Enforce role hierarchy access:
    // District agent cannot query other districts
    if (scope.role === 'district' && reqDistrict) {
      const scopeDist = scope.district.toLowerCase();
      const checkDist = reqDistrict.replace(/\s+district$/i, '').trim().toLowerCase();
      if (!scopeDist.includes(checkDist) && !checkDist.includes(scopeDist)) {
        return res.status(403).json({ message: 'Access denied outside assigned district' });
      }
    }
    // Division agent can only query within assigned division
    if (scope.role === 'division' && reqDivision) {
      const scopeDiv = scope.division.toLowerCase();
      const checkDiv = reqDivision.replace(/\s+division$/i, '').trim().toLowerCase();
      if (!scopeDiv.includes(checkDiv) && !checkDiv.includes(scopeDiv)) {
        return res.status(403).json({ message: 'Access denied outside assigned division' });
      }
    }

    const filter: any = buildTerritoryFilter(scope);
    filter.status = { $nin: ['rejected', 'suspended'] };

    // Apply role filter
    let rolePatterns = [rClean];
    if (rClean === 'district') {
      rolePatterns = ['district', 'district_agent', 'district_lead', 'district admin'];
    } else if (rClean === 'division') {
      rolePatterns = ['division', 'division_agent', 'division_lead', 'division_manager'];
    } else if (rClean === 'pincode') {
      rolePatterns = ['pincode', 'pincode_agent'];
    }

    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { role: { $in: rolePatterns.map(p => new RegExp(`^${p}$`, 'i')) } },
        { level: { $in: [rClean, ...rolePatterns].map(p => new RegExp(`^${p}$`, 'i')) } },
        { role: 'agent', level: { $in: [rClean, ...rolePatterns].map(p => new RegExp(`^${p}$`, 'i')) } }
      ]
    });

    // Apply district filter
    if (reqDistrict && reqDistrict !== 'all') {
      const baseDist = reqDistrict.replace(/\s+district$/i, '').trim();
      const distRegex = new RegExp(`^\\s*${baseDist}(\\s+district)?\\s*$`, 'i');
      filter.$and.push({
        $or: [
          { 'assignedTerritory.district': distRegex },
          { 'assignedTerritory.districtId': new RegExp(`^\\s*${reqDistrict}\\s*$`, 'i') },
          { 'territory.district': distRegex },
          { district: distRegex },
          { assignedDistrict: distRegex }
        ]
      });
    }

    // Apply division filter
    if (reqDivision && reqDivision !== 'all') {
      const baseDiv = reqDivision.replace(/\s+division$/i, '').trim();
      const divRegex = new RegExp(`^\\s*${baseDiv}(\\s+division)?\\s*$`, 'i');
      filter.$and.push({
        $or: [
          { 'assignedTerritory.division': divRegex },
          { 'assignedTerritory.divisionId': new RegExp(`^\\s*${reqDivision}\\s*$`, 'i') },
          { 'territory.division': divRegex },
          { division: divRegex },
          { assignedDivision: divRegex }
        ]
      });
    }

    let agents = await Agent.find(filter)
      .select('_id name role level registrationId assignedTerritory territory state district division pincode email phone status')
      .sort({ name: 1 })
      .lean();

    // Merge registered agents from users collection
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userFilter: any = { status: { $nin: ['rejected', 'suspended'] } };
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
        const existingEmails = new Set(agents.map(a => (a.email || '').toLowerCase()));
        const existingIds = new Set(agents.map(a => String(a._id)));

        for (const u of userDocs) {
          const uId = String(u._id);
          const uEmail = (u.email || '').toLowerCase();
          if (existingIds.has(uId) || (uEmail && existingEmails.has(uEmail))) continue;

          const uState = (u.assignedTerritory?.state || u.territory?.state || u.state || u.assignedState || '').trim();
          const uDist = (u.assignedTerritory?.district || u.territory?.district || u.district || u.assignedDistrict || '').trim();
          const uDiv = (u.assignedTerritory?.division || u.territory?.division || u.division || u.assignedDivision || '').trim();

          if (scope.state && uState && !uState.toLowerCase().includes(scope.state.toLowerCase()) && !scope.state.toLowerCase().includes(uState.toLowerCase())) {
            continue;
          }
          if (reqDistrict && reqDistrict !== 'all') {
            const baseDist = reqDistrict.replace(/\s+district$/i, '').trim().toLowerCase();
            if (!uDist || (!uDist.toLowerCase().includes(baseDist) && !baseDist.includes(uDist.toLowerCase()))) {
              continue;
            }
          }
          if (reqDivision && reqDivision !== 'all') {
            const baseDiv = reqDivision.replace(/\s+division$/i, '').trim().toLowerCase();
            if (!uDiv || (!uDiv.toLowerCase().includes(baseDiv) && !baseDiv.includes(uDiv.toLowerCase()))) {
              continue;
            }
          }

          agents.push({
            _id: u._id,
            name: u.name || 'Agent',
            role: rClean as any,
            level: rClean,
            registrationId: u.registrationId || '',
            assignedTerritory: u.assignedTerritory || { state: uState, district: uDist, division: uDiv, pincode: u.pincode || '' },
            territory: u.territory || { state: uState, district: uDist, division: uDiv, pincode: u.pincode || '' },
            email: u.email || '',
            phone: u.phone || u.mobile || '',
            status: u.status || 'approved'
          } as any);

          if (uEmail) existingEmails.add(uEmail);
          existingIds.add(uId);
        }
      }
    } catch (usersErr) {
      console.warn('Fallback users lookup for field-visits agents failed gracefully:', usersErr);
    }

    const mapped = agents.map(a => {
      const canonicalDistrict = (a.assignedTerritory?.district || a.territory?.district || (a as any).district || '').trim();
      const canonicalDivision = (a.assignedTerritory?.division || a.territory?.division || (a as any).division || '').trim();
      const canonicalPincode = (a.assignedTerritory?.pincode || a.territory?.pincode || (a as any).pincode || '').trim();

      return {
        id: String(a._id),
        name: a.name,
        role: rClean,
        registrationId: a.registrationId || '',
        district: canonicalDistrict,
        division: canonicalDivision,
        pincode: canonicalPincode,
        label: rClean === 'district'
          ? `📍 ${canonicalDistrict} (${a.name})`
          : rClean === 'division'
          ? `${a.name} (${canonicalDivision || 'Division'})`
          : `${a.name} (PIN ${canonicalPincode})`
      };
    });

    return res.status(200).json({ success: true, agents: mapped });
  } catch (error) {
    console.error('Get field visit agents error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/field-visits/shop-visit or /api/shop-visits — Record field shop visit before vendor onboarding
export const recordShopVisit = async (req: Request, res: Response) => {
  try {
    const authAgent = (req as any).agentRecord || (req as any).agent;
    const agentId = (req as any).agent?.agentId || authAgent?._id;
    if (!agentId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Agent identity required.' });
    }

    const {
      shopName,
      category,
      businessCategory,
      shopPhoto,
      storefrontPhoto,
      voiceNote,
      audioVoiceNote,
      interestedStatus,
      interestStatus,
      notInterestedReason,
      otherReason,
      customReason,
      vendorId
    } = req.body;

    if (!shopName || !shopName.trim()) {
      return res.status(400).json({ success: false, message: 'Shop name / business title is required' });
    }

    const resolvedStatus = (interestedStatus || interestStatus || 'YES').toUpperCase() === 'NO' ? 'NO' : 'YES';
    const resolvedCategory = category || businessCategory || 'Products';
    const resolvedPhoto = shopPhoto || storefrontPhoto || null;

    if (!resolvedPhoto) {
      return res.status(400).json({ success: false, message: 'Storefront photo is required' });
    }

    const resolvedVoice = voiceNote || audioVoiceNote || null;
    const resolvedReason = notInterestedReason || (resolvedStatus === 'YES' ? 'Interested in Onboarding' : 'Not specified');
    const resolvedOther = otherReason || customReason || null;

    if (resolvedStatus === 'NO') {
      if (!notInterestedReason || !notInterestedReason.trim() || notInterestedReason === 'Not specified') {
        return res.status(400).json({ success: false, message: 'Reason for not interested is required.' });
      }
      const isOther = resolvedReason.toLowerCase().startsWith('other');
      if (isOther && (!resolvedOther || !resolvedOther.trim())) {
        return res.status(400).json({ success: false, message: 'Please specify the reason in the text field when "Other" is selected.' });
      }
    }

    // Idempotency: prevent duplicate submissions within 15 seconds by this agent
    const fifteenSecsAgo = new Date(Date.now() - 15000);
    const existing = await FieldVisit.findOne({
      $or: [
        { agent: agentId },
        { recordedById: String(agentId) },
        { managerId: String(agentId) }
      ],
      shopName: { $regex: new RegExp(`^${shopName.trim()}$`, 'i') },
      createdAt: { $gte: fifteenSecsAgo }
    }).lean();

    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Shop visit already recorded',
        data: existing,
        visit: existing
      });
    }

    // Agent territory mapping
    const territory = authAgent?.assignedTerritory || authAgent?.territory || {};
    const agentName = authAgent?.name || (req as any).agent?.name || 'Field Agent';
    const agentRole = authAgent?.role || (req as any).agent?.role || 'agent';

    const visitDoc = new FieldVisit({
      agent: agentId,
      vendor: vendorId || null,
      vendorId: vendorId || null,
      shopName: shopName.trim(),
      category: resolvedCategory,
      businessCategory: resolvedCategory,
      shopPhoto: resolvedPhoto,
      storefrontPhoto: resolvedPhoto,
      photoBeforeVisit: resolvedPhoto,
      voiceNote: resolvedVoice,
      audioVoiceNote: resolvedVoice,
      interestedStatus: resolvedStatus,
      interestStatus: resolvedStatus,
      notInterestedReason: resolvedReason,
      otherReason: resolvedOther,
      state: territory.state || '',
      district: territory.district || '',
      division: territory.division || '',
      pincode: territory.pincode || '',
      pincodeCode: territory.pincode || '',
      stateId: territory.stateId || '',
      districtId: territory.districtId || '',
      divisionId: territory.divisionId || '',
      pincodeId: territory.pincodeId || '',
      recordedById: String(agentId),
      recordedByName: agentName,
      recordedByRole: agentRole,
      managerId: String(agentId),
      managerName: agentName,
      managerRole: agentRole,
      status: 'completed',
      onboardingStatus: resolvedStatus === 'YES' ? 'PENDING' : 'NOT_INTERESTED',
      visitDate: new Date(),
      completedAt: new Date()
    });

    await visitDoc.save();

    return res.status(201).json({
      success: true,
      message: resolvedStatus === 'YES'
        ? 'Shop visit recorded successfully. Continuing to Vendor Onboarding.'
        : 'Shop visit recorded successfully. No vendor account will be created.',
      data: visitDoc,
      visit: visitDoc
    });
  } catch (error: any) {
    console.error('Record shop visit error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to record shop visit'
    });
  }
};

// GET /api/field-visits/shop-visit/:id — Retrieve single shop visit record
export const getShopVisitById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const visit = await FieldVisit.findById(id).lean();
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Shop visit not found' });
    }
    return res.status(200).json({ success: true, data: visit, visit });
  } catch (error: any) {
    console.error('Get shop visit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve shop visit' });
  }
};

// PATCH /api/field-visits/shop-visit/:id — Update shop visit (e.g. link vendorId)
export const updateShopVisit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};
    if (req.body.vendorId) {
      updateData.vendorId = req.body.vendorId;
      updateData.vendor = req.body.vendorId;
      updateData.onboardingStatus = 'COMPLETED';
    }
    if (req.body.onboardingStatus) {
      updateData.onboardingStatus = req.body.onboardingStatus;
    }

    const updated = await FieldVisit.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Shop visit not found' });
    }
    return res.status(200).json({ success: true, data: updated, visit: updated });
  } catch (error: any) {
    console.error('Update shop visit error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update shop visit' });
  }
};

