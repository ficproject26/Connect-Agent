import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ITask } from '../models/Task';
export interface UserContext {
    id: string;
    registrationId?: string;
    name: string;
    email: string;
    role: string;
    isAdmin: boolean;
    isAgent: boolean;
    level: 'state' | 'district' | 'division' | 'pincode';
    territory: {
        state: string;
        district: string;
        division: string;
        pincode: string;
    };
}
export declare function resolveUserContext(req: Request): Promise<UserContext | null>;
export declare function resolveReceivingAdmin(targetLevel: 'district' | 'division' | 'pincode', territory: {
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
}): Promise<{
    adminId: any;
    adminName: string;
    adminRole: string;
} | null>;
export declare function findTaskDoc(id: string): Promise<(mongoose.Document<unknown, {}, ITask, {}, {}> & ITask & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}) | null>;
export declare const createTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTasks: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getTaskById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const approveAndAssignRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rejectRequest: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const acceptTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const rejectTask: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const submitEvidence: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const reviewEvidence: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getEligibleAgents: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=task.controller.d.ts.map