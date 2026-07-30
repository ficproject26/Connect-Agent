import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  agent?: TokenPayload;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token missing' });
    }

    const decoded = verifyToken(token);
    (req as AuthenticatedRequest).agent = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
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

    if (!allowedRoles.includes(agent.role)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Role hierarchy order (State > District > Division > Pincode)
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  state: 4,
  district: 3,
  division: 2,
  pincode: 1
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

    const agentLevel = ROLE_HIERARCHY[agent.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (agentLevel < requiredLevel) {
      return res.status(403).json({
        message: `Access denied: Minimum role required is ${minRole}`
      });
    }

    next();
  };
};
