import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Vendor from '../models/Vendor';
import TargetAssignment from '../models/TargetAssignment';
import Task from '../models/Task';
import Ticket from '../models/Ticket';
import Notification from '../models/Notification';
import Report from '../models/Report';
import Agent from '../models/Agent';
import { getAgentTerritoryScope, buildVendorScopeFilter } from '../utils/territoryScope';
import { cacheService } from '../services/cache.service';

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const cacheKey = `dashboard:${agentId}`;
    const cachedStats = await cacheService.get(cacheKey);
    if (cachedStats) {
      return res.status(200).json(cachedStats);
    }

    const scope = await getAgentTerritoryScope(agentId);
    const vendorScopeFilter = buildVendorScopeFilter(scope);

    const vendorFilter = Object.keys(vendorScopeFilter).length > 0 ? vendorScopeFilter : { assignedAgent: agentId };

    const isObjId = mongoose.Types.ObjectId.isValid(agentId);
    const agentMatches: any[] = [agentId];
    if (isObjId) agentMatches.push(new mongoose.Types.ObjectId(agentId));

    const taskMatches: any[] = [
      { assignedAgentId: agentId },
      { assignedAgentId: { $in: agentMatches } }
    ];

    const totalRegisteredFilter = {
      $and: [
        vendorFilter,
        {
          $or: [
            { businessName: { $exists: true, $nin: ['', null] } },
            { name: { $exists: true, $nin: ['', null] } }
          ]
        }
      ]
    };

    const activeVendorFilter = {
      $and: [
        vendorFilter,
        { kycStatus: { $in: ['approved', 'Approved', 'verified', 'Verified'] } },
        { status: { $in: ['active', 'Active', 'approved', 'Approved', 'verified', 'Verified'] } }
      ]
    };

    const adminPendingFilter = {
      $and: [
        vendorFilter,
        {
          $or: [
            { approvalStatus: { $in: ['PENDING_PINCODE_APPROVAL', 'pending_pincode_approval', 'pending', 'Pending'] } },
            { status: { $in: ['pending', 'Pending', 'PENDING_PINCODE_APPROVAL'] } }
          ]
        },
        { approvalStatus: { $nin: ['approved', 'Approved'] } }
      ]
    };

    const kycPendingFilter = {
      $and: [
        vendorFilter,
        {
          $or: [
            { approvalStatus: { $in: ['approved', 'Approved'] } },
            { status: { $in: ['active', 'Active', 'approved', 'Approved'] } }
          ]
        },
        { approvalStatus: { $nin: ['PENDING_PINCODE_APPROVAL', 'pending_pincode_approval', 'pending', 'Pending'] } },
        { kycStatus: { $nin: ['approved', 'Approved', 'verified', 'Verified'] } }
      ]
    };

    // Calculate dynamic territory counts within authorized scope
    let totalDistricts = 0;
    let totalDivisions = 0;
    let totalPincodes = 0;

    if (scope) {
      if (scope.role === 'state' && scope.state) {
        const sRegex = new RegExp(`^\\s*${escapeRegex(scope.state)}\\s*$`, 'i');
        const [distDocs, divDocs, pinDocs] = await Promise.all([
          Agent.distinct('territory.district', { role: 'district', status: { $in: ['active', 'approved'] }, 'territory.state': sRegex }),
          Agent.distinct('territory.division', { role: 'division', status: { $in: ['active', 'approved'] }, 'territory.state': sRegex }),
          Agent.distinct('territory.pincode', { role: 'pincode', status: { $in: ['active', 'approved'] }, 'territory.state': sRegex })
        ]);
        totalDistricts = distDocs.filter(Boolean).length;
        totalDivisions = divDocs.filter(Boolean).length;
        totalPincodes = pinDocs.filter(Boolean).length;
      } else if (scope.role === 'district' && scope.district) {
        const dRegex = new RegExp(`^\\s*${escapeRegex(scope.district)}\\s*$`, 'i');
        const [divDocs, pinDocs] = await Promise.all([
          Agent.distinct('territory.division', { role: 'division', status: { $in: ['active', 'approved'] }, 'territory.district': dRegex }),
          Agent.distinct('territory.pincode', { role: 'pincode', status: { $in: ['active', 'approved'] }, 'territory.district': dRegex })
        ]);
        totalDivisions = divDocs.filter(Boolean).length;
        totalPincodes = pinDocs.filter(Boolean).length;
      } else if (scope.role === 'division' && scope.division) {
        const divRegex = new RegExp(`^\\s*${escapeRegex(scope.division)}\\s*$`, 'i');
        const pinDocs = await Agent.distinct('territory.pincode', { role: 'pincode', status: { $in: ['active', 'approved'] }, 'territory.division': divRegex });
        totalPincodes = pinDocs.filter(Boolean).length;
      }
    }

    // Run all aggregations in parallel for performance with field projections
    const [
      totalVendors,
      activeVendors,
      adminPendingVendors,
      kycPendingVendors,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      totalTasks,
      completedTasks,
      overdueTasks,
      openTickets,
      resolvedTickets,
      unreadNotifications,
      totalReports,
      recentAssignments,
      recentVendors
    ] = await Promise.all([
      Vendor.countDocuments(totalRegisteredFilter),
      Vendor.countDocuments(activeVendorFilter),
      Vendor.countDocuments(adminPendingFilter),
      Vendor.countDocuments(kycPendingFilter),
      TargetAssignment.countDocuments({ assignedTo: { $in: agentMatches } }),
      TargetAssignment.countDocuments({ assignedTo: { $in: agentMatches }, status: 'completed' }),
      TargetAssignment.countDocuments({ assignedTo: { $in: agentMatches }, status: 'overdue' }),
      Task.countDocuments({ $or: taskMatches }),
      Task.countDocuments({ $or: taskMatches, status: { $in: ['Approved', 'Completed', 'Closed'] } }),
      Task.countDocuments({
        $or: taskMatches,
        dueDate: { $lt: new Date() },
        status: { $nin: ['Approved', 'Completed', 'Rejected', 'Closed'] }
      }),
      Ticket.countDocuments({ creator: agentId, status: 'open' }),
      Ticket.countDocuments({ creator: agentId, status: 'resolved' }),
      Notification.countDocuments({ receiver: agentId, read: false }),
      Report.countDocuments({ agent: agentId }),
      TargetAssignment.find({ assignedTo: { $in: agentMatches } })
        .select('target assignedTo assignedBy status dueDate completedAt createdAt')
        .populate('target', 'title type targetValue')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Vendor.find({
        ...activeVendorFilter,
        $or: [
          { businessName: { $exists: true, $nin: ['', null] } },
          { name: { $exists: true, $nin: ['', null] } }
        ]
      })
        .select('businessName name ownerName phone category status kycStatus location state district division pincode createdAt')
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    const sanitizedRecentVendors = (recentVendors || [])
      .map((v: any) => {
        const rawName = (v.businessName || v.name || '').trim();
        return {
          ...v,
          name: rawName,
          businessName: rawName,
          kycStatus: 'approved'
        };
      })
      .filter((v: any) => Boolean(v.name));

    const totalTargetsAll = totalAssignments + totalTasks;
    const completedTargetsAll = completedAssignments + completedTasks;
    const overdueTargetsAll = overdueAssignments + overdueTasks;

    const resultPayload = {
      stats: {
        territory: {
          districts: totalDistricts,
          divisions: totalDivisions,
          pincodes: totalPincodes
        },
        vendors: {
          total: totalVendors,
          active: activeVendors,
          pending: adminPendingVendors,
          adminPending: adminPendingVendors,
          kycPending: kycPendingVendors
        },
        targets: {
          total: totalTargetsAll,
          completed: completedTargetsAll,
          overdue: overdueTargetsAll,
          completionRate: totalTargetsAll > 0
            ? Math.round((completedTargetsAll / totalTargetsAll) * 100)
            : 0
        },
        tickets: {
          open: openTickets,
          resolved: resolvedTickets
        },
        notifications: {
          unread: unreadNotifications
        },
        reports: {
          total: totalReports
        }
      },
      recentAssignments,
      recentVendors: sanitizedRecentVendors
    };

    // Cache dashboard summary for 20 seconds
    await cacheService.set(cacheKey, resultPayload, 20);

    return res.status(200).json(resultPayload);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
