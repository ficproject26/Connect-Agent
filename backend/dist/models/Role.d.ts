import { Document, Types } from 'mongoose';
export interface IRole extends Document {
    name: string;
    code: string;
    description?: string;
    permissions: Types.ObjectId[];
    createdAt: Date;
}
export declare const Role: import("mongoose").Model<IRole, {}, {}, {}, Document<unknown, {}, IRole, {}, {}> & IRole & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Role;
//# sourceMappingURL=Role.d.ts.map