import { Request, Response } from 'express';
import Vendor from '../models/Vendor';
import TargetAssignment from '../models/TargetAssignment';
import Ticket from '../models/Ticket';
import Notification from '../models/Notification';
import Report from '../models/Report';

// GET /api/dashboard/stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    // Run all aggregations in parallel for performance
    const [
      totalVendors,
      activeVendors,
      pendingVendors,
      totalAssignments,
      completedAssignments,
      overdueAssignments,
      openTickets,
      resolvedTickets,
      unreadNotifications,
      totalReports,
      recentAssignments,
      recentVendors
    ] = await Promise.all([
      Vendor.countDocuments({ assignedAgent: agentId }),
      Vendor.countDocuments({ assignedAgent: agentId, status: 'active' }),
      Vendor.countDocuments({ assignedAgent: agentId, status: 'pending' }),
      TargetAssignment.countDocuments({ assignedTo: agentId }),
      TargetAssignment.countDocuments({ assignedTo: agentId, status: 'completed' }),
      TargetAssignment.countDocuments({ assignedTo: agentId, status: 'overdue' }),
      Ticket.countDocuments({ creator: agentId, status: 'open' }),
      Ticket.countDocuments({ creator: agentId, status: 'resolved' }),
      Notification.countDocuments({ receiver: agentId, read: false }),
      Report.countDocuments({ agent: agentId }),
      TargetAssignment.find({ assignedTo: agentId })
        .populate('target', 'title type targetValue')
        .sort({ createdAt: -1 })
        .limit(5),
      Vendor.find({ assignedAgent: agentId })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    return res.status(200).json({
      stats: {
        vendors: {
          total: totalVendors,
          active: activeVendors,
          pending: pendingVendors
        },
        targets: {
          total: totalAssignments,
          completed: completedAssignments,
          overdue: overdueAssignments,
          completionRate: totalAssignments > 0
            ? Math.round((completedAssignments / totalAssignments) * 100)
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
      recentVendors
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
