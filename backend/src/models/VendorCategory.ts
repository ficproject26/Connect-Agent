import { Schema, model, Document } from 'mongoose';

export interface IVendorCategory extends Document {
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
}

const vendorCategorySchema = new Schema<IVendorCategory>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const VendorCategory = model<IVendorCategory>('VendorCategory', vendorCategorySchema);
export default VendorCategory;
