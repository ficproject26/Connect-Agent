import { Schema, model, Document, Types } from 'mongoose';

export interface ITicket extends Document {
  ticketId: string;
  creator: Types.ObjectId; // References Agent/User
  creatorRole?: string;
  creatorName?: string;
  assignedTo?: Types.ObjectId; // References Agent/User
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

const ticketSchema = new Schema<ITicket>({
  ticketId: { type: String, required: true, unique: true },
  creator: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  creatorRole: { type: String },
  creatorName: { type: String },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Agent' },
  assignedAgent: { type: String },
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
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ state: 1, district: 1, pincode: 1 });
ticketSchema.index({ createdAt: -1 });

export const Ticket = model<ITicket>('Ticket', ticketSchema);
export default Ticket;
