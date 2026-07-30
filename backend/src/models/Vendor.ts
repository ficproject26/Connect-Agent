import { Schema, model, Document, Types } from 'mongoose';

export interface IVendor extends Document {
  businessName: string;
  ownerName: string;
  phone: string;
  category: Types.ObjectId; // References VendorCategory
  gst?: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'verified' | 'active' | 'inactive';
  documents: Types.ObjectId[]; // References Document
  assignedAgent?: Types.ObjectId; // References Agent/User
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>({
  businessName: { type: String, required: true, unique: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'VendorCategory', required: true },
  gst: { type: String },
  location: {
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  status: { type: String, enum: ['pending', 'verified', 'active', 'inactive'], default: 'pending' },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'Agent' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Vendor = model<IVendor>('Vendor', vendorSchema);
export default Vendor;
