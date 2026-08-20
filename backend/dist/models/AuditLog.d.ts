import { Document, Types } from 'mongoose';
export interface IAuditLog extends Document {
    entityId: Types.ObjectId;
    entityType: 'Agent' | 'Vendor' | 'Target' | 'Ticket' | 'Report';
    action: 'profile_update' | 'vendor_change' | 'target_change' | 'ticket_change' | 'approval_change';
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    changedBy: Types.ObjectId;
    createdAt: Date;
}
export declare const AuditLog: import("mongoose").Model<IAuditLog, {}, {}, {}, Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default AuditLog;
//# sourceMappingURL=AuditLog.d.ts.map