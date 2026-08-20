import { Document, Types } from 'mongoose';
export interface IAttendance extends Document {
    agent: Types.ObjectId;
    date: string;
    checkIn: Date;
    checkOut?: Date;
    duration?: string;
    status: 'present' | 'absent' | 'half_day' | 'late';
    comments?: string;
    checkInLocation?: {
        latitude: number;
        longitude: number;
    };
    checkOutLocation?: {
        latitude: number;
        longitude: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const Attendance: import("mongoose").Model<IAttendance, {}, {}, {}, Document<unknown, {}, IAttendance, {}, {}> & IAttendance & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Attendance;
//# sourceMappingURL=Attendance.d.ts.map