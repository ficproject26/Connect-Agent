import { Request, Response } from 'express';
export declare const getNotifications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const markAllRead: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const clearNotifications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=notification.controller.d.ts.map