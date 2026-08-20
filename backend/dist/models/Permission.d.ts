import { Document } from 'mongoose';
export interface IPermission extends Document {
    name: string;
    code: string;
    description?: string;
    createdAt: Date;
}
export declare const Permission: import("mongoose").Model<IPermission, {}, {}, {}, Document<unknown, {}, IPermission, {}, {}> & IPermission & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Permission;
//# sourceMappingURL=Permission.d.ts.map