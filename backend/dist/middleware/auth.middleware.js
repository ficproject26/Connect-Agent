"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHigherOrEqualRole = exports.ROLE_HIERARCHY = exports.requireRole = exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization token required' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token missing' });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        req.agent = decoded;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
/**
 * Middleware to restrict route access to specific agent roles
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        const agent = req.agent;
        if (!agent) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!allowedRoles.includes(agent.role)) {
            return res.status(403).json({
                message: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
};
exports.requireRole = requireRole;
/**
 * Role hierarchy order (State > District > Division > Pincode)
 */
exports.ROLE_HIERARCHY = {
    state: 4,
    district: 3,
    division: 2,
    pincode: 1
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
        const agentLevel = exports.ROLE_HIERARCHY[agent.role] || 0;
        const requiredLevel = exports.ROLE_HIERARCHY[minRole] || 0;
        if (agentLevel < requiredLevel) {
            return res.status(403).json({
                message: `Access denied: Minimum role required is ${minRole}`
            });
        }
        next();
    };
};
exports.requireHigherOrEqualRole = requireHigherOrEqualRole;
//# sourceMappingURL=auth.middleware.js.map