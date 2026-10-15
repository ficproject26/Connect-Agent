import { Schema, model, Document, Types } from 'mongoose';

export interface IFieldVisit extends Document {
  agent?: Types.ObjectId | any;
  vendor?: Types.ObjectId | any;
  vendorId?: string;
  shopName?: string;
  category?: string;
  businessCategory?: string;
  shopPhoto?: string;
  storefrontPhoto?: string;
  photoBeforeVisit?: string;
  photoAfterVisit?: string;
  interestedStatus?: 'YES' | 'NO' | string;
  interestStatus?: 'YES' | 'NO' | string;
  notInterestedReason?: string;
  otherReason?: string;
  voiceNote?: string;
  audioVoiceNote?: string;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: Date;
  };
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: Date;
  };
  visitDate: Date;
  remarks?: string;
  status: 'started' | 'completed' | string;
  onboardingStatus?: string;
  managerId?: string;
  managerName?: string;
  managerRole?: string;
  recordedById?: string;
  recordedByName?: string;
  recordedByRole?: string;
  state?: string;
  district?: string;
  division?: string;
  pincode?: string;
  stateId?: string;
  districtId?: string;
  divisionId?: string;
  pincodeId?: string;
  pincodeCode?: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fieldVisitSchema = new Schema<IFieldVisit>({
  agent: { type: Schema.Types.Mixed, ref: 'Agent', required: false },
  vendor: { type: Schema.Types.Mixed, ref: 'Vendor', required: false, default: null },
  vendorId: { type: String, default: null },
  shopName: { type: String, trim: true },
  category: { type: String, trim: true },
  businessCategory: { type: String, trim: true },
  shopPhoto: { type: String },
  storefrontPhoto: { type: String },
  photoBeforeVisit: { type: String },
  photoAfterVisit: { type: String },
  interestedStatus: { type: String, enum: ['YES', 'NO', 'yes', 'no', 'Interested', 'Not Interested'] },
  interestStatus: { type: String, enum: ['YES', 'NO', 'yes', 'no', 'Interested', 'Not Interested'] },
  notInterestedReason: { type: String },
  otherReason: { type: String },
  voiceNote: { type: String },
  audioVoiceNote: { type: String },
  checkInLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Date, default: Date.now }
  },
  checkOutLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Date }
  },
  visitDate: { type: Date, default: Date.now },
  completedAt: { type: Date },
  remarks: { type: String },
  status: { type: String, default: 'completed' },
  onboardingStatus: { type: String, default: 'PENDING' },
  managerId: { type: String },
  managerName: { type: String },
  managerRole: { type: String },
  recordedById: { type: String },
  recordedByName: { type: String },
  recordedByRole: { type: String },
  state: { type: String },
  district: { type: String },
  division: { type: String },
  pincode: { type: String },
  stateId: { type: String },
  districtId: { type: String },
  divisionId: { type: String },
  pincodeId: { type: String },
  pincodeCode: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  strict: false
});

fieldVisitSchema.index({ agent: 1, visitDate: -1 });
fieldVisitSchema.index({ vendor: 1 });
fieldVisitSchema.index({ shopName: 1 });
fieldVisitSchema.index({ status: 1 });
fieldVisitSchema.index({ interestStatus: 1 });
fieldVisitSchema.index({ createdAt: -1 });

export const FieldVisit = model<IFieldVisit>('FieldVisit', fieldVisitSchema);
export default FieldVisit;
