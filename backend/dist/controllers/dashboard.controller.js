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
const Agent_1 = __importDefault(require("../models/Agent"));
const territoryScope_1 = require("../utils/territoryScope");
const cache_service_1 = require("../services/cache.service");
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
                    Agent_1.default.distinct('territory.district', { role: 'district', status: { $in: ['active', 'approved'] }, 'territory.state': sRegex }),
                    Agent_1.default.distinct('territory.division', { role: 'division', status: { $in: ['active', 'approved'] }, 'territory.state': sRegex }),
                    Agent_1.default.distinct('territory.pincode', { role: 'pincode', status: { $in: ['active', 'approved'] }, 'territory.state': sRegex })
                ]);
                totalDistricts = distDocs.filter(Boolean).length;
                totalDivisions = divDocs.filter(Boolean).length;
                totalPincodes = pinDocs.filter(Boolean).length;
            }
            else if (scope.role === 'district' && scope.district) {
                const dRegex = new RegExp(`^\\s*${escapeRegex(scope.district)}\\s*$`, 'i');
                const [divDocs, pinDocs] = await Promise.all([
                    Agent_1.default.distinct('territory.division', { role: 'division', status: { $in: ['active', 'approved'] }, 'territory.district': dRegex }),
                    Agent_1.default.distinct('territory.pincode', { role: 'pincode', status: { $in: ['active', 'approved'] }, 'territory.district': dRegex })
                ]);
                totalDivisions = divDocs.filter(Boolean).length;
                totalPincodes = pinDocs.filter(Boolean).length;
            }
            else if (scope.role === 'division' && scope.division) {
                const divRegex = new RegExp(`^\\s*${escapeRegex(scope.division)}\\s*$`, 'i');
                const pinDocs = await Agent_1.default.distinct('territory.pincode', { role: 'pincode', status: { $in: ['active', 'approved'] }, 'territory.division': divRegex });
                totalPincodes = pinDocs.filter(Boolean).length;
            }
        }
        // Run all aggregations in parallel for performance with field projections
        const [totalVendors, activeVendors, adminPendingVendors, kycPendingVendors, totalAssignments, completedAssignments, overdueAssignments, totalTasks, completedTasks, overdueTasks, openTickets, resolvedTickets, unreadNotifications, totalReports, recentAssignments, recentVendors] = await Promise.all([
            Vendor_1.default.countDocuments(totalRegisteredFilter),
            Vendor_1.default.countDocuments(activeVendorFilter),
            Vendor_1.default.countDocuments(adminPendingFilter),
            Vendor_1.default.countDocuments(kycPendingFilter),
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
            .map((v) => {
            const rawName = (v.businessName || v.name || '').trim();
            return {
                ...v,
                name: rawName,
                businessName: rawName,
                kycStatus: 'approved'
            };
        })
            .filter((v) => Boolean(v.name));
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