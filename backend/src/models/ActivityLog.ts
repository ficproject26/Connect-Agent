import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  agent: Types.ObjectId; // References Agent/User
  action: string; // e.g. Login, Logout, Vendor Added, etc.
  ipAddress?: string;
  details?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  action: { type: String, required: true },
  ipAddress: { type: String },
  details: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const ActivityLog = model<IActivityLog>('ActivityLog', activityLogSchema);
export default ActivityLog;
