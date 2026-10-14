import mongoose, { Document } from 'mongoose';
export interface ITaskHistoryItem {
    action: string;
    performedBy: string;
    performedById?: any;
    performedRole?: string;
    timestamp: Date;
    details?: any;
}
export interface IPreviousSubmission {
    remarks?: string;
    photos?: string[];
    voiceNote?: string;
    submittedAt: Date;
    submittedBy?: string;
    reviewNotes?: string;
}
export interface IReworkDetails {
    reason?: string;
    reworkRemarks?: string;
    requestedBy?: string;
    requestedById?: any;
    requestedAt?: Date;
    previousSubmissions?: IPreviousSubmission[];
}
export interface ICompletionDetails {
    remarks?: string;
    photos?: string[];
    voiceNote?: string;
    submittedAt?: Date;
    submittedBy?: string;
    completedAt?: Date;
    completedBy?: string;
    workCompleted?: string;
    resolutionDetails?: string;
    completionPhotos?: string[];
}
export interface IRejectionDetails {
    reason: string;
    rejectedBy?: string;
    rejectedById?: any;
    rejectedAt?: Date;
    rejectionType?: 'admin_rejected_request' | 'agent_rejected_task';
}
export interface ITask extends Document {
    _id: any;
    taskNumber: string;
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    dueDate: Date;
    taskType: 'admin_direct' | 'agent_request';
    requestStatus: 'pending' | 'approved' | 'rejected' | 'n/a';
    status: 'Pending Admin Review' | 'Assigned' | 'In Progress' | 'Rework' | 'Submitted for Review' | 'Approved' | 'Rejected' | 'Closed' | 'Completed' | 'Accepted' | 'Pending Acceptance';
    hierarchyLevel: 'state' | 'district' | 'division' | 'pincode';
    state?: string;
    stateId?: string;
    district?: string;
    districtId?: string;
    division?: string;
    divisionId?: string;
    pincode?: string;
    pincodeId?: string;
    location?: string;
    vendor?: string;
    vendorId?: any;
    category?: string;
    createdById?: any;
    createdByName?: string;
    createdByRole?: string;
    createdByAdminId?: any;
    createdByAdminName?: string;
    createdByAdminRole?: string;
    receivingAdminId?: any;
    receivingAdminName?: string;
    receivingAdminRole?: string;
    reviewedAt?: Date;
    reviewedBy?: string;
    assignedAgentId?: any;
    assignedAgentName?: string;
    assignedAgentRole?: string;
    assignedDate?: Date;
    assignedManagerId?: any;
    assignedManagerName?: string;
    assignedManagerRole?: string;
    acceptedAt?: Date;
    acceptedBy?: string;
    acceptedById?: any;
    startedAt?: Date;
    startedBy?: string;
    startedById?: any;
    photos?: string[];
    shopPhoto?: string;
    voiceNote?: string;
    completionDetails?: ICompletionDetails;
    reworkDetails?: IReworkDetails;
    rejectionReason?: string;
    rejectionDetails?: IRejectionDetails;
    history?: ITaskHistoryItem[];
    activityLog?: any[];
    createdAt: Date;
    updatedAt: Date;
    isOverdue?: boolean;
}
export declare const Task: mongoose.Model<ITask, {}, {}, {}, mongoose.Document<unknown, {}, ITask, {}, {}> & ITask & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, any>;
export default Task;
//# sourceMappingURL=Task.d.ts.map