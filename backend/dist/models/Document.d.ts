import { Document, Types } from 'mongoose';
export interface IDocument extends Document {
    ownerId: Types.ObjectId;
    ownerType: 'Agent' | 'Vendor';
    type: 'aadhar' | 'pan' | 'passport_photo' | 'signature' | 'cancelled_cheque' | 'education_certificate' | 'other';
    fileName: string;
    filePath: string;
    mimetype: string;
    size: number;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const DocumentModel: import("mongoose").Model<IDocument, {}, {}, {}, Document<unknown, {}, IDocument, {}, {}> & IDocument & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default DocumentModel;
//# sourceMappingURL=Document.d.ts.map