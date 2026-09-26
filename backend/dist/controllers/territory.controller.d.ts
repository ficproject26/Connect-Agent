import { Request, Response } from 'express';
/**
 * GET /api/territory/hierarchy
 * Returns centralized territory database hierarchy from Admin Pincode Management:
 * State -> District -> Division -> Taluk & Pincode
 * Role-aware: Filters down to authorized territory if caller is authenticated agent
 */
export declare const getTerritoryHierarchy: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/territory/states
 * Returns all active states from central territory database
 */
export declare const getStates: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/territory/districts
 * Query params: stateId, state
 */
export declare const getDistricts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/territory/lookup/:pincode
 * Lookup a 6-digit PIN code in central territory database
 */
export declare const lookupPincode: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=territory.controller.d.ts.map