import { Schema, model, Document, Types } from 'mongoose';

export interface ITicket extends Document {
  ticketId: string;
  creator: any; // References Agent/User (ObjectId or String UUID)
  creatorRole?: string;
  creatorName?: string;
  assignedTo?: any; // References Agent/User (ObjectId or String UUID)
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

const ticketSchema = new Schema<ITicket>({
  ticketId: { type: String, required: true, unique: true },
  creator: { type: Schema.Types.Mixed, ref: 'Agent', required: true },
  creatorRole: { type: String },
  creatorName: { type: String },
  assignedTo: { type: Schema.Types.Mixed, ref: 'Agent' },
  assignedAgent: { type: String },
  assignedAgentIdStr: { type: String },
  assignedAgentRole: { type: String },
  assignedAgentPhone: { type: String },
  assignedAgentPincode: { type: String },
  assignedAgentDistrict: { type: String },
  assignedAgentDivision: { type: String },
  assignedAgentState: { type: String },
  assignmentStatus: { type: String, enum: ['assigned', 'unassigned'], default: 'unassigned' },
  assignmentHistory: [{
    agentId: { type: String },
    agentName: { type: String },
    role: { type: String },
    assignedBy: { type: String },
    assignedAt: { type: Date, default: Date.now },
    reason: { type: String }
  }],
  vendorName: { type: String },
  storeName: { type: String },
  state: { type: String },
  district: { type: String },
  division: { type: String },
  pincode: { type: String },
  territory: { type: String },
  category: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed', 'escalated_to_admin'], default: 'open' },
  attachmentName: { type: String },
  attachmentUrl: { type: String },
  resolutionDetails: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

ticketSchema.index({ creator: 1 });
ticketSchema.index({ creator: 1, status: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ state: 1, status: 1, createdAt: -1 });
ticketSchema.index({ district: 1, status: 1, createdAt: -1 });
ticketSchema.index({ division: 1, status: 1, createdAt: -1 });
ticketSchema.index({ pincode: 1, status: 1, createdAt: -1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ state: 1, district: 1, pincode: 1 });
ticketSchema.index({ createdAt: -1 });

export const Ticket = model<ITicket>('Ticket', ticketSchema);
export default Ticket;
