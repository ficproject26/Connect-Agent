import { Request, Response } from 'express';
export declare const getTargets: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createTarget: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const allocateTarget: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubordinates: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const assignTarget: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyAssignments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateAssignmentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=target.controller.d.ts.map