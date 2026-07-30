import { Schema, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
  name: string;
  code: string;
  description?: string;
  permissions: Types.ObjectId[];
  createdAt: Date;
}

const roleSchema = new Schema<IRole>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
  createdAt: { type: Date, default: Date.now }
});

export const Role = model<IRole>('Role', roleSchema);
export default Role;
