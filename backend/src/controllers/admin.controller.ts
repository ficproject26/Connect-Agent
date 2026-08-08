import { Request, Response } from 'express';
import Agent from '../models/Agent';
import AuditLog from '../models/AuditLog';

// GET /api/admin/registrations
export const getRegistrations = async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const filter: any = {};
    if (status) {
      filter.kycStatus = status;
    }
    
    const registrations = await Agent.find(filter).select('-password').sort({ createdAt: -1 });
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
    const agent = await Agent.findById(id).select('-password');
    if (!agent) {
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

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

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

    return res.status(200).json({
      message: 'Agent registration application approved successfully.',
      registration: agent
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

    const agent = await Agent.findById(id);
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

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

    return res.status(200).json({
      message: 'Agent registration application rejected successfully.',
      registration: agent
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/hierarchy
export const getHierarchyTree = async (req: Request, res: Response) => {
  try {
    const statusFilter = req.query.status as string;
    const filter: any = {};
    if (statusFilter && statusFilter !== 'all') {
      filter.kycStatus = statusFilter;
    }
    
    const agents = await Agent.find(filter).select('-password').sort({ createdAt: -1 });

    // Group agents into multi-tier hierarchy
    const stateAgents = agents.filter(a => a.role === 'state');
    const districtAgents = agents.filter(a => a.role === 'district');
    const divisionAgents = agents.filter(a => a.role === 'division');
    const pincodeAgents = agents.filter(a => a.role === 'pincode');

    // Helper function to build detailed metrics for an agent
    const enrichAgentData = (agent: any) => {
      const perf = agent.performanceScore || 85;
      const feePaid = agent.registrationFeePaid ?? true;
      const kyc = agent.kycStatus || 'pending';
      const earnings = Math.floor((perf * 450) + (feePaid ? 5000 : 0));

      const plusPoints = [];
      const minusPoints = [];

      if (kyc === 'approved') plusPoints.push('KYC Verified');
      else minusPoints.push(`KYC ${kyc.toUpperCase()}`);

      if (feePaid) plusPoints.push('Registration Fee Paid');
      else minusPoints.push('Registration Fee Unpaid');

      if (perf >= 75) plusPoints.push(`High Performance (${perf}%)`);
      else minusPoints.push(`Low Performance (${perf}%)`);

      if (earnings > 10000) plusPoints.push(`High Earnings (₹${earnings.toLocaleString()})`);

      const tieupsToday = Math.floor((perf * 0.25) + 3);
      const tieupsYesterday = Math.floor((perf * 0.3) + 4);
      const totalTieups = Math.floor((perf * 3.5) + (feePaid ? 40 : 10));

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
        plusPoints,
        minusPoints,
        createdAt: agent.createdAt,
      };
    };

    const enrichedDistricts = districtAgents.map(dist => {
      const distTerritory = dist.territory?.district || (dist as any).district || 'District Territory';
      const enrichedDist = enrichAgentData(dist);

      // Find child division agents under this district
      const matchingDivisions = divisionAgents
        .filter(div => {
          const divDist = div.territory?.district || (div as any).district;
          return !divDist || divDist === distTerritory || districtAgents.length === 1;
        })
        .map(div => {
          const divTerritory = div.territory?.division || (div as any).division || 'Division Territory';
          const enrichedDiv = enrichAgentData(div);

          // Find child pincode agents under this division (strictly 1 agent per pincode)
          const seenPincodes = new Set<string>();
          const matchingPincodes = pincodeAgents
            .filter(pin => {
              const pinDiv = pin.territory?.division || (pin as any).division;
              const pinCode = pin.territory?.pincode || (pin as any).pincode;
              if (pinCode && seenPincodes.has(pinCode)) {
                return false; // Exclude duplicate agent on same pincode
              }
              const isMatch = !pinDiv || pinDiv === divTerritory || divisionAgents.length === 1;
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
      const divTerritory = div.territory?.division || (div as any).division || 'Division Territory';
      const enrichedDiv = enrichAgentData(div);
      const matchingPincodes = pincodeAgents
        .filter(pin => {
          const pinDiv = pin.territory?.division || (pin as any).division;
          return !pinDiv || pinDiv === divTerritory || divisionAgents.length === 1;
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

    // If state agents exist, nest under state, else return districts directly
    let tree: any[] = [];
    if (stateAgents.length > 0) {
      tree = stateAgents.map(state => {
        const stateTerritory = state.territory?.state || (state as any).state || 'State Territory';
        const enrichedState = enrichAgentData(state);
        const stateDistricts = enrichedDistricts.filter(d => {
          const dState = d.territory?.state;
          return !dState || dState === stateTerritory;
        });

        return {
          ...enrichedState,
          districts: stateDistricts,
          teamSize: stateDistricts.reduce((acc, d) => acc + 1 + d.teamSize, 0),
          teamEarnings: stateDistricts.reduce((acc, d) => acc + d.teamEarnings, 0) + enrichedState.earnings,
          teamPendingKyc: stateDistricts.reduce((acc, d) => acc + d.teamPendingKyc, 0) + (enrichedState.kycStatus === 'pending' ? 1 : 0)
        };
      });
    } else {
      tree = enrichedDistricts;
    }

    return res.status(200).json({
      tree,
      states: tree,
      districts: enrichedDistricts,
      divisions: enrichedDivisions,
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
    });
  } catch (error) {
    console.error('Get hierarchy tree error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/admin/leaderboard
export const getWeeklyLeaderboard = async (req: Request, res: Response) => {
  try {
    const roleFilter = req.query.role as string;
    const timeframe = (req.query.timeframe as string) || 'this_week';
    const sortBy = (req.query.sortBy as string) || 'performanceScore';

    const filter: any = {};
    if (roleFilter && roleFilter !== 'all') {
      filter.role = roleFilter;
    }

    const agents = await Agent.find(filter).select('-password');

    // Enrich and compute leaderboard metrics
    let leaderboard = agents.map(agent => {
      const perf = agent.performanceScore || 85;
      const feePaid = agent.registrationFeePaid ?? true;
      const weeklyEarnings = Math.floor((perf * 380) + (feePaid ? 2500 : 0));
      const targetsCompleted = Math.floor(perf / 10);
      const targetsTotal = targetsCompleted + 2;

      return {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        registrationId: agent.registrationId || `AG-${String(agent._id).substring(0, 6)}`,
        role: agent.role,
        kycStatus: agent.kycStatus,
        registrationFeePaid: feePaid,
        performanceScore: perf,
        weeklyEarnings,
        targetsCompleted,
        targetsTotal,
        territory: agent.territory || {},
        trend: perf >= 85 ? 'up' : perf >= 70 ? 'stable' : 'down'
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
