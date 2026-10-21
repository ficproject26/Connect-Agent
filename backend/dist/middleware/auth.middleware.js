"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdminApprover = exports.requireHigherOrEqualRole = exports.ROLE_HIERARCHY = exports.requireRole = exports.optionalAuthMiddleware = exports.authMiddleware = exports.normalizeToAgentRole = exports.AUTHORIZED_AGENT_ROLES = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const jwt_1 = require("../utils/jwt");
const Agent_1 = __importDefault(require("../models/Agent"));
exports.AUTHORIZED_AGENT_ROLES = [
    'state',
    'district',
    'division',
    'pincode',
    'delivery_partner',
    'technician',
    'admin',
    'superadmin'
];
const normalizeToAgentRole = (rawRole, rawLevel) => {
    const r = String(rawRole || '').toLowerCase().trim();
    const l = String(rawLevel || '').toLowerCase().trim();
    // Explicit non-agent roles (fail closed)
    if (r === 'customer' || r === 'vendor')
        return null;
    if (r === 'state' || r === 'state_manager' || r === 'state admin' || r.includes('state') || l === '1' || l === 'state')
        return 'state';
    if (r === 'district' || r === 'district_manager' || r === 'district admin' || r.includes('district') || l === '2' || l === 'district')
        return 'district';
    if (r === 'division' || r === 'division_manager' || r === 'division admin' || r === 'divisional admin' || r.includes('division') || l === '3' || l === 'division')
        return 'division';
    if (r === 'pincode' || r === 'pincode_manager' || r === 'pincode admin' || r.includes('pincode') || l === '4' || l === 'pincode')
        return 'pincode';
    if (r === 'delivery_partner' || r.includes('delivery'))
        return 'delivery_partner';
    if (r === 'technician' || r.includes('tech'))
        return 'technician';
    if (r === 'admin' || r === 'superadmin')
        return r;
    if (r === 'agent') {
        if (l === '1' || l === 'state')
            return 'state';
        if (l === '2' || l === 'district')
            return 'district';
        if (l === '3' || l === 'division')
            return 'division';
        if (l === '4' || l === 'pincode')
            return 'pincode';
        return 'pincode'; // default agent tier
    }
    return null;
};
exports.normalizeToAgentRole = normalizeToAgentRole;
/**
 * Authoritative Authentication and Access Control Middleware:
 * 1. Validates JWT signature and expiration.
 * 2. Verifies the user against the authoritative MongoDB database record.
 * 3. Enforces strict role isolation (rejects non-agent roles like customer, vendor, manager).
 * 4. Enforces registration approval (pending accounts fail closed).
 * 5. Enforces instant revocation for suspended or rejected accounts.
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization token required' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token missing' });
        }
        let decoded;
        try {
            decoded = (0, jwt_1.verifyToken)(token);
        }
        catch (tokenErr) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        if (!decoded || !decoded.agentId) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }
        // Authoritative Database Verification (Enforces Realtime Revocation, Role Isolation & Approval Gates)
        let agent = null;
        if (mongoose_1.default.Types.ObjectId.isValid(decoded.agentId)) {
            agent = await Agent_1.default.findById(decoded.agentId)
                .select('_id name email phone role status kycStatus isApproved isActive rejectionReason territory assignedTerritory')
                .lean();
        }
        if (!agent && decoded.agentId) {
            agent = await Agent_1.default.findOne({
                $or: [
                    { registrationId: decoded.agentId },
                    { email: decoded.email?.toLowerCase() }
                ]
            }).select('_id name email phone role status kycStatus isApproved isActive rejectionReason territory assignedTerritory')
                .lean();
        }
        // Fallback: Check shared 'users' collection ONLY if genuine agent role (never convert other roles)
        if (!agent && decoded.email) {
            const db = mongoose_1.default.connection.db;
            if (db) {
                const userDoc = await db.collection('users').findOne({ email: decoded.email.toLowerCase() });
                if (userDoc) {
                    const canonicalUserRole = (0, exports.normalizeToAgentRole)(userDoc.role, userDoc.level);
                    if (!canonicalUserRole) {
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
                        role: canonicalUserRole,
                        status: userDoc.status || 'pending',
                        kycStatus: userDoc.kycStatus || userDoc.status || 'pending',
                        isApproved: userDoc.isApproved,
                        isActive: userDoc.isActive,
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
        const canonicalAgentRole = (0, exports.normalizeToAgentRole)(agent.role);
        if (!canonicalAgentRole) {
            return res.status(403).json({
                message: `Access denied: Role '${agent.role}' is not authorized to access the Agent application.`,
                role: agent.role
            });
        }
        agent.role = canonicalAgentRole;
        // 2. Account Status Check: Enforce Suspended / Deactivated / Revoked / Deleted
        const agentStatus = String(agent.status || '').toLowerCase();
        if (agentStatus === 'suspended' || agentStatus === 'inactive' || agentStatus === 'revoked' || agentStatus === 'deleted') {
            return res.status(403).json({
                message: 'Your account has been suspended or deactivated. Access revoked.',
                status: agentStatus === 'revoked' ? 'revoked' : 'suspended',
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
        const isApproved = agentKycStatus === 'approved' ||
            agentKycStatus === 'verified' ||
            agentStatus === 'approved' ||
            agentStatus === 'active' ||
            agent.isApproved === true ||
            agent.isActive === true;
        if (!isApproved) {
            return res.status(403).json({
                message: 'Your account registration is awaiting Admin approval. Protected resources cannot be accessed.',
                status: 'pending',
                role: agent.role
            });
        }
        // Set authoritative server-verified agent payload
        req.agent = {
            agentId: agent._id.toString(),
            role: agent.role,
            email: agent.email
        };
        req.agentRecord = agent;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
const optionalAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token) {
                const decoded = (0, jwt_1.verifyToken)(token);
                if (decoded?.agentId && mongoose_1.default.Types.ObjectId.isValid(decoded.agentId)) {
                    const agent = await Agent_1.default.findById(decoded.agentId)
                        .select('_id name email phone role status kycStatus isApproved isActive rejectionReason territory assignedTerritory')
                        .lean();
                    if (agent) {
                        req.agent = {
                            agentId: agent._id.toString(),
                            role: agent.role,
                            email: agent.email
                        };
                        req.agentRecord = agent;
                    }
                }
            }
        }
    }
    catch (error) {
        // Non-blocking for optional auth
    }
    next();
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
/**
 * Middleware to restrict route access to specific agent roles
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const agent = req.agent;
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
exports.requireRole = requireRole;
/**
 * Role hierarchy order
 */
exports.ROLE_HIERARCHY = {
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
const requireHigherOrEqualRole = (minRole) => {
    return (req, res, next) => {
        const agent = req.agent;
        if (!agent) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const agentLevel = exports.ROLE_HIERARCHY[agent.role?.toLowerCase()] || 0;
        const requiredLevel = exports.ROLE_HIERARCHY[minRole?.toLowerCase()] || 0;
        if (agentLevel < requiredLevel) {
            return res.status(403).json({
                message: `Access denied: Minimum role required is ${minRole}`
            });
        }
        next();
    };
};
exports.requireHigherOrEqualRole = requireHigherOrEqualRole;
/**
 * Middleware to restrict registration approvals/rejections to authorized management roles
 * (State Agent, District Agent, Division Agent, Admin, Superadmin).
 * Prevents pincode agents, delivery partners, and technicians from approving/rejecting registrations.
 */
const requireAdminApprover = (req, res, next) => {
    const agent = req.agent;
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
exports.requireAdminApprover = requireAdminApprover;
//# sourceMappingURL=auth.middleware.js.map