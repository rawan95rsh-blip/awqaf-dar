import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { DEFAULT_GRADE_WEIGHTS } from '../constants/grades';

const gradeWeightsSchema = new Schema(
  {
    attendance: { type: Number, default: DEFAULT_GRADE_WEIGHTS.attendance, min: 1, max: 100 },
    shortExam: { type: Number, default: DEFAULT_GRADE_WEIGHTS.shortExam, min: 1, max: 100 },
    participation: {
      type: Number,
      default: DEFAULT_GRADE_WEIGHTS.participation,
      min: 1,
      max: 100,
    },
    final: { type: Number, default: DEFAULT_GRADE_WEIGHTS.final, min: 1, max: 100 },
  },
  { _id: false }
);

const centerSchema = new Schema(
  {
    nameAr: { type: String, required: true, trim: true },
    supervisorName: { type: String, required: true, trim: true },
    specializations: { type: [String], default: [] },
    /** عنوان المركز النصي (بدون خريطة في v1) */
    addressText: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    /** جمهور المركز: نسائي أو رجالي فقط */
    genderAudience: {
      type: String,
      enum: ['female', 'male'],
      default: 'female',
    },
    gradeWeights: {
      type: gradeWeightsSchema,
      default: () => ({ ...DEFAULT_GRADE_WEIGHTS }),
    },
    status: {
      type: String,
      enum: ['pending', 'active'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export type CenterDocument = InferSchemaType<typeof centerSchema> & {
  _id: Types.ObjectId;
};

export const Center = model('Center', centerSchema);
