import { Schema, model, Document, Types } from 'mongoose';

export interface IReport extends Document {
  agent: Types.ObjectId; // References Agent/User
  type: 'daily' | 'weekly' | 'monthly' | 'vendor' | 'performance' | 'visit';
  content: Schema.Types.Mixed; // Formatted statistics details
  remarks?: string;
  reviewedBy?: Types.ObjectId; // References Agent/User
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>({
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'vendor', 'performance', 'visit'], required: true },
  content: { type: Schema.Types.Mixed, required: true },
  remarks: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'Agent' },
  reviewedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Report = model<IReport>('Report', reportSchema);
export default Report;
