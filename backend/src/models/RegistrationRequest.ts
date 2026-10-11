import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { VALID_ACADEMIC_LEVELS, VALID_NATIONALITIES } from '../constants/registration';
import { STUDENT_GENDER_VALUES } from '../constants/genderAudience';
import { STUDENT_TRACKS } from '../constants/tracks';
import { PHONE_STORED_REGEX } from '../utils/phone';
import { studentProfileFields } from './shared';

const registrationRequestSchema = new Schema(
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
    /** مسار الانضمام: تمهيدي / مطور / دورات / أخرى */
    track: {
      type: String,
      required: true,
      enum: STUDENT_TRACKS,
      default: 'mutor',
    },
    phone: { type: String, required: true, trim: true, match: PHONE_STORED_REGEX },
    dob: { type: Date, required: true },
    passwordHash: { type: String, required: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
    /** مطلوب لمساري التمهيدي والمطور فقط */
    requestedLevelId: { type: Schema.Types.ObjectId, ref: 'Level', default: null },
    ...studentProfileFields,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
  },
  { timestamps: true }
);

registrationRequestSchema.index({ centerId: 1, status: 1 });
registrationRequestSchema.index({ idNumber: 1, status: 1 });

export type RegistrationRequestDocument = InferSchemaType<
  typeof registrationRequestSchema
> & {
  _id: Types.ObjectId;
};

export const RegistrationRequest = model('RegistrationRequest', registrationRequestSchema);
