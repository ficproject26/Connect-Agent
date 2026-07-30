import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  agent: Types.ObjectId; // References Agent/User
  amount: number;
  transactionId: string;
  paymentMethod: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: Types.ObjectId; // References Agent/User (Admin)
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true, unique: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'Agent' },
  verifiedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export const Payment = model<IPayment>('Payment', paymentSchema);
export default Payment;
