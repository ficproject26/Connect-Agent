"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Vendor_1 = __importDefault(require("../models/Vendor"));
const TargetAssignment_1 = __importDefault(require("../models/TargetAssignment"));
const Task_1 = __importDefault(require("../models/Task"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Report_1 = __importDefault(require("../models/Report"));
const territoryScope_1 = require("../utils/territoryScope");
const cache_service_1 = require("../services/cache.service");
// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const cacheKey = `dashboard:${agentId}`;
        const cachedStats = await cache_service_1.cacheService.get(cacheKey);
        if (cachedStats) {
            return res.status(200).json(cachedStats);
        }
        const scope = await (0, territoryScope_1.getAgentTerritoryScope)(agentId);
        const vendorScopeFilter = (0, territoryScope_1.buildVendorScopeFilter)(scope);
        const vendorFilter = Object.keys(vendorScopeFilter).length > 0 ? vendorScopeFilter : { assignedAgent: agentId };
        const isObjId = mongoose_1.default.Types.ObjectId.isValid(agentId);
        const agentMatches = [agentId];
        if (isObjId)
            agentMatches.push(new mongoose_1.default.Types.ObjectId(agentId));
        const taskMatches = [
            { assignedAgentId: agentId },
            { assignedAgentId: { $in: agentMatches } }
        ];
        // Run all aggregations in parallel for performance with field projections
        const [totalVendors, activeVendors, pendingVendors, totalAssignments, completedAssignments, overdueAssignments, totalTasks, completedTasks, overdueTasks, openTickets, resolvedTickets, unreadNotifications, totalReports, recentAssignments, recentVendors] = await Promise.all([
            Vendor_1.default.countDocuments(vendorFilter),
            Vendor_1.default.countDocuments({ ...vendorFilter, status: 'active' }),
            Vendor_1.default.countDocuments({ ...vendorFilter, status: 'pending' }),
            TargetAssignment_1.default.countDocuments({ assignedTo: { $in: agentMatches } }),
            TargetAssignment_1.default.countDocuments({ assignedTo: { $in: agentMatches }, status: 'completed' }),
            TargetAssignment_1.default.countDocuments({ assignedTo: { $in: agentMatches }, status: 'overdue' }),
            Task_1.default.countDocuments({ $or: taskMatches }),
            Task_1.default.countDocuments({ $or: taskMatches, status: { $in: ['Approved', 'Completed', 'Closed'] } }),
            Task_1.default.countDocuments({
                $or: taskMatches,
                dueDate: { $lt: new Date() },
                status: { $nin: ['Approved', 'Completed', 'Rejected', 'Closed'] }
            }),
            Ticket_1.default.countDocuments({ creator: agentId, status: 'open' }),
            Ticket_1.default.countDocuments({ creator: agentId, status: 'resolved' }),
            Notification_1.default.countDocuments({ receiver: agentId, read: false }),
            Report_1.default.countDocuments({ agent: agentId }),
            TargetAssignment_1.default.find({ assignedTo: { $in: agentMatches } })
                .select('target assignedTo assignedBy status dueDate completedAt createdAt')
                .populate('target', 'title type targetValue')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Vendor_1.default.find({
                ...vendorFilter,
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
            .map((v) => {
            const rawName = (v.businessName || v.name || '').trim();
            let effectiveKyc = String(v.kycStatus || '').trim().toLowerCase();
            if (!effectiveKyc) {
                const s = String(v.status || '').trim().toLowerCase();
                effectiveKyc = (s === 'approved' || s === 'active') ? 'approved' : 'pending';
            }
            else if (effectiveKyc.includes('approved') || effectiveKyc === 'verified') {
                effectiveKyc = 'approved';
            }
            else if (effectiveKyc.includes('reject')) {
                effectiveKyc = 'rejected';
            }
            else {
                effectiveKyc = 'pending';
            }
            return {
                ...v,
                name: rawName,
                businessName: rawName,
                kycStatus: effectiveKyc
            };
        })
            .filter((v) => Boolean(v.name));
        const totalTargetsAll = totalAssignments + totalTasks;
        const completedTargetsAll = completedAssignments + completedTasks;
        const overdueTargetsAll = overdueAssignments + overdueTasks;
        const resultPayload = {
            stats: {
                vendors: {
                    total: totalVendors,
                    active: activeVendors,
                    pending: pendingVendors
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
        await cache_service_1.cacheService.set(cacheKey, resultPayload, 20);
        return res.status(200).json(resultPayload);
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getDashboardStats = getDashboardStats;
//# sourceMappingURL=dashboard.controller.js.map