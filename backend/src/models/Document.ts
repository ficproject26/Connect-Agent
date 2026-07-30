import { Schema, model, Document, Types } from 'mongoose';

export interface IDocument extends Document {
  ownerId: Types.ObjectId; // References Agent/User or Vendor
  ownerType: 'Agent' | 'Vendor';
  type: 'aadhar' | 'pan' | 'passport_photo' | 'signature' | 'cancelled_cheque' | 'education_certificate' | 'other';
  fileName: string;
  filePath: string;
  mimetype: string;
  size: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>({
  ownerId: { type: Schema.Types.ObjectId, required: true },
  ownerType: { type: String, enum: ['Agent', 'Vendor'], required: true },
  type: { type: String, enum: ['aadhar', 'pan', 'passport_photo', 'signature', 'cancelled_cheque', 'education_certificate', 'other'], required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const DocumentModel = model<IDocument>('Document', documentSchema);
export default DocumentModel;
