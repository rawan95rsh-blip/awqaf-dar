import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { MAX_SUBJECT_INDEX, MIN_SUBJECT_INDEX } from '../constants/subjects';

const gradeBreakdownSchema = new Schema(
  {
    attendance: { type: Number, required: true, min: 0, max: 100 },
    shortExam: { type: Number, required: true, min: 0, max: 100 },
    participation: { type: Number, required: true, min: 0, max: 100 },
    final: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const gradeSchema = new Schema(
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
    breakdown: { type: gradeBreakdownSchema, required: true },
    total: { type: Number, required: true, min: 0 },
    label: { type: String, required: true, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

gradeSchema.index({ studentId: 1, levelId: 1, subjectIndex: 1 }, { unique: true });
gradeSchema.index({ centerId: 1, levelId: 1, subjectIndex: 1 });

export type GradeDocument = InferSchemaType<typeof gradeSchema> & {
  _id: Types.ObjectId;
};

export const Grade = model('Grade', gradeSchema);
