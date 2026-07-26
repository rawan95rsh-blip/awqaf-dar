import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { SESSION_MODES, SESSION_STATUSES } from '../constants/sessions';
import { MAX_SUBJECT_INDEX, MIN_SUBJECT_INDEX } from '../constants/subjects';

const sessionSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    /** null لحصص فصول الدورة العامة */
    levelId: {
      type: Schema.Types.ObjectId,
      ref: 'Level',
      default: null,
      index: true,
    },
    classOfferId: {
      type: Schema.Types.ObjectId,
      ref: 'ClassOffer',
      default: null,
      index: true,
    },
    subjectIndex: {
      type: Number,
      required: true,
      min: MIN_SUBJECT_INDEX,
      max: MAX_SUBJECT_INDEX,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    mode: {
      type: String,
      enum: SESSION_MODES,
      required: true,
      default: 'in_person',
    },
    zoomUrl: { type: String, trim: true },
    zoomMeetingId: { type: String, trim: true },
    zoomPasscode: { type: String, trim: true },
    teacherName: { type: String, trim: true, maxlength: 120 },
    notes: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      required: true,
      default: 'scheduled',
      index: true,
    },
    /** سبب اعتذار المعلمة عند الإلغاء */
    cancelReason: { type: String, trim: true, maxlength: 500 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

sessionSchema.index({ centerId: 1, startAt: 1 });
sessionSchema.index({ centerId: 1, levelId: 1, startAt: 1 });

export type SessionDocument = InferSchemaType<typeof sessionSchema> & {
  _id: Types.ObjectId;
};

export const Session = model('Session', sessionSchema);
