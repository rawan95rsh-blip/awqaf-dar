import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { VALID_ACADEMIC_LEVELS, VALID_NATIONALITIES } from '../constants/registration';
import { STUDENT_GENDER_VALUES } from '../constants/genderAudience';
import { CLASS_TRACKS } from '../constants/classOffers';
import { ENROLLMENT_STATUSES } from '../constants/enrollment';

const studentSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
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
    academicLevel: {
      type: String,
      required: true,
      enum: VALID_ACADEMIC_LEVELS,
    },
    /** مسار الانضمام: مطور أو دورة — الافتراضي للسجلات القديمة: مطور */
    track: {
      type: String,
      required: true,
      enum: CLASS_TRACKS,
      default: 'mutor',
    },
    /** حالة القيد: مسجّلة / خريجة / موقوف */
    enrollmentStatus: {
      type: String,
      required: true,
      enum: ENROLLMENT_STATUSES,
      default: 'enrolled',
    },
    phone: { type: String, required: true, trim: true, match: /^\d{10}$/ },
    dob: { type: Date, required: true },
    levelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
    /** عند الموافقة على حذف كلي — السجل الأكاديمي يبقى، والهوية تُحرَّر للتسجيل لاحقاً */
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studentSchema.index({ centerId: 1 });
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
