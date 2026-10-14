import { Schema, model, Document, Types } from 'mongoose';

export interface IFieldVisit extends Document {
  agent: Types.ObjectId; // References Agent/User
  vendor: Types.ObjectId; // References Vendor
  checkInLocation: {
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
  photoBeforeVisit?: string; // Image URL/Path
  photoAfterVisit?: string;  // Image URL/Path
  remarks?: string;
  status: 'started' | 'completed';
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const fieldVisitSchema = new Schema<IFieldVisit>({
  agent: { type: Schema.Types.Mixed, ref: 'Agent', required: true },
  vendor: { type: Schema.Types.Mixed, ref: 'Vendor', required: true },
  checkInLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
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
  photoBeforeVisit: { type: String },
  photoAfterVisit: { type: String },
  remarks: { type: String },
  status: { type: String, enum: ['started', 'completed'], default: 'started' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

fieldVisitSchema.index({ agent: 1, visitDate: -1 });
fieldVisitSchema.index({ vendor: 1 });
fieldVisitSchema.index({ status: 1 });
fieldVisitSchema.index({ createdAt: -1 });

export const FieldVisit = model<IFieldVisit>('FieldVisit', fieldVisitSchema);
export default FieldVisit;
