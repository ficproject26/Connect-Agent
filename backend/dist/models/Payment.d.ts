import { Document, Types } from 'mongoose';
export interface IPayment extends Document {
    agent: Types.ObjectId;
    amount: number;
    transactionId: string;
    paymentMethod: string;
    status: 'pending' | 'verified' | 'rejected';
    verifiedBy?: Types.ObjectId;
    verifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Payment: import("mongoose").Model<IPayment, {}, {}, {}, Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Payment;
//# sourceMappingURL=Payment.d.ts.map