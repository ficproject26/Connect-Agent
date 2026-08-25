import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IAgent extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'state' | 'district' | 'division' | 'pincode' | 'delivery_partner' | 'technician';
  registrationId?: string;
  dob?: Date;
  gender?: string;
  qualification?: string;
  experience?: string;
  previousCompany?: string;
  territory: {
    state: string;
    district: string;
    division: string;
    pincode: string;
  };
  kycStatus: 'pending' | 'approved' | 'rejected';
  status?: 'pending' | 'approved' | 'active' | 'rejected' | 'suspended';
  kycDocs: {
    aadhaarCard: string;
    panCard: string;
    passportPhoto: string;
    signature: string;
    cancelledCheque: string;
    educationalCertificates: string;
  };
  rejectionReason?: string;
  remarks?: string;
  registrationFeePaid: boolean;
  performanceScore: number;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const kycDocsSchema = new Schema({
  aadhaarCard: { type: String, default: '' },
  panCard: { type: String, default: '' },
  passportPhoto: { type: String, default: '' },
  signature: { type: String, default: '' },
  cancelledCheque: { type: String, default: '' },
  educationalCertificates: { type: String, default: '' }
}, { _id: false });

const territorySchema = new Schema({
  state: { type: String, default: '' },
  district: { type: String, default: '' },
  division: { type: String, default: '' },
  pincode: { type: String, default: '' }
}, { _id: false });

const agentSchema = new Schema<IAgent>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: {
    type: String,
    enum: ['state', 'district', 'division', 'pincode', 'delivery_partner', 'technician'],
    required: true
  },
  registrationId: { type: String, unique: true, sparse: true },
  dob: { type: Date },
  gender: { type: String },
  qualification: { type: String },
  experience: { type: String },
  previousCompany: { type: String },
  territory: {
    type: territorySchema,
    default: () => ({})
  },
  kycStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  status: {
    type: String,
    default: 'pending'
  },
  kycDocs: {
    type: kycDocsSchema,
    default: () => ({})
  },
  rejectionReason: { type: String, default: '' },
  remarks: { type: String, default: '' },
  registrationFeePaid: { type: Boolean, default: false },
  performanceScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

agentSchema.index({ 'territory.state': 1, 'territory.district': 1, 'territory.division': 1, 'territory.pincode': 1 });
agentSchema.index({ role: 1, kycStatus: 1 });
agentSchema.index({ phone: 1 });
agentSchema.index({ createdAt: -1 });

// Pre-save hook to hash password
agentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method to compare password
agentSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const Agent = model<IAgent>('Agent', agentSchema);
export default Agent;
