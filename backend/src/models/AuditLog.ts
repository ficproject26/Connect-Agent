import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  entityId: Types.ObjectId; // References specific collections
  entityType: 'Agent' | 'Vendor' | 'Target' | 'Ticket' | 'Report';
  action: 'profile_update' | 'vendor_change' | 'target_change' | 'ticket_change' | 'approval_change';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changedBy: Types.ObjectId; // References Agent/User
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityType: { type: String, enum: ['Agent', 'Vendor', 'Target', 'Ticket', 'Report'], required: true },
  action: { type: String, enum: ['profile_update', 'vendor_change', 'target_change', 'ticket_change', 'approval_change'], required: true },
  fieldName: { type: String },
  oldValue: { type: String },
  newValue: { type: String },
  changedBy: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ entityId: 1, createdAt: -1 });
auditLogSchema.index({ changedBy: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
