import { Request, Response } from 'express';
export declare const checkIn: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const checkOut: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getMyAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSubordinateAttendance: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=attendance.controller.d.ts.map