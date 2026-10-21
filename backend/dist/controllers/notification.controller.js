"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearNotifications = exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Notification_1 = __importDefault(require("../models/Notification"));
const notification_service_1 = __importDefault(require("../services/notification.service"));
// Helper to construct receiver match query for both string and ObjectId
function buildReceiverFilter(agentId) {
    const matches = [agentId, String(agentId)];
    if (mongoose_1.default.Types.ObjectId.isValid(agentId)) {
        matches.push(new mongoose_1.default.Types.ObjectId(agentId));
    }
    return { receiver: { $in: matches } };
}
// GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        const agentRole = req.agent?.role;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        // Sync any un-notified task assignments or onboarding records for this agent
        await notification_service_1.default.syncAgentEvents(agentId, agentRole).catch(() => { });
        const { page = '1', limit = '20', unreadOnly } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const receiverMatch = buildReceiverFilter(agentId);
        const filter = { ...receiverMatch };
        if (unreadOnly === 'true')
            filter.read = false;
        const total = await Notification_1.default.countDocuments(filter);
        const unreadCount = await Notification_1.default.countDocuments({ ...receiverMatch, read: false });
        const notifications = await Notification_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .lean();
        return res.status(200).json({
            notifications: notifications.map(n => ({
                ...n,
                id: n._id,
                link: n.link || (n.category?.includes('task') ? '/tasks' : (n.category?.includes('vendor') ? '/vendors' : '/dashboard'))
            })),
            unreadCount,
            pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
        });
    }
    catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getNotifications = getNotifications;
// PATCH /api/notifications/:id/read
const markRead = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const receiverMatch = buildReceiverFilter(agentId);
        const notifId = req.params.id;
        const idMatches = [notifId];
        if (mongoose_1.default.Types.ObjectId.isValid(notifId)) {
            idMatches.push(new mongoose_1.default.Types.ObjectId(notifId));
        }
        const notification = await Notification_1.default.findOneAndUpdate({ _id: { $in: idMatches }, ...receiverMatch }, { read: true }, { new: true });
        if (!notification)
            return res.status(404).json({ message: 'Notification not found or access denied' });
        const unreadCount = await Notification_1.default.countDocuments({ ...receiverMatch, read: false });
        return res.status(200).json({
            message: 'Notification marked as read',
            notification,
            unreadCount
        });
    }
    catch (error) {
        console.error('Mark read error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markRead = markRead;
// POST /api/notifications/read-all
const markAllRead = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const receiverMatch = buildReceiverFilter(agentId);
        const result = await Notification_1.default.updateMany({ ...receiverMatch, read: false }, { read: true });
        return res.status(200).json({
            message: 'All notifications marked as read',
            updated: result.modifiedCount,
            unreadCount: 0
        });
    }
    catch (error) {
        console.error('Mark all read error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.markAllRead = markAllRead;
// DELETE /api/notifications
const clearNotifications = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const receiverMatch = buildReceiverFilter(agentId);
        const result = await Notification_1.default.deleteMany(receiverMatch);
        return res.status(200).json({
            message: 'All notifications cleared',
            deleted: result.deletedCount,
            unreadCount: 0
        });
    }
    catch (error) {
        console.error('Clear notifications error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.clearNotifications = clearNotifications;
//# sourceMappingURL=notification.controller.js.map