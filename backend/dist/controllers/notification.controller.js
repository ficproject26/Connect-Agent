"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearNotifications = exports.markAllRead = exports.markRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
// GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        const agentId = req.agent?.agentId;
        if (!agentId)
            return res.status(401).json({ message: 'Unauthorized' });
        const { page = '1', limit = '20', unreadOnly } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const filter = { receiver: agentId };
        if (unreadOnly === 'true')
            filter.read = false;
        const total = await Notification_1.default.countDocuments(filter);
        const unreadCount = await Notification_1.default.countDocuments({ receiver: agentId, read: false });
        const notifications = await Notification_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum);
        return res.status(200).json({
            notifications,
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
        const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, receiver: agentId }, { read: true }, { new: true });
        if (!notification)
            return res.status(404).json({ message: 'Notification not found or access denied' });
        return res.status(200).json({ message: 'Notification marked as read', notification });
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
        const result = await Notification_1.default.updateMany({ receiver: agentId, read: false }, { read: true });
        return res.status(200).json({ message: 'All notifications marked as read', updated: result.modifiedCount });
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
        const result = await Notification_1.default.deleteMany({ receiver: agentId });
        return res.status(200).json({ message: 'All notifications cleared', deleted: result.deletedCount });
    }
    catch (error) {
        console.error('Clear notifications error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
exports.clearNotifications = clearNotifications;
//# sourceMappingURL=notification.controller.js.map