import { Document, Types } from 'mongoose';
export interface IFieldVisit extends Document {
    agent: Types.ObjectId;
    vendor: Types.ObjectId;
    checkInLocation: {
        latitude: number;
        longitude: number;
    };
    checkOutLocation?: {
        latitude: number;
        longitude: number;
    };
    visitDate: Date;
    photoBeforeVisit?: string;
    photoAfterVisit?: string;
    remarks?: string;
    status: 'started' | 'completed';
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