import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { VALID_ACADEMIC_LEVELS, VALID_NATIONALITIES } from '../constants/registration';
import { STUDENT_GENDER_VALUES } from '../constants/genderAudience';
import { STUDENT_TRACKS } from '../constants/tracks';
import { ENROLLMENT_STATUSES } from '../constants/enrollment';
import { PHONE_STORED_REGEX } from '../utils/phone';
import { enrollmentEventSchema, studentProfileFields } from './shared';

const studentSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    /** الرقم المدني الكويتي — 12 رقماً */
    idNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{12}$/,
    },
    gender: {
      type: String,
      required: true,
      enum: STUDENT_GENDER_VALUES,
      default: 'female',
    },
    nationality: {
      type: String,
      required: true,
      enum: VALID_NATIONALITIES,
    },
    /** المؤهل الدراسي */
    academicLevel: {
      type: String,
      required: true,
      enum: VALID_ACADEMIC_LEVELS,
    },
    /** مسار الانضمام: تمهيدي / مطور / دورات / أخرى */
    track: {
      type: String,
      required: true,
      enum: STUDENT_TRACKS,
      default: 'mutor',
    },
    /** حالة القيد: مسجّلة / خريجة / موقوفة */
    enrollmentStatus: {
      type: String,
      required: true,
      enum: ENROLLMENT_STATUSES,
      default: 'enrolled',
    },
    phone: { type: String, required: true, trim: true, match: PHONE_STORED_REGEX },
    dob: { type: Date, required: true },
    /** مستوى التمهيدي/المطور — فارغ لمسار الدورات أو «أخرى» */
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', default: null },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
    ...studentProfileFields,
    enrollmentHistory: { type: [enrollmentEventSchema], default: [] },
    /** عند الموافقة على حذف كلي — السجل الأكاديمي يبقى، والهوية تُحرَّر للتسجيل لاحقاً */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studentSchema.index({ centerId: 1, fullName: 1 });
studentSchema.index({ levelId: 1 });
/** هوية فريدة للطالبات النشطات فقط — المحذوفة كلياً لا تمنع إعادة التسجيل */
studentSchema.index(
  { idNumber: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

export type StudentDocument = InferSchemaType<typeof studentSchema> & {
  _id: Types.ObjectId;
};

export const Student = model('Student', studentSchema);
