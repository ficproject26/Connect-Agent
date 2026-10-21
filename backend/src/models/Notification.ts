import { Schema, model, Document } from 'mongoose';

export interface INotification extends Document {
  receiver: any; // References Agent/User (ObjectId or string ID)
  title: string;
  message: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  category: string;
  link?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  receiver: { type: Schema.Types.Mixed, required: true, index: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false, index: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  category: { type: String, required: true, default: 'announcement' },
  link: { type: String, default: '' },
  relatedEntityId: { type: String, default: '' },
  relatedEntityType: { type: String, default: '' },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

notificationSchema.index({ receiver: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);
export default Notification;
