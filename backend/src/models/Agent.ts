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
  assignedTerritory?: {
    state: string;
    stateId?: string;
    district?: string;
    districtId?: string;
    division?: string;
    divisionId?: string;
    taluk?: string;
    talukId?: string;
    pincode?: string;
    pincodeId?: string;
  };
  address?: {
    buildingNo?: string;
    street?: string;
    locality?: string;
    postOffice?: string;
    taluk?: string;
    state?: string;
    district?: string;
    pincode?: string;
  };
  fullAddress?: string;
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
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
  };
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

const assignedTerritorySchema = new Schema({
  state: { type: String, default: '' },
  stateId: { type: String, default: '' },
  district: { type: String, default: '' },
  districtId: { type: String, default: '' },
  division: { type: String, default: '' },
  divisionId: { type: String, default: '' },
  taluk: { type: String, default: '' },
  talukId: { type: String, default: '' },
  pincode: { type: String, default: '' },
  pincodeId: { type: String, default: '' }
}, { _id: false });

const addressDetailsSchema = new Schema({
  buildingNo: { type: String, default: '' },
  street: { type: String, default: '' },
  locality: { type: String, default: '' },
  postOffice: { type: String, default: '' },
  taluk: { type: String, default: '' },
  state: { type: String, default: '' },
  district: { type: String, default: '' },
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
  assignedTerritory: {
    type: assignedTerritorySchema,
    default: () => ({})
  },
  address: {
    type: addressDetailsSchema,
    default: () => ({})
  },
  fullAddress: { type: String, default: '' },
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
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    accountHolder: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

agentSchema.index({ 'territory.state': 1, 'territory.district': 1, 'territory.division': 1, 'territory.pincode': 1 });
agentSchema.index({ role: 1, kycStatus: 1 });
agentSchema.index({ role: 1, 'territory.state': 1, createdAt: -1 });
agentSchema.index({ role: 1, 'territory.district': 1, createdAt: -1 });
agentSchema.index({ kycStatus: 1, createdAt: -1 });
agentSchema.index({ status: 1, createdAt: -1 });
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
