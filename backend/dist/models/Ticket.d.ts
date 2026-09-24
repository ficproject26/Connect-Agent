import { Document, Types } from 'mongoose';
export interface ITicket extends Document {
    ticketId: string;
    creator: Types.ObjectId;
    creatorRole?: string;
    creatorName?: string;
    assignedTo?: Types.ObjectId;
    assignedAgent?: string;
    vendorName?: string;
    storeName?: string;
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
    territory?: string;
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'escalated_to_admin';
    attachmentName?: string;
    attachmentUrl?: string;
    resolutionDetails?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Ticket: import("mongoose").Model<ITicket, {}, {}, {}, Document<unknown, {}, ITicket, {}, {}> & ITicket & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Ticket;
//# sourceMappingURL=Ticket.d.ts.map