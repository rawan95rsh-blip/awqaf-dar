import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { MAX_SUBJECT_INDEX, MIN_SUBJECT_INDEX } from '../constants/subjects';

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

const attendanceSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
    subjectIndex: {
      type: Number,
      required: true,
      min: MIN_SUBJECT_INDEX,
      max: MAX_SUBJECT_INDEX,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ATTENDANCE_STATUSES,
    },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { studentId: 1, levelId: 1, subjectIndex: 1, date: 1 },
  { unique: true }
);
attendanceSchema.index({ centerId: 1, levelId: 1, subjectIndex: 1, date: 1 });

export type AttendanceDocument = InferSchemaType<typeof attendanceSchema> & {
  _id: Types.ObjectId;
};

export const Attendance = model('Attendance', attendanceSchema);
