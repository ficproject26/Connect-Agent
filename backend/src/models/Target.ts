import { Schema, model, Document, Types } from 'mongoose';

export interface ITarget extends Document {
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  targetValue: number; // e.g. visits count
  createdBy: Types.ObjectId; // References Agent/User
  createdAt: Date;
  updatedAt: Date;
}

const targetSchema = new Schema<ITarget>({
  title: { type: String, required: true },
  description: { type: String },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
  targetValue: { type: Number, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

targetSchema.index({ createdBy: 1 });
targetSchema.index({ type: 1 });
targetSchema.index({ createdAt: -1 });

export const Target = model<ITarget>('Target', targetSchema);
export default Target;
