import { Document, Types } from 'mongoose';
export interface IVendor extends Document {
    businessName: string;
    ownerName: string;
    phone: string;
    email?: string;
    category: Types.ObjectId | string;
    gst?: string;
    state?: string;
    district?: string;
    division?: string;
    pincode?: string;
    kycStatus?: 'pending' | 'approved' | 'rejected';
    location: {
        address: string;
        latitude: number;
        longitude: number;
    };
    status: 'pending' | 'verified' | 'active' | 'inactive';
    documents: Types.ObjectId[];
    assignedAgent?: Types.ObjectId | string;
    joiningType?: string;
    createdVia?: string;
    registrationSource?: string;
    agentId?: Types.ObjectId | string;
    onboardedBy?: Types.ObjectId | string;
    onboardedByAgentId?: Types.ObjectId | string;
    agentName?: string;
    agentRegistrationId?: string;
    registrationId?: string;
    role?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Vendor: import("mongoose").Model<IVendor, {}, {}, {}, Document<unknown, {}, IVendor, {}, {}> & IVendor & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Vendor;
//# sourceMappingURL=Vendor.d.ts.map