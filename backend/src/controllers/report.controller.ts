import { Request, Response } from 'express';
import { z } from 'zod';
import Report from '../models/Report';

import mongoose from 'mongoose';
import Agent from '../models/Agent';
import { getAgentTerritoryScope, buildTerritoryFilter } from '../utils/territoryScope';

const createReportSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'vendor', 'performance', 'visit']),
  title: z.string().optional(),
  content: z.record(z.unknown()),
  remarks: z.string().optional()
});

const reviewReportSchema = z.object({
  remarks: z.string().min(1, 'Review remarks required')
});

// GET /api/reports
export const getReports = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const agentRecord = (req as any).agentRecord || {};
    const role = String(agentRecord.role || (req as any).agent?.role || '').toLowerCase();
    const assignedDiv = (agentRecord.territory?.division || agentRecord.assignedTerritory?.division || agentRecord.assignedDivision || (req.query.division as string) || '').trim();

    const { page = '1', limit = '20', type } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    let filter: Record<string, unknown> = {};

    if (role === 'division' && assignedDiv) {
      // Find subordinate agents belonging to this division
      const subordinateAgents = await Agent.find({
        $or: [
          { 'territory.division': new RegExp(`^${assignedDiv}$`, 'i') },
          { 'assignedTerritory.division': new RegExp(`^${assignedDiv}$`, 'i') },
          { assignedDivision: new RegExp(`^${assignedDiv}$`, 'i') },
          { division: new RegExp(`^${assignedDiv}$`, 'i') }
        ]
      }).select('_id').lean();

      const validAgentIds: any[] = [agentId];
      if (mongoose.Types.ObjectId.isValid(agentId)) {
        validAgentIds.push(new mongoose.Types.ObjectId(agentId));
      }
      subordinateAgents.forEach(sub => {
        validAgentIds.push(sub._id);
      });

      filter = {
        $or: [
          { agent: { $in: validAgentIds } },
          { division: new RegExp(`^${assignedDiv}$`, 'i') }
        ]
      };
    } else if (role === 'admin' || role === 'superadmin') {
      if (assignedDiv) {
        filter = { division: new RegExp(`^${assignedDiv}$`, 'i') };
      }
    } else {
      filter = { agent: agentId };
    }

    if (type) filter.type = type;

    const total = await Report.countDocuments(filter);
    const reports = await Report.find(filter)
      .populate('agent', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    return res.status(200).json({
      reports,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/reports/:id
export const getReportById = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const report = await Report.findOne({ _id: req.params.id, agent: agentId })
      .populate('agent', 'name email role')
      .populate('reviewedBy', 'name email role')
      .lean();

    if (!report) return res.status(404).json({ message: 'Report not found or access denied' });
    return res.status(200).json({ report });
  } catch (error) {
    console.error('Get report by id error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/reports
export const createReport = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const agentRecord = (req as any).agentRecord || {};
    const data = createReportSchema.parse(req.body);

    const division = agentRecord.territory?.division || agentRecord.assignedTerritory?.division || agentRecord.assignedDivision || '';
    const district = agentRecord.territory?.district || agentRecord.assignedTerritory?.district || agentRecord.assignedDistrict || '';
    const state = agentRecord.territory?.state || agentRecord.assignedTerritory?.state || agentRecord.assignedState || '';
    const pincode = agentRecord.territory?.pincode || agentRecord.assignedTerritory?.pincode || agentRecord.assignedPincode || '';

    const report = new Report({
      ...data,
      agent: agentId,
      division,
      district,
      state,
      pincode
    });
    await report.save();
    await report.populate('agent', 'name email role');

    return res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Create report error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// PATCH /api/reports/:id/review — senior agent reviews a report
export const reviewReport = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    if (!agentId) return res.status(401).json({ message: 'Unauthorized' });

    const { remarks } = reviewReportSchema.parse(req.body);

    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { remarks, reviewedBy: agentId, reviewedAt: new Date() },
      { new: true }
    )
      .populate('agent', 'name email role')
      .populate('reviewedBy', 'name email role');

    if (!report) return res.status(404).json({ message: 'Report not found' });
    return res.status(200).json({ message: 'Report reviewed', report });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: error.errors });
    }
    console.error('Review report error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getAgentRoleLevel = (r?: string): number => {
  const role = String(r || '').toLowerCase();
  if (role.includes('state')) return 1;
  if (role.includes('district')) return 2;
  if (role.includes('division')) return 3;
  if (role.includes('pincode')) return 4;
  return 4;
};

