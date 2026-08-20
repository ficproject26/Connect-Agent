import { Document, Types } from 'mongoose';
export interface IActivityLog extends Document {
    agent: Types.ObjectId;
    action: string;
    ipAddress?: string;
    details?: string;
    createdAt: Date;
}
export declare const ActivityLog: import("mongoose").Model<IActivityLog, {}, {}, {}, Document<unknown, {}, IActivityLog, {}, {}> & IActivityLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default ActivityLog;
//# sourceMappingURL=ActivityLog.d.ts.map