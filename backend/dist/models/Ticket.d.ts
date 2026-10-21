import { Document, Types } from 'mongoose';
export interface ITicket extends Document {
    ticketId: string;
    creator: any;
    creatorRole?: string;
    creatorName?: string;
    assignedTo?: any;
    assignedAgent?: string;
    assignedAgentIdStr?: string;
    assignedAgentRole?: string;
    assignedAgentPhone?: string;
    assignedAgentPincode?: string;
    assignedAgentDistrict?: string;
    assignedAgentDivision?: string;
    assignedAgentState?: string;
    assignmentStatus?: 'assigned' | 'unassigned';
    assignmentHistory?: Array<{
        agentId?: string;
        agentName?: string;
        role?: string;
        assignedBy?: string;
        assignedAt: Date;
        reason?: string;
    }>;
    vendorId?: any;
    vendorName?: string;
    storeName?: string;
    ticketType?: 'my_issue' | 'vendor_issue' | 'agent_issue';
    subject?: string;
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
    territory?: string;
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
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