// POST /api/reports/submit - Persist generated periodical report to database
export const submitReport = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    if (!agentId && !agentEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const scope = await getAgentTerritoryScope(agentId, agentEmail);
    if (!scope) return res.status(403).json({ success: false, message: 'Unauthorized territory scope' });

    const { periodLabel, dateRange, startDate, endDate, summary, shopVisits, tasks } = req.body;

    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database unavailable' });

    const count = await db.collection('reports').countDocuments();
    const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const terrCode = scope.pincode || (scope.district ? scope.district.slice(0, 4).toUpperCase() : 'TN');
    const reportNumber = `RPT-${terrCode}-${dateCode}-${randomSeq}`;

    let agentDoc = await Agent.findOne({ $or: [{ _id: agentId }, { email: agentEmail }] }).lean();
    if (!agentDoc) {
      const uDoc = await db.collection('users').findOne({ $or: [{ _id: new mongoose.Types.ObjectId(agentId) }, { email: agentEmail }] });
      if (uDoc) agentDoc = uDoc as any;
    }

    const agentName = agentDoc?.name || (req as any).agent?.name || 'Field Agent';
    const agentRole = scope.role || 'pincode';

    const cleanSummary = summary || {
      totalVisits: (shopVisits || []).length,
      interested: (shopVisits || []).filter((v: any) => v.interestedStatus === 'YES' || v.interestStatus === 'YES').length,
      notInterested: (shopVisits || []).filter((v: any) => v.interestedStatus === 'NO' || v.interestStatus === 'NO').length,
      newTieups: (shopVisits || []).filter((v: any) => v.vendorId).length,
      tasksAssigned: (tasks || []).length,
      tasksCompleted: (tasks || []).filter((t: any) => t.status === 'Completed').length,
      tasksPending: (tasks || []).filter((t: any) => t.status !== 'Completed').length
    };

    const newReport = {
      _id: `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      id: `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reportNumber,
      reportCode: reportNumber,
      periodLabel: periodLabel || 'Field Performance Report',
      dateRange: dateRange || 'N/A',
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date().toISOString(),
      summary: cleanSummary,
      shopVisits: Array.isArray(shopVisits) ? shopVisits : [],
      tasks: Array.isArray(tasks) ? tasks : [],
      agentId: String(agentId),
      agentName,
      agentRole,
      managerId: String(agentId),
      managerName: agentName,
      managerRole: agentRole,
      managerEmail: agentEmail || '',
      state: scope.state || 'Tamil Nadu',
      district: scope.district || '',
      division: scope.division || '',
      pincode: scope.pincode || '',
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('reports').insertOne(newReport as any);

    // Record in audit log
    try {
      await db.collection('auditlogs').insertOne({
        action: 'Report Submitted',
        recordId: newReport._id,
        recordType: 'report',
        userId: String(agentId),
        userName: agentName,
        userRole: agentRole,
        details: {
          reportNumber,
          periodLabel,
          totalVisits: newReport.summary.totalVisits,
          tasksAssigned: newReport.summary.tasksAssigned,
          description: `Submitted ${periodLabel} (${reportNumber}) with ${newReport.summary.totalVisits} visits and ${newReport.summary.tasksAssigned} tasks.`
        },
        timestamp: new Date().toISOString(),
        createdAt: new Date()
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Report submitted and saved to database successfully',
      data: newReport,
      report: newReport
    });
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit report to database' });
  }
};

// GET /api/reports/submitted - Retrieve submitted reports within jurisdiction
export const getSubmittedReports = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    if (!agentId && !agentEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const scope = await getAgentTerritoryScope(agentId, agentEmail);
    if (!scope) return res.status(403).json({ success: false, message: 'Unauthorized territory scope' });

    const userLevel = getAgentRoleLevel(scope.role);
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database unavailable' });

    const { district, division, pincode, managerRole, role, search } = req.query;

    const [allReports, districts, divisions, pincodes] = await Promise.all([
      db.collection('reports').find({}, { projection: { shopVisits: 0, tasks: 0 } }).sort({ submittedAt: -1, createdAt: -1 }).limit(100).toArray(),
      db.collection('districts').find({}, { projection: { name: 1 } }).limit(50).toArray().catch(() => []),
      db.collection('divisions').find({}, { projection: { name: 1, district: 1 } }).limit(50).toArray().catch(() => []),
      db.collection('pincodes').find({}, { projection: { code: 1, name: 1, division: 1 } }).limit(100).toArray().catch(() => [])
    ]);

    // Role-based and territory-based hierarchy filtering
    const filteredReports = allReports.filter((r: any) => {
      const isOwner = String(r.agentId || r.managerId || r.userId || '') === String(agentId) ||
                      (r.managerEmail && agentEmail && String(r.managerEmail).toLowerCase() === String(agentEmail).toLowerCase());

      const rRole = String(r.agentRole || r.managerRole || r.role || 'pincode').toLowerCase();
      const rLevel = getAgentRoleLevel(rRole);

      // 1. Hierarchy access rule: subordinate cannot view superior's report
      if (!isOwner) {
        if (userLevel === 4) {
          // Pincode agent can ONLY view own reports
          return false;
        }
        if (rLevel < userLevel) {
          // Lower-tier agents can NEVER access report history of higher-tier agents
          return false;
        }
      }

      // 2. Territory isolation:
      const rState = (r.state || '').trim().toLowerCase();
      const rDist = (r.district || '').trim().toLowerCase();
      const rDiv = (r.division || '').trim().toLowerCase();
      const rPin = (r.pincode || '').trim();

      if (scope.role === 'state' && scope.state) {
        const scState = scope.state.toLowerCase();
        if (rState && !rState.includes(scState) && !scState.includes(rState)) return false;
      } else if (scope.role === 'district' && scope.district) {
        const scDist = scope.district.toLowerCase();
        if (!isOwner && rDist && !rDist.includes(scDist) && !scDist.includes(rDist)) return false;
      } else if (scope.role === 'division' && scope.division) {
        const scDiv = scope.division.toLowerCase();
        if (!isOwner && rDiv && !rDiv.includes(scDiv) && !scDiv.includes(rDiv)) return false;
      } else if (scope.role === 'pincode') {
        if (!isOwner) return false;
      }

      // Query filters
      if (district && district !== 'All') {
        const dTarget = String(district).trim().toLowerCase();
        if (!rDist.includes(dTarget) && !dTarget.includes(rDist)) return false;
      }
      if (division && division !== 'All') {
        const divTarget = String(division).trim().toLowerCase();
        if (!rDiv.includes(divTarget) && !divTarget.includes(rDiv)) return false;
      }
      if (pincode && pincode !== 'All') {
        const pTarget = String(pincode).trim();
        if (rPin !== pTarget) return false;
      }
      const roleFilter = managerRole || role;
      if (roleFilter && roleFilter !== 'All') {
        const rfLower = String(roleFilter).toLowerCase();
        if (!rRole.includes(rfLower)) return false;
      }

      // Search filter
      if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase();
        const matchCode = (r.reportNumber || r.reportCode || '').toLowerCase().includes(q);
        const matchName = (r.agentName || r.managerName || '').toLowerCase().includes(q);
        const matchPeriod = (r.periodLabel || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPeriod) return false;
      }

      return true;
    });

    const cleanDistricts = (districts || []).map((d: any) => ({
      _id: String(d._id || d.id || ''),
      name: String(d.name || d.districtName || ''),
      districtName: String(d.name || d.districtName || '')
    }));
    const cleanDivisions = (divisions || []).map((d: any) => ({
      _id: String(d._id || d.id || ''),
      name: String(d.name || d.divisionName || ''),
      divisionName: String(d.name || d.divisionName || '')
    }));
    const cleanPincodes = (pincodes || []).map((p: any) => ({
      _id: String(p._id || p.id || ''),
      code: String(p.code || p.pincode || ''),
      pincode: String(p.code || p.pincode || ''),
      name: String(p.name || p.areaName || p.code || '')
    }));

    return res.status(200).json({
      success: true,
      total: filteredReports.length,
      data: filteredReports,
      reports: filteredReports,
      hierarchy: {
        districts: cleanDistricts,
        divisions: cleanDivisions,
        pincodes: cleanPincodes
      }
    });
  } catch (error) {
    console.error('Get submitted reports error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve submitted reports' });
  }
};

// GET /api/reports/submitted/:id - Retrieve single submitted report
export const getSubmittedReportById = async (req: Request, res: Response) => {
  try {
    const agentId = (req as any).agent?.agentId;
    const agentEmail = (req as any).agent?.email;
    if (!agentId && !agentEmail) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { id } = req.params;
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ success: false, message: 'Database unavailable' });

    const queryObj: any = {
      $or: [
        { _id: id },
        { id: id },
        { reportNumber: id },
        { reportCode: id }
      ]
    };
    if (mongoose.Types.ObjectId.isValid(id)) {
      queryObj.$or.push({ _id: new mongoose.Types.ObjectId(id) });
    }
    const report = await db.collection('reports').findOne(queryObj);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    return res.status(200).json({
      success: true,
      data: report,
      report
    });
  } catch (error) {
    console.error('Get submitted report by id error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve report' });
  }
};

