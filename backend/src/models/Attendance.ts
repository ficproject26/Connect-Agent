import { Schema, model, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  agent: Types.ObjectId; // References Agent
  date: string; // YYYY-MM-DD
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

const attendanceSchema = new Schema<IAttendance>(
  {
    agent: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
    date: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date },
    duration: { type: String },
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'late'],
      default: 'present'
    },
    comments: { type: String },
    checkInLocation: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    checkOutLocation: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.index({ agent: 1, date: -1 });
attendanceSchema.index({ date: -1, status: 1 });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);
export default Attendance;
