import { Document, Types } from 'mongoose';
export interface INotification extends Document {
    receiver: Types.ObjectId;
    title: string;
    message: string;
    read: boolean;
    priority: 'low' | 'medium' | 'high';
    category: 'target_assigned' | 'vendor_assigned' | 'ticket_assigned' | 'report_reminder' | 'approval_status' | 'announcement';
    createdAt: Date;
}
export declare const Notification: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Notification;
//# sourceMappingURL=Notification.d.ts.map