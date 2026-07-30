import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
}

const permissionSchema = new Schema<IPermission>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Permission = model<IPermission>('Permission', permissionSchema);
export default Permission;
