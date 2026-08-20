import { Document, Types } from 'mongoose';
export interface ITicket extends Document {
    ticketId: string;
    creator: Types.ObjectId;
    assignedTo?: Types.ObjectId;
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
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