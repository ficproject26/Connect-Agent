import { Schema, model, Document, Types } from 'mongoose';
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
  alternateMobile?: string;
  altPhone?: string;
  preferredLanguage?: string;
  bloodGroup?: string;
  profilePhoto?: string;
  vehicleDetails?: {
    type?: string;
    number?: string;
    model?: string;
    licenseNumber?: string;
    workingArea?: string;
    vehicleTypes?: string[];
    vehicles?: Record<string, { model?: string; number?: string }>;
  };
  bankDetails?: {
    accountHolderName?: string;
    accountHolder?: string;
    bankName: string;
    bankBranch?: string;
    branchName?: string;
    accountNumber: string;
    ifscCode: string;
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
  alternateMobile: { type: String, default: '' },
  altPhone: { type: String, default: '' },
  preferredLanguage: { type: String, default: 'English' },
  bloodGroup: { type: String, default: 'O+' },
  profilePhoto: { type: String, default: '' },
  vehicleDetails: { type: Schema.Types.Mixed, default: () => ({}) },
  bankDetails: {
    accountHolderName: { type: String, default: '' },
    accountHolder: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankBranch: { type: String, default: '' },
    branchName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  strict: false
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
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err: any) {
      return next(err);
    }
  }

  // Atomic model-level validation: strictly 1 active approved District Agent per district
  if (this.role === 'district' && (this.kycStatus === 'approved' || this.status === 'approved' || this.status === 'active')) {
    const dist = (this.assignedTerritory?.district || this.territory?.district || '').trim();
    const st = (this.assignedTerritory?.state || this.territory?.state || '').trim();
    if (dist && (this.isModified('role') || this.isModified('kycStatus') || this.isModified('status') || this.isModified('territory') || this.isModified('assignedTerritory'))) {
      const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existing = await (this.constructor as any).findOne({
        _id: { $ne: this._id },
        role: { $in: ['district', 'district_agent', 'district_manager'] },
        $or: [
          { 'assignedTerritory.district': new RegExp(`^${escape(dist)}$`, 'i') },
          { 'territory.district': new RegExp(`^${escape(dist)}$`, 'i') }
        ],
        $and: [
          ...(st ? [{
            $or: [
              { 'assignedTerritory.state': new RegExp(`^${escape(st)}$`, 'i') },
              { 'territory.state': new RegExp(`^${escape(st)}$`, 'i') }
            ]
          }] : []),
          {
            $or: [
              { kycStatus: { $regex: /^approved$/i } },
              { status: { $regex: /^(approved|active)$/i } }
            ]
          },
          { kycStatus: { $nin: ['rejected', 'pending', 'pending_verification', 'suspended', 'in_review'] } },
          { status: { $nin: ['rejected', 'pending', 'pending_approval', 'suspended', 'inactive', 'under_review'] } }
        ]
      });
      if (existing) {
        return next(new Error('A District Agent is already assigned to this district.'));
      }
    }
  }

  next();
});

// Method to compare password
agentSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

export const Agent = model<IAgent>('Agent', agentSchema);
export default Agent;
