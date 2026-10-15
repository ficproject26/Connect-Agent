import { Document, Types } from 'mongoose';
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
export declare const FieldVisit: import("mongoose").Model<IFieldVisit, {}, {}, {}, Document<unknown, {}, IFieldVisit, {}, {}> & IFieldVisit & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default FieldVisit;
//# sourceMappingURL=FieldVisit.d.ts.map