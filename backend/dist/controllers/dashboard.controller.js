"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const Vendor_1 = __importDefault(require("../models/Vendor"));
const TargetAssignment_1 = __importDefault(require("../models/TargetAssignment"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Report_1 = __importDefault(require("../models/Report"));
const territoryScope_1 = require("../utils/territoryScope");
// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        const vendorScopeFilter = (0, territoryScope_1.buildVendorScopeFilter)(scope);
        const vendorFilter = Object.keys(vendorScopeFilter).length > 0 ? vendorScopeFilter : { assignedAgent: agentId };
        // Run all aggregations in parallel for performance
        const [totalVendors, activeVendors, pendingVendors, totalAssignments, completedAssignments, overdueAssignments, openTickets, resolvedTickets, unreadNotifications, totalReports, recentAssignments, recentVendors] = await Promise.all([
            Vendor_1.default.countDocuments(vendorFilter),
            Vendor_1.default.countDocuments({ ...vendorFilter, status: 'active' }),
            Vendor_1.default.countDocuments({ ...vendorFilter, status: 'pending' }),
            TargetAssignment_1.default.countDocuments({ assignedTo: agentId }),
            TargetAssignment_1.default.countDocuments({ assignedTo: agentId, status: 'completed' }),
            TargetAssignment_1.default.countDocuments({ assignedTo: agentId, status: 'overdue' }),
            Ticket_1.default.countDocuments({ creator: agentId, status: 'open' }),
            Ticket_1.default.countDocuments({ creator: agentId, status: 'resolved' }),
            Notification_1.default.countDocuments({ receiver: agentId, read: false }),
            Report_1.default.countDocuments({ agent: agentId }),
            TargetAssignment_1.default.find({ assignedTo: agentId })
                .populate('target', 'title type targetValue')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Vendor_1.default.find(vendorFilter)
                .populate('category', 'name')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean()
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
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboard.controller.js.map