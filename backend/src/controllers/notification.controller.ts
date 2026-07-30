import { Request, Response } from 'express';
import Notification from '../models/Notification';

// GET /api/notifications
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '20', unreadOnly } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = { receiver: agentId };
    if (unreadOnly === 'true') filter.read = false;

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ receiver: agentId, read: false });
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      notifications,
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

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, receiver: agentId },
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: 'Notification not found or access denied' });
    return res.status(200).json({ message: 'Notification marked as read', notification });
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

    const result = await Notification.updateMany(
      { receiver: agentId, read: false },
      { read: true }
    );

    return res.status(200).json({ message: 'All notifications marked as read', updated: result.modifiedCount });
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

    const result = await Notification.deleteMany({ receiver: agentId });
    return res.status(200).json({ message: 'All notifications cleared', deleted: result.deletedCount });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
