import mongoose, { Document, Schema } from 'mongoose';

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
  status:
    | 'Pending Admin Review'
    | 'Assigned'
    | 'In Progress'
    | 'Rework'
    | 'Submitted for Review'
    | 'Approved'
    | 'Rejected'
    | 'Closed'
    | 'Completed'
    | 'Accepted'
    | 'Pending Acceptance';
  hierarchyLevel: 'state' | 'district' | 'division' | 'pincode';

  // Territory scope
  state?: string;
  stateId?: string;
  district?: string;
  districtId?: string;
  division?: string;
  divisionId?: string;
  pincode?: string;
  pincodeId?: string;
  location?: string;

  // Associated vendor/entity (optional)
  vendor?: string;
  vendorId?: any;
  category?: string;

  // Initiator / Creator
  createdById?: any;
  createdByName?: string;
  createdByRole?: string;
  createdByAdminId?: any;
  createdByAdminName?: string;
  createdByAdminRole?: string;

  // Receiving Admin (for Agent-Initiated Task Requests)
  receivingAdminId?: any;
  receivingAdminName?: string;
  receivingAdminRole?: string;
  reviewedAt?: Date;
  reviewedBy?: string;

  // Assigned Agent
  assignedAgentId?: any;
  assignedAgentName?: string;
  assignedAgentRole?: string;
  assignedDate?: Date;

  // Assigned Manager (legacy admin references)
  assignedManagerId?: any;
  assignedManagerName?: string;
  assignedManagerRole?: string;

  // Execution & Evidence
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

  // Audit History
  history?: ITaskHistoryItem[];
  activityLog?: any[];

  createdAt: Date;
  updatedAt: Date;

  // Virtual property
  isOverdue?: boolean;
}

const taskSchema = new Schema<ITask>(
  {
    _id: { type: Schema.Types.Mixed },
    taskNumber: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'high', 'medium', 'low'],
      default: 'Medium',
      index: true
    },
    dueDate: { type: Date, required: true, index: true },
    taskType: {
      type: String,
      enum: ['admin_direct', 'agent_request'],
      default: 'admin_direct',
      index: true
    },
    requestStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'n/a'],
      default: 'n/a',
      index: true
    },
    status: {
      type: String,
      enum: [
        'Pending Admin Review',
        'Assigned',
        'In Progress',
        'Rework',
        'Submitted for Review',
        'Approved',
        'Rejected',
        'Closed',
        'Completed',
        'Accepted',
        'Pending Acceptance'
      ],
      default: 'Assigned',
      index: true
    },
    hierarchyLevel: {
      type: String,
      enum: ['state', 'district', 'division', 'pincode'],
      index: true
    },

    // Territory scope
    state: { type: String, index: true },
    stateId: { type: String },
    district: { type: String, index: true },
    districtId: { type: String },
    division: { type: String, index: true },
    divisionId: { type: String },
    pincode: { type: String, index: true },
    pincodeId: { type: String },
    location: { type: String },

    // Associated vendor
    vendor: { type: String },
    vendorId: { type: Schema.Types.Mixed },
    category: { type: String },

    // Creator / Requester
    createdById: { type: Schema.Types.Mixed, index: true },
    createdByName: { type: String },
    createdByRole: { type: String },
    createdByAdminId: { type: Schema.Types.Mixed },
    createdByAdminName: { type: String },
    createdByAdminRole: { type: String },

    // Receiving Admin
    receivingAdminId: { type: Schema.Types.Mixed, index: true },
    receivingAdminName: { type: String },
    receivingAdminRole: { type: String },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },

    // Assigned Agent
    assignedAgentId: { type: Schema.Types.Mixed, index: true },
    assignedAgentName: { type: String },
    assignedAgentRole: { type: String },
    assignedDate: { type: Date },

    // Legacy Manager
    assignedManagerId: { type: Schema.Types.Mixed },
    assignedManagerName: { type: String },
    assignedManagerRole: { type: String },

    // Evidence & Execution
    acceptedAt: { type: Date },
    acceptedBy: { type: String },
    acceptedById: { type: Schema.Types.Mixed },
    startedAt: { type: Date },
    startedBy: { type: String },
    startedById: { type: Schema.Types.Mixed },
    photos: { type: [String], default: [] },
    shopPhoto: { type: String },
    voiceNote: { type: String },
    completionDetails: {
      remarks: { type: String },
      photos: { type: [String], default: [] },
      voiceNote: { type: String },
      submittedAt: { type: Date },
      completedAt: { type: Date },
      completedBy: { type: String },
      workCompleted: { type: String },
      resolutionDetails: { type: String },
      completionPhotos: { type: [String], default: [] }
    },
    reworkDetails: {
      reason: { type: String },
      reworkRemarks: { type: String },
      requestedBy: { type: String },
      requestedById: { type: Schema.Types.Mixed },
      requestedAt: { type: Date },
      previousSubmissions: {
        type: [
          {
            remarks: String,
            photos: [String],
            voiceNote: String,
            submittedAt: Date,
            submittedBy: String,
            reviewNotes: String
          }
        ],
        default: []
      }
    },
    rejectionReason: { type: String },
    rejectionDetails: {
      reason: { type: String },
      rejectedBy: { type: String },
      rejectedById: { type: Schema.Types.Mixed },
      rejectedAt: { type: Date },
      rejectionType: { type: String, enum: ['admin_rejected_request', 'agent_rejected_task'] }
    },

    // History and logs
    history: {
      type: [
        {
          action: { type: String, required: true },
          performedBy: { type: String, required: true },
          performedById: { type: Schema.Types.Mixed },
          performedRole: { type: String },
          timestamp: { type: Date, default: Date.now },
          details: { type: Schema.Types.Mixed }
        }
      ],
      default: []
    },
    activityLog: { type: [Schema.Types.Mixed], default: [] }
  },
  {
    timestamps: true,
    collection: 'tasks',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual property to calculate whether task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  const closedStatuses = ['Approved', 'Completed', 'Rejected', 'Closed'];
  return new Date() > new Date(this.dueDate) && !closedStatuses.includes(this.status);
});

// Auto-generate ObjectId or string ID if missing
taskSchema.pre('save', function (next) {
  if (!this._id) {
    this._id = new mongoose.Types.ObjectId();
  }
  if (!this.taskNumber) {
    this.taskNumber = `TSK-${Date.now().toString().slice(-6)}`;
  }
  next();
});

export const Task = mongoose.model<ITask>('Task', taskSchema, 'tasks');
export default Task;
