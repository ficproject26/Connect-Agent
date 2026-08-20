import { Document } from 'mongoose';
export interface IVendorCategory extends Document {
    name: string;
    code: string;
    description?: string;
    createdAt: Date;
}
export declare const VendorCategory: import("mongoose").Model<IVendorCategory, {}, {}, {}, Document<unknown, {}, IVendorCategory, {}, {}> & IVendorCategory & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default VendorCategory;
//# sourceMappingURL=VendorCategory.d.ts.map