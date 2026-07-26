import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { VALID_ACADEMIC_LEVELS, VALID_NATIONALITIES } from '../constants/registration';
import { STUDENT_GENDER_VALUES } from '../constants/genderAudience';
import { CLASS_TRACKS } from '../constants/classOffers';

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
    /** مسار الانضمام: مطور أو دورة */
    track: {
      type: String,
      required: true,
      enum: CLASS_TRACKS,
      default: 'mutor',
    },
    phone: { type: String, required: true, trim: true, match: /^\d{10}$/ },
    dob: { type: Date, required: true },
    passwordHash: { type: String, required: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
    requestedLevelId: { type: Schema.Types.ObjectId, ref: 'Level', required: true },
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
