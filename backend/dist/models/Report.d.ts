import { Schema, Document, Types } from 'mongoose';
export interface IReport extends Document {
    agent: Types.ObjectId;
    type: 'daily' | 'weekly' | 'monthly' | 'vendor' | 'performance' | 'visit';
    content: Schema.Types.Mixed;
    remarks?: string;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Report: import("mongoose").Model<IReport, {}, {}, {}, Document<unknown, {}, IReport, {}, {}> & IReport & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Report;
//# sourceMappingURL=Report.d.ts.map