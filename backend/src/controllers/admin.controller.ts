import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agent from '../models/Agent';
import AuditLog from '../models/AuditLog';
import Vendor from '../models/Vendor';
import TargetAssignment from '../models/TargetAssignment';
import Wallet from '../models/Wallet';
import { getAgentTerritoryScope, buildTerritoryFilter, buildVendorScopeFilter, invalidateAgentTerritoryScope, getDivisionPincodes } from '../utils/territoryScope';
import { checkExistingDistrictAssignment } from '../utils/districtAssignment';
import { cacheService } from '../services/cache.service';
import { publishEntityEvent } from '../realtime/eventBus';

// GET /api/admin/registrations
export const getRegistrations = async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).agent?.agentId;
    const scope = await getAgentTerritoryScope(requesterId);
    const scopeFilter = buildTerritoryFilter(scope);

    const statusQuery = (req.query.status as string || '').toLowerCase();
    const filter: any = { ...scopeFilter };

    if (statusQuery && statusQuery !== 'all') {
      if (statusQuery === 'pending' || statusQuery === 'pending_approval') {
        filter.$or = [
          { kycStatus: 'pending' },
          { status: 'pending' },
          { status: 'pending_approval' }
        ];
      } else {
        filter.kycStatus = statusQuery;
      }
    }

    let registrations = await Agent.find(filter)
      .select('_id name email phone role registrationId territory assignedTerritory address fullAddress kycStatus status remarks rejectionReason createdAt updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Also query 'users' collection in MongoDB for any agent registrations synced directly to users collection
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userFilter: any = { role: { $in: ['agent', 'state', 'district', 'division', 'pincode'] } };
        if (statusQuery && statusQuery !== 'all') {
          if (statusQuery === 'pending' || statusQuery === 'pending_approval') {
            userFilter.$or = [
              { status: 'pending' },
              { kycStatus: 'pending' },
              { status: 'pending_approval' }
            ];
          } else {
            userFilter.status = statusQuery;
          }
        }

        const userDocs = await db.collection('users').find(userFilter).limit(50).maxTimeMS(4000).toArray();

        // Merge users docs if not already present in registrations list
        const existingEmails = new Set(registrations.map(r => r.email.toLowerCase()));
        for (const uDoc of userDocs) {
          if (uDoc.email && !existingEmails.has(uDoc.email.toLowerCase())) {
            const uRole = (uDoc.level || uDoc.role || 'pincode').toLowerCase();
            const uState = (uDoc.territory?.state || uDoc.state || uDoc.assignedState || '').trim().toLowerCase();
            const uDist = (uDoc.territory?.district || uDoc.district || uDoc.assignedDistrict || '').trim().toLowerCase();
            const uDiv = (uDoc.territory?.division || uDoc.division || uDoc.assignedDivision || '').trim().toLowerCase();
            const uPin = (uDoc.territory?.pincode || uDoc.pincode || uDoc.assignedPincode || '').trim();

            if (scope?.role === 'state') {
              if (scope.state && !uState.includes(scope.state.toLowerCase())) continue;
            } else if (scope?.role === 'district') {
              if (uRole === 'state') continue;
              if (scope.state && !uState.includes(scope.state.toLowerCase())) continue;
              if (scope.district && !uDist.includes(scope.district.toLowerCase())) continue;
            } else if (scope?.role === 'division') {
              if (uRole === 'state' || uRole === 'district') continue;
              if (scope.division && !uDiv.includes(scope.division.toLowerCase())) continue;
            } else if (scope?.role === 'pincode') {
              if (uRole !== 'pincode') continue;
              if (scope.pincode && uPin !== scope.pincode) continue;
            }

            registrations.push({
              _id: uDoc._id,
              registrationId: uDoc.registrationId || `REG-${Date.now()}`,
              name: uDoc.name || 'Agent Applicant',
              email: uDoc.email,
              phone: uDoc.phone || uDoc.mobile || '+91 98765 43210',
              role: (uDoc.level || uDoc.role || 'pincode').toLowerCase() as any,
              territory: uDoc.territory || {
                state: uDoc.state || uDoc.assignedState || '',
                district: uDoc.district || uDoc.assignedDistrict || '',
                division: uDoc.division || uDoc.assignedDivision || '',
                pincode: uDoc.pincode || uDoc.assignedPincode || ''
              },
              kycStatus: uDoc.kycStatus || uDoc.status || 'pending',
              status: uDoc.status || 'pending',
              createdAt: uDoc.createdAt || new Date(),
              updatedAt: uDoc.updatedAt || new Date()
            } as any);
            existingEmails.add(uDoc.email.toLowerCase());
          }
        }
      }
    } catch (e) {
      console.error('Error fetching pending users from users collection:', e);
    }

    return res.status(200).json({ registrations });
  } catch (error) {
    console.error('Get registrations error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/registrations/:id
export const getRegistrationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let agent = await Agent.findById(id).select('-password');
    if (!agent) {
      // Check users collection
      try {
        const db = mongoose.connection.db;
        if (db) {
          const userDoc = await db.collection('users').findOne({ _id: id as any });
          if (userDoc) {
            return res.status(200).json({ registration: userDoc });
          }
        }
      } catch (e) {}
      return res.status(404).json({ message: 'Registration not found' });
    }
    return res.status(200).json({ registration: agent });
  } catch (error) {
    console.error('Get registration detail error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/admin/registrations/:id/approve
export const approveRegistration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const requesterId = (req as any).agent?.agentId;
    const requesterRole = String((req as any).agent?.role || '').toLowerCase();
    const requesterEmail = (req as any).agent?.email?.toLowerCase();

    let agent = await Agent.findById(id);
    let agentEmail = agent?.email;

    // Determine role and territory of the applicant
    let appRole = String(agent?.role || '').toLowerCase();
    let appDist = (agent?.assignedTerritory?.district || agent?.territory?.district || (agent as any)?.district || '').trim();
    let appDistId = (agent?.assignedTerritory?.districtId || (agent as any)?.districtId || '').trim();
    let appState = (agent?.assignedTerritory?.state || agent?.territory?.state || (agent as any)?.state || '').trim();

    if (!agent) {
      const db = mongoose.connection.db;
      if (db) {
        const uDoc = await db.collection('users').findOne({ _id: id as any });
        if (uDoc) {
          agentEmail = uDoc.email;
          appRole = String(uDoc.role || uDoc.level || '').toLowerCase();
          appDist = (uDoc.assignedTerritory?.district || uDoc.territory?.district || uDoc.district || uDoc.assignedDistrict || '').trim();
          appDistId = (uDoc.assignedTerritory?.districtId || uDoc.districtId || '').trim();
          appState = (uDoc.assignedTerritory?.state || uDoc.territory?.state || uDoc.state || uDoc.assignedState || '').trim();
        }
      }
    }

    // 1. Enforce Self-Approval Prevention
    if (String(id) === String(requesterId) || (agentEmail && requesterEmail && agentEmail.toLowerCase() === requesterEmail)) {
      return res.status(403).json({ message: 'Self-approval is strictly forbidden.' });
    }

    // 2. Enforce Role Hierarchy Authority
    const HIERARCHY_RANKS: Record<string, number> = {
      superadmin: 10,
      admin: 9,
      state: 4,
      district: 3,
      division: 2,
      pincode: 1,
      delivery_partner: 0,
      technician: 0
    };
    const requesterRank = HIERARCHY_RANKS[requesterRole] || 0;
    const applicantRank = HIERARCHY_RANKS[appRole] || 0;

    if (requesterRank < 9 && requesterRank <= applicantRank) {
      return res.status(403).json({
        message: `Access denied: You cannot approve an agent with equal or higher role level (${appRole}).`
      });
    }

    // 3. Enforce Territory Jurisdiction
    const scope = await getAgentTerritoryScope(requesterId);
    if (scope && requesterRank < 9) {
      if (scope.role === 'state' && scope.state && appState && scope.state.toLowerCase() !== appState.toLowerCase()) {
        return res.status(403).json({ message: `Access denied: Target agent is outside your State territory (${scope.state}).` });
      }
      if (scope.role === 'district' && scope.district && appDist && scope.district.toLowerCase() !== appDist.toLowerCase()) {
        return res.status(403).json({ message: `Access denied: Target agent is outside your District territory (${scope.district}).` });
      }
    }

    // Enforce strictly 1 active District Agent per district rule
    if (appRole.includes('dist') && appDist) {
      const assignmentCheck = await checkExistingDistrictAssignment(
        appState,
        appDist,
        appDistId,
        id
      );
      if (assignmentCheck.exists) {
        return res.status(400).json({
          message: 'A District Agent is already assigned to this district.'
        });
      }
    }

    if (agent) {
      const oldStatus = agent.kycStatus;
      agent.kycStatus = 'approved';
      agent.status = 'approved';
      agent.remarks = remarks || 'Approved by Admin';
      agent.updatedAt = new Date();
      await agent.save();

      const adminId = requesterId || agent._id;
      await AuditLog.create({
        entityId: agent._id,
        entityType: 'Agent',
        action: 'approval_change',
        fieldName: 'kycStatus',
        oldValue: oldStatus,
        newValue: 'approved',
        changedBy: adminId
      });
    }

    // Sync approval to users collection in MongoDB
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userQuery = agentEmail ? { email: agentEmail.toLowerCase() } : { _id: id as any };
        await db.collection('users').updateOne(
          userQuery,
          {
            $set: {
              status: 'approved',
              kycStatus: 'approved',
              isActive: true,
              updatedAt: new Date()
            }
          }
        );
      }
    } catch (e) {
      console.error('Error syncing approval to users collection:', e);
    }

    // Invalidate hierarchy, dashboard, and territory caches
    await Promise.all([
      cacheService.delByPrefix('hierarchy:'),
      cacheService.delByPrefix('dashboard:'),
      invalidateAgentTerritoryScope(id)
    ]);

    // Publish Realtime Agent Approval Event
    publishEntityEvent({
      event: 'ENTITY_STATUS_CHANGED',
      entity: 'agent',
      entityId: id,
      action: 'approved',
      scope: {
        targetAgentId: id,
        state: agent?.territory?.state,
        district: agent?.territory?.district,
        division: agent?.territory?.division,
        pincode: agent?.territory?.pincode
      },
      data: {
        agentId: id,
        status: 'approved',
        kycStatus: 'approved'
      }
    }).catch(() => {});

    return res.status(200).json({
      message: 'Agent registration application approved successfully.',
      registration: agent || { _id: id, status: 'approved', kycStatus: 'approved' }
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/admin/registrations/:id/reject
export const rejectRegistration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks, rejectionReason } = req.body;
    const requesterId = (req as any).agent?.agentId;
    const requesterRole = String((req as any).agent?.role || '').toLowerCase();
    const requesterEmail = (req as any).agent?.email?.toLowerCase();

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    let agent = await Agent.findById(id);
    let agentEmail = agent?.email;

    // Determine role and territory of applicant
    let appRole = String(agent?.role || '').toLowerCase();
    let appDist = (agent?.assignedTerritory?.district || agent?.territory?.district || (agent as any)?.district || '').trim();
    let appState = (agent?.assignedTerritory?.state || agent?.territory?.state || (agent as any)?.state || '').trim();

    if (!agent) {
      const db = mongoose.connection.db;
      if (db) {
        const uDoc = await db.collection('users').findOne({ _id: id as any });
        if (uDoc) {
          agentEmail = uDoc.email;
          appRole = String(uDoc.role || uDoc.level || '').toLowerCase();
          appDist = (uDoc.assignedTerritory?.district || uDoc.territory?.district || uDoc.district || uDoc.assignedDistrict || '').trim();
          appState = (uDoc.assignedTerritory?.state || uDoc.territory?.state || uDoc.state || uDoc.assignedState || '').trim();
        }
      }
    }

    // 1. Enforce Self-Rejection Prevention
    if (String(id) === String(requesterId) || (agentEmail && requesterEmail && agentEmail.toLowerCase() === requesterEmail)) {
      return res.status(403).json({ message: 'Self-review or rejection is strictly forbidden.' });
    }

    // 2. Enforce Role Hierarchy Authority
    const HIERARCHY_RANKS: Record<string, number> = {
      superadmin: 10,
      admin: 9,
      state: 4,
      district: 3,
      division: 2,
      pincode: 1,
      delivery_partner: 0,
      technician: 0
    };
    const requesterRank = HIERARCHY_RANKS[requesterRole] || 0;
    const applicantRank = HIERARCHY_RANKS[appRole] || 0;

    if (requesterRank < 9 && requesterRank <= applicantRank) {
      return res.status(403).json({
        message: `Access denied: You cannot reject an agent with equal or higher role level (${appRole}).`
      });
    }

    // 3. Enforce Territory Jurisdiction
    const scope = await getAgentTerritoryScope(requesterId);
    if (scope && requesterRank < 9) {
      if (scope.role === 'state' && scope.state && appState && scope.state.toLowerCase() !== appState.toLowerCase()) {
        return res.status(403).json({ message: `Access denied: Target agent is outside your State territory (${scope.state}).` });
      }
      if (scope.role === 'district' && scope.district && appDist && scope.district.toLowerCase() !== appDist.toLowerCase()) {
        return res.status(403).json({ message: `Access denied: Target agent is outside your District territory (${scope.district}).` });
      }
    }

    if (agent) {
      const oldStatus = agent.kycStatus;
      agent.kycStatus = 'rejected';
      agent.status = 'rejected';
      agent.rejectionReason = rejectionReason;
      agent.remarks = remarks || 'Rejected by Admin';
      agent.updatedAt = new Date();
      await agent.save();

      const adminId = requesterId || agent._id;
      await AuditLog.create({
        entityId: agent._id,
        entityType: 'Agent',
        action: 'approval_change',
        fieldName: 'kycStatus',
        oldValue: oldStatus,
        newValue: 'rejected',
        changedBy: adminId
      });
    }

    // Sync rejection to users collection in MongoDB
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userQuery = agentEmail ? { email: agentEmail.toLowerCase() } : { _id: id as any };
        await db.collection('users').updateOne(
          userQuery,
          {
            $set: {
              status: 'rejected',
              kycStatus: 'rejected',
              rejectionReason: rejectionReason,
              isActive: false,
              updatedAt: new Date()
            }
          }
        );
      }
    } catch (e) {
      console.error('Error syncing rejection to users collection:', e);
    }

    // Invalidate hierarchy, dashboard, and territory caches
    await Promise.all([
      cacheService.delByPrefix('hierarchy:'),
      cacheService.delByPrefix('dashboard:'),
      invalidateAgentTerritoryScope(id)
    ]);

    // Publish Realtime Agent Rejection Event
    publishEntityEvent({
      event: 'ENTITY_STATUS_CHANGED',
      entity: 'agent',
      entityId: id,
      action: 'rejected',
      scope: {
        targetAgentId: id,
        state: agent?.territory?.state,
        district: agent?.territory?.district,
        division: agent?.territory?.division,
        pincode: agent?.territory?.pincode
      },
      data: {
        agentId: id,
        status: 'rejected',
        kycStatus: 'rejected',
        rejectionReason
      }
    }).catch(() => {});

    return res.status(200).json({
      message: 'Agent registration application rejected successfully.',
      registration: agent || { _id: id, status: 'rejected', kycStatus: 'rejected' }
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/hierarchy
export const getHierarchyTree = async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).agent?.agentId;
    const statusFilter = (req.query.status as string) || 'all';
    const cacheKey = `hierarchy:${requesterId}:${statusFilter}`;

    // Return cached hierarchy if available
    const cachedTree = await cacheService.get(cacheKey);
    if (cachedTree) {
      return res.status(200).json(cachedTree);
    }

    const scope = await getAgentTerritoryScope(requesterId);
    if (scope?.role === 'pincode') {
      return res.status(403).json({ message: 'Forbidden: Pincode agents do not have permission to access agent hierarchy and management.' });
    }

    let divisionPincodes: string[] = [];
    if (scope?.role === 'division' && scope.division) {
      divisionPincodes = await getDivisionPincodes(scope.division);
    }
    const scopeFilter = buildTerritoryFilter(scope, divisionPincodes);
    const vendorScopeFilter = buildVendorScopeFilter(scope, divisionPincodes);

    // Strictly enforce Approved and Active agents only for directory/hierarchy
    const filter: any = { ...scopeFilter };
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { kycStatus: { $regex: /^approved$/i } },
        { status: { $regex: /^(approved|active)$/i } }
      ]
    });
    filter.$and.push({
      kycStatus: { $nin: ['rejected', 'pending', 'pending_verification', 'suspended', 'in_review', 'Rejected', 'Pending'] },
      status: { $nin: ['rejected', 'pending', 'pending_approval', 'suspended', 'inactive', 'under_review', 'Rejected', 'Pending'] }
    });

    // Safely execute independent queries in parallel with field projections
    const [rawAgents, allVendors] = await Promise.all([
      Agent.find(filter)
        .select('_id name email phone mobile registrationId role kycStatus status registrationFeePaid performanceScore territory assignedTerritory address fullAddress createdAt updatedAt')
        .sort({ createdAt: -1 })
        .lean(),
      Vendor.find(vendorScopeFilter)
        .select('_id assignedAgent pincode division district createdAt')
        .lean()
    ]);

    const agents: any[] = [...rawAgents];

    // Safely query MongoDB 'users' collection for approved agents synced directly to users collection
    try {
      const db = mongoose.connection.db;
      if (db) {
        const candidateRoles = new Set(['state', 'district', 'division', 'pincode', 'agent', 'district_manager', 'division_manager', 'pincode_agent', 'District Admin', 'Division Admin']);
        const allUserDocs = await db.collection('users').find({}, {
          projection: {
            role: 1, level: 1, email: 1, phone: 1, mobile: 1, name: 1,
            assignedTerritory: 1, territory: 1, state: 1, district: 1, division: 1, pincode: 1,
            assignedState: 1, assignedDistrict: 1, assignedDivision: 1, assignedPincode: 1,
            kycStatus: 1, status: 1, registrationId: 1, createdAt: 1, updatedAt: 1
          }
        }).hint({ _id: 1 }).maxTimeMS(4000).toArray();

        const approvedUserDocs = allUserDocs.filter(uDoc => {
          const r = uDoc.role || uDoc.level || '';
          if (!candidateRoles.has(r)) return false;
          const kyc = String(uDoc.kycStatus || '').toLowerCase();
          const st = String(uDoc.status || '').toLowerCase();
          const isApproved = kyc === 'approved' || kyc === 'verified' || st === 'approved' || st === 'active';
          if (!isApproved) return false;
          if (['rejected', 'pending', 'pending_verification', 'under_review'].includes(kyc)) return false;
          if (['rejected', 'pending', 'pending_approval', 'suspended', 'inactive', 'under_review'].includes(st)) return false;
          return true;
        });

        const existingEmails = new Set(agents.map(a => (a.email || '').toLowerCase().trim()));
        const existingIds = new Set(agents.map(a => String(a._id)));

        for (const uDoc of approvedUserDocs) {
          const uEmail = (uDoc.email || '').toLowerCase().trim();
          const uIdStr = String(uDoc._id);
          if (existingEmails.has(uEmail) || existingIds.has(uIdStr)) continue;

          const uState = (uDoc.assignedTerritory?.state || uDoc.territory?.state || uDoc.state || uDoc.assignedState || '').trim();
          const uDist = (uDoc.assignedTerritory?.district || uDoc.territory?.district || uDoc.district || uDoc.assignedDistrict || '').trim();
          const uDiv = (uDoc.assignedTerritory?.division || uDoc.territory?.division || uDoc.division || uDoc.assignedDivision || '').trim();
          const uPin = (uDoc.assignedTerritory?.pincode || uDoc.territory?.pincode || uDoc.pincode || uDoc.assignedPincode || '').trim();

          // Territory scope isolation
          if (scope?.role === 'state' && scope.state) {
            const scState = scope.state.toLowerCase();
            const candState = uState.toLowerCase();
            if (!candState || (!candState.includes(scState) && !scState.includes(candState))) continue;
          } else if (scope?.role === 'district' && scope.district) {
            const scDist = scope.district.toLowerCase();
            const candDist = uDist.toLowerCase();
            if (!candDist || (!candDist.includes(scDist) && !scDist.includes(candDist))) continue;
          } else if (scope?.role === 'division' && scope.division) {
            const scDiv = scope.division.toLowerCase();
            const candDiv = uDiv.toLowerCase();
            const pinMatches = Boolean(uPin && divisionPincodes.includes(uPin));
            const divMatches = Boolean(candDiv && (candDiv.includes(scDiv) || scDiv.includes(candDiv)));
            if (!pinMatches && !divMatches) continue;
          } else if (scope?.role === 'pincode' && scope.pincode) {
            if (uPin !== scope.pincode) continue;
          }

          agents.push({
            _id: uDoc._id,
            registrationId: uDoc.registrationId || `REG-${Date.now()}`,
            name: uDoc.name || 'Agent Applicant',
            email: uDoc.email,
            phone: uDoc.phone || uDoc.mobile || '',
            role: uDoc.role || uDoc.level || 'pincode',
            territory: {
              state: uState,
              district: uDist,
              division: uDiv,
              pincode: uPin
            },
            assignedTerritory: {
              state: uState,
              stateId: uDoc.assignedTerritory?.stateId || uDoc.stateId || '',
              district: uDist,
              districtId: uDoc.assignedTerritory?.districtId || uDoc.districtId || '',
              division: uDiv,
              divisionId: uDoc.assignedTerritory?.divisionId || uDoc.divisionId || '',
              taluk: uDoc.assignedTerritory?.taluk || uDoc.taluk || '',
              pincode: uPin,
              pincodeId: uDoc.assignedTerritory?.pincodeId || uDoc.pincodeId || ''
            },
            kycStatus: 'approved',
            status: 'approved',
            createdAt: uDoc.createdAt || new Date(),
            updatedAt: uDoc.updatedAt || new Date()
          });
          existingEmails.add(uEmail);
          existingIds.add(uIdStr);
        }
      }
    } catch (usersErr) {
      console.error('Error querying users collection in getHierarchyTree:', usersErr);
    }

    // Pre-index vendors by agent, pincode, division, district into O(1) Map lookups
    const vendorsByAgent = new Map<string, any[]>();
    const vendorsByPincode = new Map<string, any[]>();
    const vendorsByDivision = new Map<string, any[]>();
    const vendorsByDistrict = new Map<string, any[]>();

    for (const v of allVendors) {
      if (v.assignedAgent) {
        const idStr = String(v.assignedAgent);
        const list = vendorsByAgent.get(idStr) || [];
        list.push(v);
        vendorsByAgent.set(idStr, list);
      }
      if (v.pincode) {
        const pin = String(v.pincode).trim();
        const list = vendorsByPincode.get(pin) || [];
        list.push(v);
        vendorsByPincode.set(pin, list);
      }
      if (v.division) {
        const div = String(v.division).trim().toLowerCase();
        const list = vendorsByDivision.get(div) || [];
        list.push(v);
        vendorsByDivision.set(div, list);
      }
      if (v.district) {
        const dist = String(v.district).trim().toLowerCase();
        const list = vendorsByDistrict.get(dist) || [];
        list.push(v);
        vendorsByDistrict.set(dist, list);
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Helpers for robust role and territory normalization
    const normalizeRole = (a: any): 'state' | 'district' | 'division' | 'pincode' => {
      const r = String(a.role || (a as any).level || '').trim().toLowerCase();
      if (r.includes('state')) return 'state';
      if (r.includes('dist')) return 'district';
      if (r.includes('div')) return 'division';
      if (r.includes('pin')) return 'pincode';
      if (a.level === 1) return 'state';
      if (a.level === 2) return 'district';
      if (a.level === 3) return 'division';
      if (a.level === 4) return 'pincode';
      return 'pincode';
    };

    const getAgentState = (a: any) => (a.assignedTerritory?.state || a.territory?.state || a.state || a.assignedState || '').trim();
    const getAgentDistrict = (a: any) => (a.assignedTerritory?.district || a.territory?.district || a.district || a.assignedDistrict || '').trim();
    const getAgentDivision = (a: any) => (a.assignedTerritory?.division || a.territory?.division || a.division || a.assignedDivision || '').trim();
    const getAgentPincode = (a: any) => (a.assignedTerritory?.pincode || a.territory?.pincode || a.pincode || a.assignedPincode || '').trim();
    const cleanWord = (s: string) => s.toLowerCase().replace(/division|district|agent|manager/g, '').trim();

    // Strict deduplication of agents by real DB _id
    const seenAgentIds = new Set<string>();
    const uniqueAgents: any[] = [];
    for (const a of agents) {
      const aId = String(a._id);
      if (!seenAgentIds.has(aId)) {
        seenAgentIds.add(aId);
        uniqueAgents.push(a);
      }
    }

    // Group agents into normalized multi-tier hierarchy
    const stateAgents = uniqueAgents.filter(a => normalizeRole(a) === 'state');
    const districtAgents = uniqueAgents.filter(a => normalizeRole(a) === 'district');
    const divisionAgents = uniqueAgents.filter(a => normalizeRole(a) === 'division');
    const pincodeAgents = uniqueAgents.filter(a => normalizeRole(a) === 'pincode');

    // Helper function to build detailed metrics for an agent based on REAL vendor data
    const enrichAgentData = (agent: any) => {
      const perf = agent.performanceScore || 0;
      const feePaid = agent.registrationFeePaid ?? true;

      const agentIdStr = String(agent._id);
      const agentDistrictLower = getAgentDistrict(agent).toLowerCase();
      const agentDivisionLower = getAgentDivision(agent).toLowerCase();
      const agentPincode = getAgentPincode(agent);
      const normRole = normalizeRole(agent);

      // Look up vendors for this agent using pre-indexed lookup maps
      let candidateVendors: any[] = [];
      if (vendorsByAgent.has(agentIdStr)) {
        candidateVendors = candidateVendors.concat(vendorsByAgent.get(agentIdStr) || []);
      }
      if (normRole === 'pincode' && agentPincode && vendorsByPincode.has(agentPincode)) {
        candidateVendors = candidateVendors.concat(vendorsByPincode.get(agentPincode) || []);
      } else if (normRole === 'division' && agentDivisionLower && vendorsByDivision.has(agentDivisionLower)) {
        candidateVendors = candidateVendors.concat(vendorsByDivision.get(agentDivisionLower) || []);
      } else if (normRole === 'district' && agentDistrictLower && vendorsByDistrict.has(agentDistrictLower)) {
        candidateVendors = candidateVendors.concat(vendorsByDistrict.get(agentDistrictLower) || []);
      }

      // Fast deduplication
      const assignedVendors: any[] = [];
      const seenIds = new Set<string>();
      for (const v of candidateVendors) {
        const vId = String(v._id);
        if (!seenIds.has(vId)) {
          seenIds.add(vId);
          assignedVendors.push(v);
        }
      }

      const tieupsToday = assignedVendors.filter((v: any) => {
        const dStr = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
        return dStr === todayStr;
      }).length;

      const tieupsYesterday = assignedVendors.filter((v: any) => {
        const dStr = v.createdAt ? new Date(v.createdAt).toISOString().slice(0, 10) : '';
        return dStr === yesterdayStr;
      }).length;

      const totalTieups = assignedVendors.length;
      const earnings = (totalTieups * 1250) + (feePaid ? 5000 : 0);

      const plusPoints = ['KYC Verified', 'Registration Fee Paid'];
      if (totalTieups > 0) plusPoints.push(`Onboarded ${totalTieups} Merchant Vendors`);

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone || agent.mobile || '',
        registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
        role: normRole,
        kycStatus: 'approved' as const,
        status: 'approved' as const,
        registrationFeePaid: feePaid,
        performanceScore: perf,
        earnings,
        tieupsToday,
        tieupsYesterday,
        totalTieups,
        territory: {
          state: getAgentState(agent),
          district: getAgentDistrict(agent),
          division: getAgentDivision(agent),
          pincode: getAgentPincode(agent)
        },
        assignedTerritory: {
          state: getAgentState(agent),
          stateId: agent.assignedTerritory?.stateId || agent.stateId || '',
          district: getAgentDistrict(agent),
          districtId: agent.assignedTerritory?.districtId || agent.districtId || '',
          division: getAgentDivision(agent),
          divisionId: agent.assignedTerritory?.divisionId || agent.divisionId || '',
          taluk: agent.assignedTerritory?.taluk || agent.taluk || '',
          pincode: getAgentPincode(agent),
          pincodeId: agent.assignedTerritory?.pincodeId || agent.pincodeId || ''
        },
        address: agent.address || {},
        fullAddress: agent.fullAddress || '',
        plusPoints,
        minusPoints: [],
        createdAt: agent.createdAt
      };
    };

    // Pre-index pincodes by division name for fast O(1) division hierarchy mapping
    const pincodesByDivision = new Map<string, Set<string>>();
    let canonicalDistricts: any[] = [];
    let canonicalDivisions: any[] = [];
    try {
      const db = mongoose.connection.db;
      if (db) {
        const [allDbPincodes, dbDists, dbDivs] = await Promise.all([
          db.collection('pincodes').find({}, { projection: { code: 1, pincode: 1, division: 1 } }).toArray(),
          db.collection('districts').find({ status: { $regex: /^active$/i } }).toArray(),
          db.collection('divisions').find({ status: { $regex: /^active$/i } }).toArray()
        ]);
        canonicalDistricts = dbDists || [];
        canonicalDivisions = dbDivs || [];
        for (const p of allDbPincodes) {
          const code = String(p.code || p.pincode || '').trim();
          const div = cleanWord(String(p.division || ''));
          if (code && div) {
            if (!pincodesByDivision.has(div)) pincodesByDivision.set(div, new Set());
            pincodesByDivision.get(div)!.add(code);
          }
        }
      }
    } catch (_) {}

    // 1. Pre-enrich registered division agents with their pincodes
    const enrichedDivisions = divisionAgents.map(div => {
      const divTerritory = getAgentDivision(div);
      const divDist = getAgentDistrict(div);
      const enrichedDiv = enrichAgentData(div);
      const dNorm = cleanWord(divTerritory);
      const knownDivPincodes = pincodesByDivision.get(dNorm);

      const matchingPincodes = pincodeAgents
        .filter(pin => {
          const pinDiv = getAgentDivision(pin);
          const pinDist = getAgentDistrict(pin);
          const pinCode = getAgentPincode(pin);

          if (divDist && pinDist && cleanWord(divDist) !== cleanWord(pinDist)) return false;

          // Check if pincode belongs to this division in the database
          if (pinCode && knownDivPincodes && knownDivPincodes.has(pinCode)) {
            return true;
          }

          // Check division text match
          if (pinDiv && divTerritory) {
            const pNorm = cleanWord(pinDiv);
            if (pNorm === dNorm || pNorm.includes(dNorm) || dNorm.includes(pNorm)) return true;
          }

          // Check divisionId match
          if (div.assignedTerritory?.divisionId && pin.assignedTerritory?.divisionId) {
            if (String(div.assignedTerritory.divisionId) === String(pin.assignedTerritory.divisionId)) return true;
          }

          return false;
        })
        .map(pin => enrichAgentData(pin));

      return {
        ...enrichedDiv,
        pincodes: matchingPincodes,
        teamSize: matchingPincodes.length,
        teamEarnings: matchingPincodes.reduce((acc, p) => acc + p.earnings, 0) + enrichedDiv.earnings,
        teamPendingKyc: 0,
        teamApprovedKyc: matchingPincodes.length + 1
      };
    });

    // 1b. Map active canonical divisions into the division list (ensuring Salem and all active divisions appear)
    const allDivisions: any[] = [...enrichedDivisions];
    const registeredDivNames = new Set(enrichedDivisions.map(d => cleanWord(getAgentDivision(d))));
    const registeredDivIds = new Set(enrichedDivisions.map(d => String(d.assignedTerritory?.divisionId || d._id)));

    for (const cDiv of canonicalDivisions) {
      const cNameNorm = cleanWord(cDiv.name || '');
      const cIdStr = String(cDiv._id);
      if (registeredDivNames.has(cNameNorm) || registeredDivIds.has(cIdStr)) continue;

      const parentDist = canonicalDistricts.find(cd => String(cd._id) === String(cDiv.districtId));
      const distName = parentDist?.name || cDiv.district || '';
      const stateName = scope?.state || 'Tamil Nadu';

      const knownDivPincodes = pincodesByDivision.get(cNameNorm);
      const matchingPincodes = pincodeAgents
        .filter(pin => {
          const pinDiv = getAgentDivision(pin);
          const pinDist = getAgentDistrict(pin);
          const pinCode = getAgentPincode(pin);

          if (distName && pinDist && cleanWord(distName) !== cleanWord(pinDist)) return false;
          if (pinCode && knownDivPincodes && knownDivPincodes.has(pinCode)) return true;
          if (pinDiv && cDiv.name) {
            const pNorm = cleanWord(pinDiv);
            if (pNorm === cNameNorm || pNorm.includes(cNameNorm) || cNameNorm.includes(pNorm)) return true;
          }
          if (pin.assignedTerritory?.divisionId && String(pin.assignedTerritory.divisionId) === cIdStr) return true;
          return false;
        })
        .map(pin => enrichAgentData(pin));

      allDivisions.push({
        _id: cDiv._id,
        name: cDiv.name,
        email: '',
        phone: '',
        registrationId: `DIV-${String(cDiv._id).substring(0, 6)}`,
        role: 'division',
        status: 'approved',
        kycStatus: 'approved',
        registrationFeePaid: true,
        performanceScore: 0,
        earnings: 0,
        tieupsToday: 0,
        tieupsYesterday: 0,
        totalTieups: 0,
        territory: {
          state: stateName,
          district: distName,
          division: cDiv.name,
          pincode: ''
        },
        assignedTerritory: {
          state: stateName,
          stateId: String(parentDist?.stateId || ''),
          district: distName,
          districtId: String(cDiv.districtId || parentDist?._id || ''),
          division: cDiv.name,
          divisionId: cIdStr,
          taluk: '',
          pincode: '',
          pincodeId: ''
        },
        address: {},
        fullAddress: '',
        plusPoints: ['Active Division'],
        minusPoints: [],
        createdAt: cDiv.createdAt || new Date(),
        pincodes: matchingPincodes,
        teamSize: matchingPincodes.length,
        teamEarnings: matchingPincodes.reduce((acc: number, p: any) => acc + (p.earnings || 0), 0),
        teamPendingKyc: 0,
        teamApprovedKyc: matchingPincodes.length
      });
    }

    const enrichedPincodes = pincodeAgents.map(pin => enrichAgentData(pin));

    // 2. Group district agents by canonical district to enforce strictly 1 active assignment per district
    const districtAgentsByDistrict = new Map<string, any[]>();
    for (const dist of districtAgents) {
      const distTerritory = getAgentDistrict(dist) || 'Unassigned District';
      const key = distTerritory.toLowerCase();
      const list = districtAgentsByDistrict.get(key) || [];
      list.push(dist);
      districtAgentsByDistrict.set(key, list);
    }

    // 3. Create unique canonical district representations (Exactly 1 active approved agent per district)
    const uniqueDistrictsList: any[] = [];
    districtAgentsByDistrict.forEach((agentsInDist, distKey) => {
      // Pick the single active approved district agent (prefer latest updated or active assignment)
      const leadAgentDoc = agentsInDist.slice().sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      })[0];

      const leadAgent = enrichAgentData(leadAgentDoc);
      const canonicalName = getAgentDistrict(leadAgent) || distKey;
      const distState = getAgentState(leadAgent);

      // Match child divisions strictly belonging to this district (from allDivisions)
      const matchingDivisions = allDivisions.filter(div => {
        const divDist = getAgentDistrict(div).toLowerCase();
        const divDistId = String(div.assignedTerritory?.districtId || '');
        const divState = getAgentState(div).toLowerCase();
        if (distState && divState && !distState.includes(divState) && !divState.includes(distState)) return false;
        if (leadAgent.assignedTerritory?.districtId && divDistId && String(leadAgent.assignedTerritory.districtId) === divDistId) {
          return true;
        }
        const dNorm = cleanWord(divDist);
        const kNorm = cleanWord(distKey);
        return Boolean(divDist && (divDist === distKey || dNorm === kNorm || divDist.includes(distKey) || distKey.includes(divDist)));
      });

      const totalPincodes = matchingDivisions.reduce((acc, d) => acc + (d.pincodes?.length || d.teamSize || 0), 0);
      const districtTeamEarnings = matchingDivisions.reduce((acc, d) => acc + (d.teamEarnings || d.earnings || 0), 0) + leadAgent.earnings;

      uniqueDistrictsList.push({
        ...leadAgent,
        name: leadAgent.name,
        territory: {
          ...leadAgent.territory,
          district: canonicalName,
          state: distState || leadAgent.territory?.state
        },
        assignedTerritory: {
          ...leadAgent.assignedTerritory,
          district: canonicalName,
          state: distState || leadAgent.assignedTerritory?.state
        },
        district: canonicalName,
        agents: [leadAgent], // Strictly exactly 1 active approved district agent per district
        agentCount: 1,
        divisions: matchingDivisions,
        teamSize: 1 + matchingDivisions.length + totalPincodes,
        teamEarnings: districtTeamEarnings,
        teamPendingKyc: 0,
        teamApprovedKyc: 1 + matchingDivisions.length + totalPincodes
      });
    });

    // Also include canonical districts that do not yet have a lead agent, attaching their active divisions
    for (const cDist of canonicalDistricts) {
      const cDistKey = (cDist.name || '').toLowerCase();
      const existing = uniqueDistrictsList.find(d => cleanWord(d.district || d.name) === cleanWord(cDist.name));
      if (!existing) {
        const matchingDivisions = allDivisions.filter(div => {
          const divDist = getAgentDistrict(div).toLowerCase();
          const divDistId = String(div.assignedTerritory?.districtId || '');
          if (divDistId && divDistId === String(cDist._id)) return true;
          return cleanWord(divDist) === cleanWord(cDist.name);
        });

        const totalPincodes = matchingDivisions.reduce((acc, d) => acc + (d.pincodes?.length || d.teamSize || 0), 0);
        const stateName = scope?.state || 'Tamil Nadu';

        uniqueDistrictsList.push({
          _id: cDist._id,
          name: `${cDist.name} District`,
          email: '',
          phone: '',
          registrationId: cDist.code || `DIST-${cDist._id}`,
          role: 'district',
          status: 'approved',
          kycStatus: 'approved',
          registrationFeePaid: true,
          performanceScore: 0,
          earnings: 0,
          tieupsToday: 0,
          tieupsYesterday: 0,
          totalTieups: 0,
          territory: {
            state: stateName,
            district: cDist.name,
            division: '',
            pincode: ''
          },
          assignedTerritory: {
            state: stateName,
            stateId: String(cDist.stateId || ''),
            district: cDist.name,
            districtId: String(cDist._id),
            division: '',
            divisionId: '',
            taluk: '',
            pincode: '',
            pincodeId: ''
          } as any,
          district: cDist.name,
          agents: [],
          agentCount: 0,
          divisions: matchingDivisions,
          teamSize: matchingDivisions.length + totalPincodes,
          teamEarnings: matchingDivisions.reduce((acc: number, d: any) => acc + (d.teamEarnings || d.earnings || 0), 0),
          teamPendingKyc: 0,
          teamApprovedKyc: matchingPincodesCount(matchingDivisions)
        });
      }
    }

    function matchingPincodesCount(divs: any[]) {
      return divs.reduce((acc, d) => acc + (d.teamApprovedKyc || d.teamSize || 0), 0);
    }

    // Sort districts alphabetically
    uniqueDistrictsList.sort((a, b) => (a.district || a.name || '').localeCompare(b.district || b.name || ''));

    const enrichedDistricts = uniqueDistrictsList;

    // Nest districts strictly under their matching state
    let finalDistricts = enrichedDistricts;
    let finalDivisions = enrichedDivisions;

    if (scope?.role === 'district' && districtAgents.length === 0) {
      const requesterAgent = await Agent.findById(requesterId).lean();
      if (requesterAgent) {
        const enrichedReq: any = enrichAgentData(requesterAgent);
        enrichedReq.divisions = enrichedDivisions;
        enrichedReq.teamSize = enrichedDivisions.reduce((acc: number, d: any) => acc + 1 + (d.teamSize || 0), 0);
        enrichedReq.teamEarnings = enrichedDivisions.reduce((acc: number, d: any) => acc + (d.teamEarnings || 0), 0) + enrichedReq.earnings;
        enrichedReq.teamPendingKyc = 0;
        enrichedReq.teamApprovedKyc = enrichedDivisions.length + 1;
        finalDistricts = [enrichedReq];
      }
    } else if (scope?.role === 'division' && divisionAgents.length === 0) {
      const requesterAgent = await Agent.findById(requesterId).lean();
      if (requesterAgent) {
        const enrichedReq: any = enrichAgentData(requesterAgent);
        enrichedReq.pincodes = enrichedPincodes;
        enrichedReq.teamSize = enrichedPincodes.length;
        enrichedReq.teamEarnings = enrichedPincodes.reduce((acc: number, p: any) => acc + p.earnings, 0) + enrichedReq.earnings;
        finalDivisions = [enrichedReq];
      }
    }

    let tree: any[] = [];
    if (stateAgents.length > 0) {
      tree = stateAgents.map(state => {
        const stateTerritory = getAgentState(state).toLowerCase();
        const enrichedState = enrichAgentData(state);
        const stateDistricts = finalDistricts.filter(d => {
          const dState = getAgentState(d).toLowerCase();
          return Boolean(dState && stateTerritory && (dState === stateTerritory || dState.includes(stateTerritory) || stateTerritory.includes(dState)));
        });

        return {
          ...enrichedState,
          districts: stateDistricts,
          teamSize: stateDistricts.reduce((acc, d) => acc + 1 + (d.teamSize || 0), 0),
          teamEarnings: stateDistricts.reduce((acc, d) => acc + (d.teamEarnings || 0), 0) + enrichedState.earnings,
          teamPendingKyc: 0,
          teamApprovedKyc: stateDistricts.reduce((acc, d) => acc + (d.teamApprovedKyc || 1), 0) + 1
        };
      });
    } else if (finalDistricts.length > 0) {
      tree = finalDistricts;
    } else if (finalDivisions.length > 0) {
      tree = finalDivisions;
    } else {
      tree = enrichedPincodes;
    }

    const responseData = {
      agents: uniqueAgents,
      tree,
      states: stateAgents.length > 0 ? tree : [],
      districts: finalDistricts,
      divisions: finalDivisions,
      pincodes: enrichedPincodes,
      totalAgents: uniqueAgents.length,
      metrics: {
        totalState: stateAgents.length,
        totalDistrict: finalDistricts.length,
        totalDivision: finalDivisions.length,
        totalPincode: enrichedPincodes.length,
        pendingKycCount: 0,
        approvedKycCount: uniqueAgents.length,
        totalEarnings: (tree.length > 0 ? tree : enrichedDistricts).reduce((acc, d) => acc + (d.teamEarnings || d.earnings || 0), 0)
      }
    };

    // Cache computed hierarchy for 300 seconds (5 minutes)
    await cacheService.set(cacheKey, responseData, 300);

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Get hierarchy tree error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/leaderboard
export const getWeeklyLeaderboard = async (req: Request, res: Response) => {
  try {
    const requesterId = (req as any).agent?.agentId;
    const requesterEmail = (req as any).agent?.email;
    const scope = await getAgentTerritoryScope(requesterId, requesterEmail);
    const scopeFilter = buildTerritoryFilter(scope);

    const canonicalRole = (scope?.role || 'pincode').toLowerCase();
    const allowedTiers: string[] =
      canonicalRole === 'state' ? ['overall', 'district', 'division', 'pincode'] :
      canonicalRole === 'district' ? ['overall', 'division', 'pincode'] :
      canonicalRole === 'division' ? ['overall', 'pincode'] :
      ['overall'];

    const reqTier = ((req.query.tier as string) || (req.query.role as string) || 'overall').toLowerCase();
    if (reqTier && reqTier !== 'all' && reqTier !== 'overall' && !allowedTiers.includes(reqTier)) {
      return res.status(403).json({
        error: `Forbidden: Agent level '${canonicalRole}' is not authorized to access tier '${reqTier}'`,
        allowedTiers
      });
    }
    const activeTier = (reqTier === 'all' || !reqTier) ? 'overall' : reqTier;

    const timeframe = (req.query.timeframe as string) || 'this_week';
    const sortBy = (req.query.sortBy as string) || 'performanceScore';
    const reqStartDate = req.query.startDate as string;
    const reqEndDate = req.query.endDate as string;

    // Calculate dynamic start and end dates based on timeframe or explicit parameters
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (reqStartDate && reqEndDate && reqStartDate !== 'all') {
      start = new Date(reqStartDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(reqEndDate);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === 'today') {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === 'this_week') {
      // Monday through Sunday boundaries
      const day = now.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(now);
      start.setDate(now.getDate() + diffToMonday);
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === 'last_week') {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      start = new Date(now);
      start.setDate(now.getDate() + diffToMonday - 7);
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (timeframe === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (timeframe === 'this_year') {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    // Query scoped agents from Agent model
    const agents = await Agent.find(scopeFilter)
      .select('_id name email phone registrationId role level kycStatus registrationFeePaid performanceScore territory assignedTerritory createdAt')
      .lean();

    // Also include approved agents from users collection within the authorized territory
    try {
      const db = mongoose.connection.db;
      if (db) {
        const userDocs = await db.collection('users')
          .find({
            $and: [
              scopeFilter,
              { status: { $nin: ['rejected', 'suspended'] } }
            ]
          })
          .limit(100)
          .maxTimeMS(4000)
          .toArray();

        const existingEmails = new Set(agents.map(a => (a.email || '').toLowerCase()));
        const existingIds = new Set(agents.map(a => String(a._id)));

        for (const u of userDocs) {
          const uId = String(u._id);
          const uEmail = (u.email || '').toLowerCase();
          if (existingIds.has(uId) || (uEmail && existingEmails.has(uEmail))) continue;

          const uTerritory = u.assignedTerritory || u.territory || {
            state: u.state || u.assignedState || '',
            district: u.district || u.assignedDistrict || '',
            division: u.division || u.assignedDivision || '',
            pincode: u.pincode || u.assignedPincode || ''
          };

          let uRole = (u.role || u.level || 'pincode').toString().toLowerCase();
          if (uRole.includes('district') || u.level === 2 || u.level === '2') uRole = 'district';
          else if (uRole.includes('division') || u.level === 3 || u.level === '3') uRole = 'division';
          else if (uRole.includes('state') || u.level === 1 || u.level === '1') uRole = 'state';
          else uRole = 'pincode';

          agents.push({
            _id: u._id,
            name: u.name || 'Agent',
            email: u.email || '',
            phone: u.phone || u.mobile || '',
            registrationId: u.registrationId || `AG-${String(u._id).substring(0, 6)}`,
            role: uRole as any,
            kycStatus: u.kycStatus || 'approved',
            registrationFeePaid: u.registrationFeePaid ?? true,
            performanceScore: u.performanceScore || 0,
            territory: uTerritory,
            assignedTerritory: uTerritory,
            createdAt: u.createdAt || new Date()
          } as any);

          if (uEmail) existingEmails.add(uEmail);
          existingIds.add(uId);
        }
      }
    } catch (usersErr) {
      console.warn('Fallback users query for leaderboard skipped:', usersErr);
    }

    // Query TargetAssignment and Wallet collections safely using native DB queries to avoid Mongoose CastErrors
    const db = mongoose.connection.db;
    const validObjectIds = agents
      .map(a => a._id)
      .filter(id => mongoose.Types.ObjectId.isValid(id))
      .map(id => new mongoose.Types.ObjectId(id));
    const stringIds = agents.map(a => String(a._id));

    let assignments: any[] = [];
    let wallets: any[] = [];

    if (db && agents.length > 0) {
      const targetQuery: any = {
        $or: [
          { assignedTo: { $in: validObjectIds } },
          { assignedTo: { $in: stringIds } }
        ]
      };
      if (start && end) {
        targetQuery.$and = [
          {
            $or: [
              { createdAt: { $gte: start, $lte: end } },
              { dueDate: { $gte: start, $lte: end } },
              { completedAt: { $gte: start, $lte: end } }
            ]
          }
        ];
      }

      const walletQuery: any = {
        $or: [
          { agent: { $in: validObjectIds } },
          { agent: { $in: stringIds } }
        ]
      };

      try {
        const [rawAsgns, rawWallets] = await Promise.all([
          db.collection('targetassignments').find(targetQuery).toArray(),
          db.collection('wallets').find(walletQuery).toArray()
        ]);

        const targetIds = rawAsgns.map((a: any) => a.target).filter(Boolean);
        const validTargetOIds = targetIds.filter((id: any) => mongoose.Types.ObjectId.isValid(id)).map((id: any) => new mongoose.Types.ObjectId(id));
        const targetDocs = validTargetOIds.length > 0
          ? await db.collection('targets').find({ _id: { $in: validTargetOIds } }).toArray()
          : [];
        const targetMap = new Map(targetDocs.map((t: any) => [String(t._id), t]));

        assignments = rawAsgns.map((a: any) => ({
          ...a,
          target: targetMap.get(String(a.target)) || a.target
        }));
        wallets = rawWallets;
      } catch (queryErr) {
        console.error('Error fetching assignments/wallets via native DB:', queryErr);
      }
    }

    // Enrich agents with accurate performance metrics
    const enrichedAgents = agents.map(agent => {
      const aIdStr = String(agent._id);
      const agentAsgns = assignments.filter((a: any) => String(a.assignedTo) === aIdStr);
      const targetsTotal = agentAsgns.reduce((acc, a: any) => acc + (a.target?.targetValue || a.targetValue || 1), 0);
      const targetsCompleted = agentAsgns.filter((a: any) => a.status === 'completed').reduce((acc, a: any) => acc + (a.target?.targetValue || a.targetValue || 1), 0);

      const agentWallet = wallets.find((w: any) => String(w.agent) === aIdStr);
      const weeklyEarnings = (agentWallet?.transactions || [])
        .filter((t: any) => {
          if (t.type !== 'credit' || t.status !== 'completed') return false;
          if (!start || !end) return true;
          const tDate = t.createdAt ? new Date(t.createdAt) : null;
          return tDate && tDate >= start && tDate <= end;
        })
        .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);

      const realScore = targetsTotal > 0
        ? Math.min(100, Math.round((targetsCompleted / targetsTotal) * 100))
        : (agent.performanceScore || 0);

      const terr = agent.assignedTerritory || agent.territory || {};

      let agentRoleNorm = (agent.role || (agent as any).level || 'pincode').toString().toLowerCase();
      if (agentRoleNorm.includes('state')) agentRoleNorm = 'state';
      else if (agentRoleNorm.includes('district')) agentRoleNorm = 'district';
      else if (agentRoleNorm.includes('division')) agentRoleNorm = 'division';
      else agentRoleNorm = 'pincode';

      return {
        _id: String(agent._id),
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
        role: agentRoleNorm,
        kycStatus: agent.kycStatus || 'approved',
        registrationFeePaid: agent.registrationFeePaid ?? false,
        performanceScore: realScore,
        weeklyEarnings,
        targetsCompleted,
        targetsTotal,
        territory: {
          state: terr.state || (agent as any).state || scope?.state || 'Tamil Nadu',
          district: terr.district || (agent as any).district || '',
          division: terr.division || (agent as any).division || '',
          pincode: terr.pincode || (agent as any).pincode || ''
        },
        trend: realScore >= 75 ? 'up' : realScore >= 40 ? 'stable' : 'down',
        createdAt: agent.createdAt
      };
    });

    // Tie-breaking sorting function
    const sortFn = (a: any, b: any) => {
      if (sortBy === 'weeklyEarnings') {
        if (b.weeklyEarnings !== a.weeklyEarnings) return b.weeklyEarnings - a.weeklyEarnings;
        if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
        if ((b.targetsCompleted || 0) !== (a.targetsCompleted || 0)) return (b.targetsCompleted || 0) - (a.targetsCompleted || 0);
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'targetsCompleted') {
        if ((b.targetsCompleted || 0) !== (a.targetsCompleted || 0)) return (b.targetsCompleted || 0) - (a.targetsCompleted || 0);
        if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
        if (b.weeklyEarnings !== a.weeklyEarnings) return b.weeklyEarnings - a.weeklyEarnings;
        return (a.name || '').localeCompare(b.name || '');
      }
      // default: performanceScore
      if (b.performanceScore !== a.performanceScore) return b.performanceScore - a.performanceScore;
      if (b.weeklyEarnings !== a.weeklyEarnings) return b.weeklyEarnings - a.weeklyEarnings;
      if ((b.targetsCompleted || 0) !== (a.targetsCompleted || 0)) return (b.targetsCompleted || 0) - (a.targetsCompleted || 0);
      return (a.name || '').localeCompare(b.name || '');
    };

    let leaderboard: any[] = [];

    if (activeTier === 'district' && canonicalRole === 'state') {
      // Group by District within assigned State
      const districtMap = new Map<string, any>();
      for (const agent of enrichedAgents) {
        const dist = (agent.territory?.district || '').trim();
        if (!dist) continue;

        const key = dist.toLowerCase();
        if (!districtMap.has(key)) {
          districtMap.set(key, {
            _id: `district_${key}`,
            name: dist,
            district: dist,
            parentState: scope?.state || agent.territory?.state || 'Tamil Nadu',
            role: 'district',
            tierRole: 'District Tier',
            territory: {
              state: scope?.state || agent.territory?.state || 'Tamil Nadu',
              district: dist
            },
            targetsCompleted: 0,
            targetsTotal: 0,
            weeklyEarnings: 0,
            agentsCount: 0,
            totalScoreSum: 0
          });
        }

        const d = districtMap.get(key)!;
        d.targetsCompleted += agent.targetsCompleted;
        d.targetsTotal += agent.targetsTotal;
        d.weeklyEarnings += agent.weeklyEarnings;
        d.agentsCount += 1;
        d.totalScoreSum += agent.performanceScore;
      }

      leaderboard = Array.from(districtMap.values()).map(d => {
        const performanceScore = d.targetsTotal > 0
          ? Math.min(100, Math.round((d.targetsCompleted / d.targetsTotal) * 100))
          : (d.agentsCount > 0 ? Math.round(d.totalScoreSum / d.agentsCount) : 0);
        return {
          ...d,
          performanceScore,
          trend: performanceScore >= 75 ? 'up' : performanceScore >= 40 ? 'stable' : 'down'
        };
      });
      leaderboard.sort(sortFn);
    } else if (activeTier === 'division' && (canonicalRole === 'state' || canonicalRole === 'district')) {
      // Group by Division within authorized territory
      const divisionMap = new Map<string, any>();
      for (const agent of enrichedAgents) {
        const div = (agent.territory?.division || '').trim();
        if (!div) continue;

        if (canonicalRole === 'district' && scope?.district) {
          const agentDist = (agent.territory?.district || '').trim().toLowerCase();
          if (agentDist && !agentDist.includes(scope.district.toLowerCase()) && !scope.district.toLowerCase().includes(agentDist)) {
            continue;
          }
        }

        const key = div.toLowerCase();
        if (!divisionMap.has(key)) {
          divisionMap.set(key, {
            _id: `division_${key}`,
            name: div,
            division: div,
            parentDistrict: agent.territory?.district || scope?.district || '',
            parentState: scope?.state || agent.territory?.state || 'Tamil Nadu',
            role: 'division',
            tierRole: 'Division Tier',
            territory: {
              state: scope?.state || agent.territory?.state || 'Tamil Nadu',
              district: agent.territory?.district || scope?.district || '',
              division: div
            },
            targetsCompleted: 0,
            targetsTotal: 0,
            weeklyEarnings: 0,
            agentsCount: 0,
            totalScoreSum: 0
          });
        }

        const d = divisionMap.get(key)!;
        d.targetsCompleted += agent.targetsCompleted;
        d.targetsTotal += agent.targetsTotal;
        d.weeklyEarnings += agent.weeklyEarnings;
        d.agentsCount += 1;
        d.totalScoreSum += agent.performanceScore;
      }

      leaderboard = Array.from(divisionMap.values()).map(d => {
        const performanceScore = d.targetsTotal > 0
          ? Math.min(100, Math.round((d.targetsCompleted / d.targetsTotal) * 100))
          : (d.agentsCount > 0 ? Math.round(d.totalScoreSum / d.agentsCount) : 0);
        return {
          ...d,
          performanceScore,
          trend: performanceScore >= 75 ? 'up' : performanceScore >= 40 ? 'stable' : 'down'
        };
      });
      leaderboard.sort(sortFn);
    } else if (activeTier === 'pincode' && (canonicalRole === 'state' || canonicalRole === 'district' || canonicalRole === 'division')) {
      // Group by Pincode within authorized territory
      const pincodeMap = new Map<string, any>();
      for (const agent of enrichedAgents) {
        const pin = (agent.territory?.pincode || '').trim();
        if (!pin) continue;

        if (canonicalRole === 'division' && scope?.division) {
          const agentDiv = (agent.territory?.division || '').trim().toLowerCase();
          if (agentDiv && !agentDiv.includes(scope.division.toLowerCase()) && !scope.division.toLowerCase().includes(agentDiv)) {
            continue;
          }
        } else if (canonicalRole === 'district' && scope?.district) {
          const agentDist = (agent.territory?.district || '').trim().toLowerCase();
          if (agentDist && !agentDist.includes(scope.district.toLowerCase()) && !scope.district.toLowerCase().includes(agentDist)) {
            continue;
          }
        }

        const key = pin;
        if (!pincodeMap.has(key)) {
          pincodeMap.set(key, {
            _id: `pincode_${key}`,
            name: `PIN ${pin}`,
            pincode: pin,
            parentDivision: agent.territory?.division || scope?.division || '',
            parentDistrict: agent.territory?.district || scope?.district || '',
            parentState: scope?.state || agent.territory?.state || 'Tamil Nadu',
            role: 'pincode',
            tierRole: 'Pincode Tier',
            territory: {
              state: scope?.state || agent.territory?.state || 'Tamil Nadu',
              district: agent.territory?.district || scope?.district || '',
              division: agent.territory?.division || scope?.division || '',
              pincode: pin
            },
            targetsCompleted: 0,
            targetsTotal: 0,
            weeklyEarnings: 0,
            agentsCount: 0,
            totalScoreSum: 0
          });
        }

        const p = pincodeMap.get(key)!;
        p.targetsCompleted += agent.targetsCompleted;
        p.targetsTotal += agent.targetsTotal;
        p.weeklyEarnings += agent.weeklyEarnings;
        p.agentsCount += 1;
        p.totalScoreSum += agent.performanceScore;
      }

      leaderboard = Array.from(pincodeMap.values()).map(p => {
        const performanceScore = p.targetsTotal > 0
          ? Math.min(100, Math.round((p.targetsCompleted / p.targetsTotal) * 100))
          : (p.agentsCount > 0 ? Math.round(p.totalScoreSum / p.agentsCount) : 0);
        return {
          ...p,
          performanceScore,
          trend: performanceScore >= 75 ? 'up' : performanceScore >= 40 ? 'stable' : 'down'
        };
      });
      leaderboard.sort(sortFn);
    } else {
      // Default: 'overall' network of eligible individual agents
      leaderboard = [...enrichedAgents];
      leaderboard.sort(sortFn);
    }

    // Attach ranks
    leaderboard = leaderboard.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    return res.status(200).json({
      leaderboard,
      topPerformers: leaderboard.slice(0, 3),
      userRole: canonicalRole,
      allowedTiers,
      activeTier,
      timeframe,
      startDate: start ? start.toISOString() : null,
      totalCount: leaderboard.length,
      totalAgents: leaderboard.length
    });
  } catch (error) {
    console.error('Get weekly leaderboard error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/categories or /api/categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'categories:all';
    const cachedCategories = await cacheService.get<any[]>(cacheKey);
    if (cachedCategories) {
      return res.status(200).json({
        success: true,
        categories: cachedCategories
      });
    }

    const db = mongoose.connection.db;
    let categories: any[] = [];
    if (db) {
      categories = await db.collection('categories').find().sort({ sortOrder: 1, name: 1 }).toArray();
    }
    
    // If no categories exist in database, return canonical main categories from Admin Category Management
    if (!categories || categories.length === 0) {
      const canonicalMains = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
      categories = canonicalMains.map((name, index) => ({
        _id: String(index + 1),
        name,
        level: 'main',
        isMainCategory: true,
        isActive: true,
        sortOrder: index + 1
      }));
    }

    // Cache categories for 5 minutes (300s)
    await cacheService.set(cacheKey, categories, 300);

    return res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    const canonicalMains = ['Services', 'Products', 'Daily Needs', 'Food', 'Stay', 'Travel', 'Jobs'];
    const fallback = canonicalMains.map((name, index) => ({
      _id: String(index + 1),
      name,
      level: 'main',
      isMainCategory: true,
      isActive: true,
      sortOrder: index + 1
    }));
    return res.status(200).json({ success: true, categories: fallback });
  }
};

