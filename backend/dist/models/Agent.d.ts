import { Document } from 'mongoose';
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
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}
export declare const Agent: import("mongoose").Model<IAgent, {}, {}, {}, Document<unknown, {}, IAgent, {}, {}> & IAgent & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Agent;
//# sourceMappingURL=Agent.d.ts.map