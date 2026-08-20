import { Document, Types } from 'mongoose';
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
export declare const Wallet: import("mongoose").Model<IWallet, {}, {}, {}, Document<unknown, {}, IWallet, {}, {}> & IWallet & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Wallet;
//# sourceMappingURL=Wallet.d.ts.map