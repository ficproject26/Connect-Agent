import { Schema, model, Document, Types } from 'mongoose';

export interface ITargetAssignment extends Document {
  target: Types.ObjectId;
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  dueDate: Date;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending' | 'overdue';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const targetAssignmentSchema = new Schema<ITargetAssignment>({
  target: { type: Schema.Types.ObjectId, ref: 'Target', required: true },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['assigned', 'accepted', 'in_progress', 'completed', 'pending', 'overdue'],
    default: 'assigned',
    required: true
  },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

targetAssignmentSchema.index({ assignedTo: 1, status: 1 });
targetAssignmentSchema.index({ target: 1 });
targetAssignmentSchema.index({ assignedBy: 1 });
targetAssignmentSchema.index({ createdAt: -1 });

export const TargetAssignment = model<ITargetAssignment>('TargetAssignment', targetAssignmentSchema);
export default TargetAssignment;
