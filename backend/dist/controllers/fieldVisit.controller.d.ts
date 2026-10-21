import { Request, Response } from 'express';
export declare const startFieldVisit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const completeFieldVisit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFieldVisits: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getFieldVisitAgents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const recordShopVisit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getShopVisitById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateShopVisit: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const revalidateEligibility: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=fieldVisit.controller.d.ts.map