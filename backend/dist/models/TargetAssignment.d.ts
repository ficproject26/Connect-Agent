import { Document, Types } from 'mongoose';
export interface ITargetAssignment extends Document {
    target: any;
    assignedTo: any;
    assignedBy: any;
    dueDate: Date;
    status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'pending' | 'overdue' | 'rejected' | 'cancelled';
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const TargetAssignment: import("mongoose").Model<ITargetAssignment, {}, {}, {}, Document<unknown, {}, ITargetAssignment, {}, {}> & ITargetAssignment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default TargetAssignment;
//# sourceMappingURL=TargetAssignment.d.ts.map