import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { verifyToken, TokenPayload } from '../utils/jwt';
import Agent from '../models/Agent';

export interface AuthenticatedRequest extends Request {
  agent?: TokenPayload;
  agentRecord?: any;
}

export const AUTHORIZED_AGENT_ROLES = [
  'state',
  'district',
  'division',
  'pincode',
  'delivery_partner',
  'technician',
  'admin',
  'superadmin'
] as const;

/**
 * Authoritative Authentication and Access Control Middleware:
 * 1. Validates JWT signature and expiration.
 * 2. Verifies the user against the authoritative MongoDB database record.
 * 3. Enforces strict role isolation (rejects non-agent roles like customer, vendor, manager).
 * 4. Enforces registration approval (pending accounts fail closed).
 * 5. Enforces instant revocation for suspended or rejected accounts.
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    let decoded: TokenPayload;
    try {
      decoded = verifyToken(token);
    } catch (tokenErr) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (!decoded || !decoded.agentId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    // Authoritative Database Verification (Enforces Realtime Revocation, Role Isolation & Approval Gates)
    let agent: any = null;
    if (mongoose.Types.ObjectId.isValid(decoded.agentId)) {
      agent = await Agent.findById(decoded.agentId)
        .select('_id name email phone role status kycStatus rejectionReason territory assignedTerritory')
        .lean();
    }
    if (!agent && decoded.agentId) {
      agent = await Agent.findOne({
        $or: [
          { registrationId: decoded.agentId },
          { email: decoded.email?.toLowerCase() }
        ]
      }).select('_id name email phone role status kycStatus rejectionReason territory assignedTerritory')
        .lean();
    }

    // Fallback: Check shared 'users' collection ONLY if genuine agent role (never convert other roles)
    if (!agent && decoded.email) {
      const db = mongoose.connection.db;
      if (db) {
        const userDoc = await db.collection('users').findOne({ email: decoded.email.toLowerCase() });
        if (userDoc) {
          const userRole = String(userDoc.level || userDoc.role || '').toLowerCase();
          const isAgentRole = AUTHORIZED_AGENT_ROLES.includes(userRole as any);
          if (!isAgentRole) {
            return res.status(403).json({
              message: `Access denied: Account registered as '${userDoc.role || userDoc.level || 'different role'}' is not authorized for the Agent Portal.`,
              role: userDoc.role || userDoc.level
            });
          }
          agent = {
            _id: userDoc._id,
            name: userDoc.name,
            email: userDoc.email,
            phone: userDoc.phone,
            role: userRole,
            status: userDoc.status || 'pending',
            kycStatus: userDoc.kycStatus || userDoc.status || 'pending',
            rejectionReason: userDoc.rejectionReason,
            territory: userDoc.territory || {},
            assignedTerritory: userDoc.assignedTerritory || {}
          };
        }
      }
    }

    if (!agent) {
      return res.status(401).json({ message: 'Account not found or access has been revoked.' });
    }

    // 1. Role Authorization Check: Fail closed if role is not an authorized agent role
    const agentRole = String(agent.role || '').toLowerCase();
    if (!AUTHORIZED_AGENT_ROLES.includes(agentRole as any)) {
      return res.status(403).json({
        message: `Access denied: Role '${agent.role}' is not authorized to access the Agent application.`,
        role: agent.role
      });
    }

    // 2. Account Status Check: Enforce Suspended / Deactivated
    const agentStatus = String(agent.status || '').toLowerCase();
    if (agentStatus === 'suspended' || agentStatus === 'inactive') {
      return res.status(403).json({
        message: 'Your account has been suspended or deactivated. Access revoked.',
        status: 'suspended',
        role: agent.role
      });
    }

    // 3. Approval Status Check: Enforce Rejected
    const agentKycStatus = String(agent.kycStatus || '').toLowerCase();
    if (agentKycStatus === 'rejected' || agentStatus === 'rejected') {
      return res.status(403).json({
        message: `Your account registration was rejected. Reason: ${agent.rejectionReason || 'No reason provided.'}. Access revoked.`,
        status: 'rejected',
        rejectionReason: agent.rejectionReason,
        role: agent.role
      });
    }

    // 4. Approval Status Check: Enforce Pending (Fail closed)
    const isApproved = agentKycStatus === 'approved' || agentStatus === 'approved' || agentStatus === 'active';
    if (!isApproved) {
      return res.status(403).json({
        message: 'Your account registration is awaiting Admin approval. Protected resources cannot be accessed.',
        status: 'pending',
        role: agent.role
      });
    }

    // Set authoritative server-verified agent payload
    (req as AuthenticatedRequest).agent = {
      agentId: agent._id.toString(),
      role: agent.role,
      email: agent.email
    };
    (req as AuthenticatedRequest).agentRecord = agent;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = verifyToken(token);
        if (decoded?.agentId && mongoose.Types.ObjectId.isValid(decoded.agentId)) {
          const agent = await Agent.findById(decoded.agentId)
            .select('_id name email phone role status kycStatus rejectionReason territory assignedTerritory')
            .lean();
          if (agent) {
            (req as AuthenticatedRequest).agent = {
              agentId: agent._id.toString(),
              role: agent.role,
              email: agent.email
            };
            (req as AuthenticatedRequest).agentRecord = agent;
          }
        }
      }
    }
  } catch (error) {
    // Non-blocking for optional auth
  }
  next();
};

/**
 * Middleware to restrict route access to specific agent roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const agent = (req as AuthenticatedRequest).agent;
    if (!agent) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const normalizedRole = String(agent.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(normalizedRole)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Role hierarchy order
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  superadmin: 10,
  admin: 9,
  state: 4,
  district: 3,
  division: 2,
  pincode: 1,
  delivery_partner: 0,
  technician: 0
};

/**
 * Middleware to ensure agent has sufficient hierarchy level to manage target role
 */
export const requireHigherOrEqualRole = (minRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const agent = (req as AuthenticatedRequest).agent;
    if (!agent) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const agentLevel = ROLE_HIERARCHY[agent.role?.toLowerCase()] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole?.toLowerCase()] || 0;

    if (agentLevel < requiredLevel) {
      return res.status(403).json({
        message: `Access denied: Minimum role required is ${minRole}`
      });
    }

    next();
  };
};

/**
 * Middleware to restrict registration approvals/rejections to authorized management roles
 * (State Agent, District Agent, Division Agent, Admin, Superadmin).
 * Prevents pincode agents, delivery partners, and technicians from approving/rejecting registrations.
 */
export const requireAdminApprover = (req: Request, res: Response, next: NextFunction) => {
  const agent = (req as AuthenticatedRequest).agent;
  if (!agent) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const approverRoles = ['superadmin', 'admin', 'state', 'district', 'division'];
  const userRole = String(agent.role || '').toLowerCase();

  if (!approverRoles.includes(userRole)) {
    return res.status(403).json({
      message: `Access denied: Agents with role '${agent.role}' do not have administrative authority to approve or reject registrations.`
    });
  }

  next();
};

