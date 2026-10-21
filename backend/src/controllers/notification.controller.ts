import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import NotificationService from '../services/notification.service';

// Helper to construct receiver match query for both string and ObjectId
function buildReceiverFilter(agentId: string) {
  const matches: any[] = [agentId, String(agentId)];
  if (mongoose.Types.ObjectId.isValid(agentId)) {
    matches.push(new mongoose.Types.ObjectId(agentId));
  }
  return { receiver: { $in: matches } };
}

// GET /api/notifications
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentRole = (req as any).agent?.role;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    // Sync any un-notified task assignments or onboarding records for this agent
    await NotificationService.syncAgentEvents(agentId, agentRole).catch(() => {});

    const { page = '1', limit = '20', unreadOnly } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    const receiverMatch = buildReceiverFilter(agentId);
    const filter: Record<string, any> = { ...receiverMatch };
    if (unreadOnly === 'true') filter.read = false;

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...receiverMatch, read: false });

    const notifications = await Notification.find(filter)
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
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/notifications/:id/read
export const markRead = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const receiverMatch = buildReceiverFilter(agentId);
    const notifId = req.params.id;

    const idMatches: any[] = [notifId];
    if (mongoose.Types.ObjectId.isValid(notifId)) {
      idMatches.push(new mongoose.Types.ObjectId(notifId));
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: { $in: idMatches }, ...receiverMatch },
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found or access denied' });

    const unreadCount = await Notification.countDocuments({ ...receiverMatch, read: false });

    return res.status(200).json({
      message: 'Notification marked as read',
      notification,
      unreadCount
    });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/notifications/read-all
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const receiverMatch = buildReceiverFilter(agentId);
    const result = await Notification.updateMany(
      { ...receiverMatch, read: false },
      { read: true }
    );

    return res.status(200).json({
      message: 'All notifications marked as read',
      updated: result.modifiedCount,
      unreadCount: 0
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/notifications
export const clearNotifications = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const receiverMatch = buildReceiverFilter(agentId);
    const result = await Notification.deleteMany(receiverMatch);

    return res.status(200).json({
      message: 'All notifications cleared',
      deleted: result.deletedCount,
      unreadCount: 0
    });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
