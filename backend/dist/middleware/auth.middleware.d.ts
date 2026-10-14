import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
export interface AuthenticatedRequest extends Request {
    agent?: TokenPayload;
    agentRecord?: any;
}
export declare const AUTHORIZED_AGENT_ROLES: readonly ["state", "district", "division", "pincode", "delivery_partner", "technician", "admin", "superadmin"];
/**
 * Authoritative Authentication and Access Control Middleware:
 * 1. Validates JWT signature and expiration.
 * 2. Verifies the user against the authoritative MongoDB database record.
 * 3. Enforces strict role isolation (rejects non-agent roles like customer, vendor, manager).
 * 4. Enforces registration approval (pending accounts fail closed).
 * 5. Enforces instant revocation for suspended or rejected accounts.
 */
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * Middleware to restrict route access to specific agent roles
 */
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Role hierarchy order
 */
export declare const ROLE_HIERARCHY: Record<string, number>;
/**
 * Middleware to ensure agent has sufficient hierarchy level to manage target role
 */
export declare const requireHigherOrEqualRole: (minRole: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to restrict registration approvals/rejections to authorized management roles
 * (State Agent, District Agent, Division Agent, Admin, Superadmin).
 * Prevents pincode agents, delivery partners, and technicians from approving/rejecting registrations.
 */
export declare const requireAdminApprover: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map