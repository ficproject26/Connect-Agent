import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction {
  transactionId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface IWallet extends Document {
  agent: Types.ObjectId;
  balance: number;
  transactions: ITransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>({
  transactionId: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed', required: true },
  createdAt: { type: Date, default: Date.now }
});

const walletSchema = new Schema<IWallet>({
  agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true, unique: true },
  balance: { type: Number, default: 0, required: true },
  transactions: [transactionSchema]
}, {
  timestamps: true
});

export const Wallet = model<IWallet>('Wallet', walletSchema);
export default Wallet;
