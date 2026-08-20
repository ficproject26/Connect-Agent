import { Document, Types } from 'mongoose';
export interface ITarget extends Document {
    title: string;
    description?: string;
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    targetValue: number;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Target: import("mongoose").Model<ITarget, {}, {}, {}, Document<unknown, {}, ITarget, {}, {}> & ITarget & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Target;
//# sourceMappingURL=Target.d.ts.map