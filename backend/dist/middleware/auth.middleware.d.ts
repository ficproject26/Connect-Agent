import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../utils/jwt';
export interface AuthenticatedRequest extends Request {
    agent?: TokenPayload;
}
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware to restrict route access to specific agent roles
 */
export declare const requireRole: (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Role hierarchy order (State > District > Division > Pincode)
 */
export declare const ROLE_HIERARCHY: Record<string, number>;
/**
 * Middleware to ensure agent has sufficient hierarchy level to manage target role
 */
export declare const requireHigherOrEqualRole: (minRole: string) => (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map