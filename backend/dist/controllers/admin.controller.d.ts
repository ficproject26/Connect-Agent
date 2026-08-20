import { Request, Response } from 'express';
export declare const getRegistrations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getRegistrationById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const approveRegistration: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rejectRegistration: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getHierarchyTree: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getWeeklyLeaderboard: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=admin.controller.d.ts.map