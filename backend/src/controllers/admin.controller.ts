import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agent from '../models/Agent';
import AuditLog from '../models/AuditLog';
import Vendor from '../models/Vendor';
import TargetAssignment from '../models/TargetAssignment';
import Wallet from '../models/Wallet';
import { getAgentTerritoryScope, buildTerritoryFilter, buildVendorScopeFilter, invalidateAgentTerritoryScope } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';

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

    let agent = await Agent.findById(id);
    let agentEmail = agent?.email;

    if (agent) {
      const oldStatus = agent.kycStatus;
      agent.kycStatus = 'approved';
      agent.remarks = remarks || 'Approved by Admin';
      agent.updatedAt = new Date();
      await agent.save();

      const adminId = (req as any).agent?.agentId || agent._id;
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

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    let agent = await Agent.findById(id);
    let agentEmail = agent?.email;

    if (agent) {
      const oldStatus = agent.kycStatus;
      agent.kycStatus = 'rejected';
      agent.rejectionReason = rejectionReason;
      agent.remarks = remarks || 'Rejected by Admin';
      agent.updatedAt = new Date();
      await agent.save();

      const adminId = (req as any).agent?.agentId || agent._id;
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
    const scopeFilter = buildTerritoryFilter(scope);
    const vendorScopeFilter = buildVendorScopeFilter(scope);

    const filter: any = { ...scopeFilter };
    if (statusFilter && statusFilter !== 'all') {
      filter.kycStatus = statusFilter;
    }

    // Safely execute independent queries in parallel with field projections
    const [agents, allVendors] = await Promise.all([
      Agent.find(filter)
        .select('_id name email phone registrationId role kycStatus registrationFeePaid performanceScore territory assignedTerritory address fullAddress createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Vendor.find(vendorScopeFilter)
        .select('_id assignedAgent pincode division district createdAt')
        .lean()
    ]);

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

    // Group agents into multi-tier hierarchy
    const stateAgents = agents.filter(a => a.role === 'state');
    const districtAgents = agents.filter(a => a.role === 'district');
    const divisionAgents = agents.filter(a => a.role === 'division');
    const pincodeAgents = agents.filter(a => a.role === 'pincode');

    // Helper function to build detailed metrics for an agent based on REAL vendor data
    const enrichAgentData = (agent: any) => {
      const perf = agent.performanceScore || 0;
      const feePaid = agent.registrationFeePaid ?? false;
      const kyc = agent.kycStatus || 'pending';

      const agentIdStr = String(agent._id);
      const agentDistrictLower = (agent.territory?.district || (agent as any).district || '').trim().toLowerCase();
      const agentDivisionLower = (agent.territory?.division || (agent as any).division || '').trim().toLowerCase();
      const agentPincode = (agent.territory?.pincode || (agent as any).pincode || '').trim();

      // Look up vendors for this agent using pre-indexed lookup maps
      let candidateVendors: any[] = [];
      if (vendorsByAgent.has(agentIdStr)) {
        candidateVendors = candidateVendors.concat(vendorsByAgent.get(agentIdStr) || []);
      }
      if (agent.role === 'pincode' && agentPincode && vendorsByPincode.has(agentPincode)) {
        candidateVendors = candidateVendors.concat(vendorsByPincode.get(agentPincode) || []);
      } else if (agent.role === 'division' && agentDivisionLower && vendorsByDivision.has(agentDivisionLower)) {
        candidateVendors = candidateVendors.concat(vendorsByDivision.get(agentDivisionLower) || []);
      } else if (agent.role === 'district' && agentDistrictLower && vendorsByDistrict.has(agentDistrictLower)) {
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

      const plusPoints = [];
      const minusPoints = [];

      if (kyc === 'approved') plusPoints.push('KYC Verified');
      else minusPoints.push(`KYC ${kyc.toUpperCase()}`);

      if (feePaid) plusPoints.push('Registration Fee Paid');
      else minusPoints.push('Registration Fee Unpaid');

      if (totalTieups > 0) plusPoints.push(`Onboarded ${totalTieups} Merchant Vendors`);

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
        role: agent.role,
        kycStatus: agent.kycStatus,
        registrationFeePaid: agent.registrationFeePaid,
        performanceScore: perf,
        earnings,
        tieupsToday,
        tieupsYesterday,
        totalTieups,
        territory: agent.territory || {},
        assignedTerritory: agent.assignedTerritory || agent.territory || {},
        address: agent.address || {},
        fullAddress: agent.fullAddress || '',
        plusPoints,
        minusPoints,
        createdAt: agent.createdAt,
      };
    };

    const enrichedDistricts = districtAgents.map(dist => {
      const distTerritory = dist.territory?.district || (dist as any).district;
      const distState = dist.territory?.state || (dist as any).state;
      const enrichedDist = enrichAgentData(dist);

      // Find child division agents strictly under this district
      const matchingDivisions = divisionAgents
        .filter(div => {
          const divDist = div.territory?.district || (div as any).district;
          const divState = div.territory?.state || (div as any).state;
          if (distState && divState && distState.toLowerCase() !== divState.toLowerCase()) return false;
          return Boolean(divDist && distTerritory && divDist.toLowerCase() === distTerritory.toLowerCase());
        })
        .map(div => {
          const divTerritory = div.territory?.division || (div as any).division;
          const divDist = div.territory?.district || (div as any).district;
          const enrichedDiv = enrichAgentData(div);

          // Find child pincode agents strictly under this division
          const seenPincodes = new Set<string>();
          const matchingPincodes = pincodeAgents
            .filter(pin => {
              const pinDiv = pin.territory?.division || (pin as any).division;
              const pinDist = pin.territory?.district || (pin as any).district;
              const pinCode = pin.territory?.pincode || (pin as any).pincode;
              if (pinCode && seenPincodes.has(pinCode)) {
                return false;
              }
              if (divDist && pinDist && divDist.toLowerCase() !== pinDist.toLowerCase()) return false;
              const isMatch = Boolean(pinDiv && divTerritory && pinDiv.toLowerCase() === divTerritory.toLowerCase());
              if (isMatch && pinCode) {
                seenPincodes.add(pinCode);
              }
              return isMatch;
            })
            .map(pin => enrichAgentData(pin));

          // Team metrics for division
          const divTeamEarnings = matchingPincodes.reduce((acc, p) => acc + p.earnings, 0) + enrichedDiv.earnings;
          const divPendingKyc = matchingPincodes.filter(p => p.kycStatus === 'pending').length + (enrichedDiv.kycStatus === 'pending' ? 1 : 0);
          const divApprovedKyc = matchingPincodes.filter(p => p.kycStatus === 'approved').length + (enrichedDiv.kycStatus === 'approved' ? 1 : 0);

          return {
            ...enrichedDiv,
            pincodes: matchingPincodes,
            teamSize: matchingPincodes.length,
            teamEarnings: divTeamEarnings,
            teamPendingKyc: divPendingKyc,
            teamApprovedKyc: divApprovedKyc
          };
        });

      // Team metrics for district
      const totalPincodes = matchingDivisions.reduce((acc, d) => acc + d.teamSize, 0);
      const districtTeamEarnings = matchingDivisions.reduce((acc, d) => acc + d.teamEarnings, 0) + enrichedDist.earnings;
      const districtPendingKyc = matchingDivisions.reduce((acc, d) => acc + d.teamPendingKyc, 0) + (enrichedDist.kycStatus === 'pending' ? 1 : 0);
      const districtApprovedKyc = matchingDivisions.reduce((acc, d) => acc + d.teamApprovedKyc, 0) + (enrichedDist.kycStatus === 'approved' ? 1 : 0);

      return {
        ...enrichedDist,
        divisions: matchingDivisions,
        teamSize: matchingDivisions.length + totalPincodes,
        teamEarnings: districtTeamEarnings,
        teamPendingKyc: districtPendingKyc,
        teamApprovedKyc: districtApprovedKyc
      };
    });

    // Build division list for division-level scoping
    const enrichedDivisions = divisionAgents.map(div => {
      const divTerritory = div.territory?.division || (div as any).division;
      const divDist = div.territory?.district || (div as any).district;
      const enrichedDiv = enrichAgentData(div);
      const matchingPincodes = pincodeAgents
        .filter(pin => {
          const pinDiv = pin.territory?.division || (pin as any).division;
          const pinDist = pin.territory?.district || (pin as any).district;
          if (divDist && pinDist && divDist.toLowerCase() !== pinDist.toLowerCase()) return false;
          return Boolean(pinDiv && divTerritory && pinDiv.toLowerCase() === divTerritory.toLowerCase());
        })
        .map(pin => enrichAgentData(pin));

      return {
        ...enrichedDiv,
        pincodes: matchingPincodes,
        teamSize: matchingPincodes.length,
        teamEarnings: matchingPincodes.reduce((acc, p) => acc + p.earnings, 0) + enrichedDiv.earnings
      };
    });

    const enrichedPincodes = pincodeAgents.map(pin => enrichAgentData(pin));

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
        enrichedReq.teamPendingKyc = enrichedDivisions.reduce((acc: number, d: any) => acc + (d.teamPendingKyc || 0), 0) + (enrichedReq.kycStatus === 'pending' ? 1 : 0);
        enrichedReq.teamApprovedKyc = enrichedDivisions.reduce((acc: number, d: any) => acc + (d.teamApprovedKyc || 0), 0) + (enrichedReq.kycStatus === 'approved' ? 1 : 0);
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
        const stateTerritory = state.territory?.state || (state as any).state;
        const enrichedState = enrichAgentData(state);
        const stateDistricts = finalDistricts.filter(d => {
          const dState = d.territory?.state || (d as any).state;
          return Boolean(dState && stateTerritory && dState.toLowerCase() === stateTerritory.toLowerCase());
        });

        return {
          ...enrichedState,
          districts: stateDistricts,
          teamSize: stateDistricts.reduce((acc, d) => acc + 1 + (d.teamSize || 0), 0),
          teamEarnings: stateDistricts.reduce((acc, d) => acc + (d.teamEarnings || 0), 0) + enrichedState.earnings,
          teamPendingKyc: stateDistricts.reduce((acc, d) => acc + (d.teamPendingKyc || 0), 0) + (enrichedState.kycStatus === 'pending' ? 1 : 0)
        };
      });
    } else if (finalDistricts.length > 0) {
      tree = finalDistricts;
    } else {
      tree = finalDivisions;
    }

    const responseData = {
      tree,
      states: tree,
      districts: finalDistricts,
      divisions: finalDivisions,
      pincodes: enrichedPincodes,
      totalAgents: agents.length,
      metrics: {
        totalState: stateAgents.length,
        totalDistrict: districtAgents.length,
        totalDivision: divisionAgents.length,
        totalPincode: pincodeAgents.length,
        pendingKycCount: agents.filter(a => a.kycStatus === 'pending').length,
        approvedKycCount: agents.filter(a => a.kycStatus === 'approved').length,
        totalEarnings: (tree.length > 0 ? tree : enrichedDistricts).reduce((acc, d) => acc + (d.teamEarnings || d.earnings), 0)
      }
    };

    // Cache computed hierarchy for 60 seconds
    await cacheService.set(cacheKey, responseData, 60);

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
    const scope = await getAgentTerritoryScope(requesterId);
    const scopeFilter = buildTerritoryFilter(scope);

    const roleFilter = req.query.role as string;
    const timeframe = (req.query.timeframe as string) || 'this_week';
    const sortBy = (req.query.sortBy as string) || 'performanceScore';

    const filter: any = { ...scopeFilter };
    if (roleFilter && roleFilter !== 'all') {
      filter.role = roleFilter;
    }

    const agents = await Agent.find(filter)
      .select('_id name email phone registrationId role kycStatus registrationFeePaid performanceScore territory createdAt')
      .lean();

    const agentIds = agents.map(a => a._id);
    const [assignments, wallets] = await Promise.all([
      TargetAssignment.find({ assignedTo: { $in: agentIds } }).populate('target').lean(),
      Wallet.find({ agent: { $in: agentIds } }).lean()
    ]);

    // Enrich and compute real leaderboard metrics from actual DB records
    let leaderboard = agents.map(agent => {
      const agentAsgns = assignments.filter((a: any) => String(a.assignedTo) === String(agent._id));
      const targetsTotal = agentAsgns.reduce((acc, a: any) => acc + (a.target?.targetValue || 1), 0);
      const targetsCompleted = agentAsgns.filter((a: any) => a.status === 'completed').reduce((acc, a: any) => acc + (a.target?.targetValue || 1), 0);

      const agentWallet = wallets.find((w: any) => String(w.agent) === String(agent._id));
      const weeklyEarnings = (agentWallet?.transactions || [])
        .filter((t: any) => t.type === 'credit' && t.status === 'completed')
        .reduce((acc: number, t: any) => acc + (t.amount || 0), 0);

      const realScore = targetsTotal > 0
        ? Math.min(100, Math.round((targetsCompleted / targetsTotal) * 100))
        : (agent.performanceScore || 0);

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
        role: agent.role,
        kycStatus: agent.kycStatus,
        registrationFeePaid: agent.registrationFeePaid ?? false,
        performanceScore: realScore,
        weeklyEarnings,
        targetsCompleted,
        targetsTotal,
        territory: agent.territory || {},
        trend: realScore >= 75 ? 'up' : realScore >= 40 ? 'stable' : 'down',
        createdAt: agent.createdAt
      };
    });

    // Sort leaderboard based on sortBy
    leaderboard.sort((a, b) => {
      if (sortBy === 'weeklyEarnings') return b.weeklyEarnings - a.weeklyEarnings;
      if (sortBy === 'targetsCompleted') return b.targetsCompleted - a.targetsCompleted;
      return b.performanceScore - a.performanceScore;
    });

    // Attach rank
    leaderboard = leaderboard.map((item, index) => ({
      ...item,
      rank: index + 1
    }));

    return res.status(200).json({
      leaderboard,
      timeframe,
      totalAgents: leaderboard.length,
      topPerformers: leaderboard.slice(0, 3)
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

