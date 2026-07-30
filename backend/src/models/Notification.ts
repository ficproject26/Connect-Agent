import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  receiver: Types.ObjectId; // References Agent/User
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: 'target_assigned' | 'vendor_assigned' | 'ticket_assigned' | 'report_reminder' | 'approval_status' | 'announcement';
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  receiver: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: { type: String, enum: ['target_assigned', 'vendor_assigned', 'ticket_assigned', 'report_reminder', 'approval_status', 'announcement'], required: true },
  createdAt: { type: Date, default: Date.now }
});

notificationSchema.index({ receiver: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
export default Notification;
