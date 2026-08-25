import { Schema, model, Document, Types } from 'mongoose';

export interface ITicket extends Document {
  ticketId: string;
  creator: Types.ObjectId; // References Agent/User
  assignedTo?: Types.ObjectId; // References Agent/User
  category: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  resolutionDetails?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>({
  ticketId: { type: String, required: true, unique: true },
  creator: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Agent' },
  category: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['open', 'assigned', 'in_progress', 'resolved', 'closed'], default: 'open' },
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
ticketSchema.index({ createdAt: -1 });

export const Ticket = model<ITicket>('Ticket', ticketSchema);
export default Ticket;
