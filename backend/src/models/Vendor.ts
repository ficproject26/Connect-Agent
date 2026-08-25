import { Schema, model, Document, Types } from 'mongoose';

export interface IVendor extends Document {
  businessName: string;
  ownerName: string;
  phone: string;
  email?: string;
  category: Types.ObjectId | string;
  gst?: string;
  state?: string;
  district?: string;
  division?: string;
  pincode?: string;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  status: 'pending' | 'verified' | 'active' | 'inactive';
  documents: Types.ObjectId[];
  assignedAgent?: Types.ObjectId | string;
  joiningType?: string;
  createdVia?: string;
  registrationSource?: string;
  agentId?: Types.ObjectId | string;
  onboardedBy?: Types.ObjectId | string;
  onboardedByAgentId?: Types.ObjectId | string;
  agentName?: string;
  agentRegistrationId?: string;
  registrationId?: string;
  role?: string;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>({
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  category: { type: Schema.Types.Mixed },
  gst: { type: String },
  state: { type: String },
  district: { type: String },
  division: { type: String },
  pincode: { type: String },
  kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  location: {
    address: { type: String, required: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 }
  },
  status: { type: String, default: 'pending' },
  documents: [{ type: Schema.Types.ObjectId, ref: 'Document' }],
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'Agent' },
  // Agent onboarding tracking fields
  joiningType: { type: String },
  createdVia: { type: String },
  registrationSource: { type: String },
  agentId: { type: Schema.Types.Mixed },
  onboardedBy: { type: Schema.Types.Mixed },
  onboardedByAgentId: { type: Schema.Types.Mixed },
  agentName: { type: String },
  agentRegistrationId: { type: String },
  registrationId: { type: String },
  role: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  strict: false
});

vendorSchema.index({ state: 1, district: 1, division: 1, pincode: 1 });
vendorSchema.index({ status: 1, kycStatus: 1 });
vendorSchema.index({ assignedAgent: 1 });
vendorSchema.index({ agentId: 1 });
vendorSchema.index({ onboardedBy: 1 });
vendorSchema.index({ phone: 1 });
vendorSchema.index({ createdAt: -1 });

export const Vendor = model<IVendor>('Vendor', vendorSchema);
export default Vendor;
