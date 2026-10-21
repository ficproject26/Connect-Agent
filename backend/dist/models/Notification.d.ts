import { Document } from 'mongoose';
export interface INotification extends Document {
    receiver: any;
    title: string;
    message: string;
    read: boolean;
    priority: 'low' | 'medium' | 'high';
    category: string;
    link?: string;
    relatedEntityId?: string;
    relatedEntityType?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
export declare const Notification: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Notification;
//# sourceMappingURL=Notification.d.ts.map