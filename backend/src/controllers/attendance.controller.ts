import { Request, Response } from 'express';
import { z } from 'zod';
import Attendance from '../models/Attendance';
import Agent from '../models/Agent';

const checkInSchema = z.object({
  comments: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

const checkOutSchema = z.object({
  comments: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

// Helper to format duration in hours/minutes
const calculateDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  const totalMins = Math.floor(diffMs / (1000 * 60));
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}h ${mins}m`;
};

// POST /api/attendance/check-in
export const checkIn = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = checkInSchema.parse(req.body);
    const today = new Date().toISOString().slice(0, 10);

    // Check if active attendance already exists for today
    const existing = await Attendance.findOne({ agent: agentId, date: today });
    if (existing && !existing.checkOut) {
      return res.status(400).json({ message: 'Already checked in for today', attendance: existing });
    }

    const checkInTime = new Date();
    const newRecord = new Attendance({
      agent: agentId,
      date: today,
      checkIn: checkInTime,
      status: 'present',
      comments: data.comments,
      checkInLocation: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : undefined
    });

    await newRecord.save();
    await newRecord.populate('agent', 'name email role territory');

    return res.status(201).json({ message: 'Attendance check-in successful', attendance: newRecord });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Attendance check-in error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/attendance/check-out
export const checkOut = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const data = checkOutSchema.parse(req.body);
    const today = new Date().toISOString().slice(0, 10);

    const record = await Attendance.findOne({ agent: agentId, date: today, checkOut: { $exists: false } });
    if (!record) {
      return res.status(404).json({ message: 'Active check-in record not found for today' });
    }

    const checkOutTime = new Date();
    record.checkOut = checkOutTime;
    record.duration = calculateDuration(record.checkIn, checkOutTime);
    if (data.comments) {
      record.comments = record.comments ? `${record.comments} | Out: ${data.comments}` : data.comments;
    }
    if (data.latitude && data.longitude) {
      record.checkOutLocation = { latitude: data.latitude, longitude: data.longitude };
    }

    await record.save();
    await record.populate('agent', 'name email role territory');

    return res.status(200).json({ message: 'Attendance check-out successful', attendance: record });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Attendance check-out error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/attendance/mine
export const getMyAttendance = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { page = '1', limit = '30' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const total = await Attendance.countDocuments({ agent: agentId });
    const records = await Attendance.find({ agent: agentId })
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.status(200).json({
      records,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/attendance/subordinates — for managers (state/division/district)
export const getSubordinateAttendance = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const userRole = (req as any).agent?.role;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { roleFilter, searchQuery, date } = req.query;
    const dateFilter = (date as string) || new Date().toISOString().slice(0, 10);

    // Find subordinates based on role hierarchy
    let subordinateQuery: Record<string, unknown> = {};
    if (userRole === 'state') {
      subordinateQuery.role = { $in: ['district', 'division', 'pincode'] };
    } else if (userRole === 'district') {
      subordinateQuery.role = { $in: ['division', 'pincode'] };
    } else if (userRole === 'division') {
      subordinateQuery.role = 'pincode';
    } else {
      // Pincode agents don't have subordinates
      return res.status(200).json({ records: [] });
    }

    if (roleFilter && roleFilter !== 'all') {
      subordinateQuery.role = roleFilter;
    }

    const subordinates = await Agent.find(subordinateQuery).select('_id name role territory email');
    const subordinateIds = subordinates.map(s => s._id);

    const attendanceRecords = await Attendance.find({
      agent: { $in: subordinateIds },
      date: dateFilter
    }).populate('agent', 'name role territory email');

    let filteredRecords = attendanceRecords;
    if (searchQuery) {
      const queryLower = (searchQuery as string).toLowerCase();
      filteredRecords = attendanceRecords.filter((rec: any) => {
        const agentName = rec.agent?.name?.toLowerCase() || '';
        const territory = rec.agent?.territory?.name?.toLowerCase() || '';
        return agentName.includes(queryLower) || territory.includes(queryLower);
      });
    }

    return res.status(200).json({ records: filteredRecords });
  } catch (error) {
    console.error('Get subordinate attendance error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
