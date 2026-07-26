import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { CLASS_TRACKS } from '../constants/classOffers';
import { MAX_SUBJECT_INDEX, MIN_SUBJECT_INDEX } from '../constants/subjects';

const gradeWeightsSchema = new Schema(
  {
    attendance: { type: Number, required: true, min: 0, max: 100 },
    shortExam: { type: Number, required: true, min: 0, max: 100 },
    participation: { type: Number, required: true, min: 0, max: 100 },
    final: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const classOfferSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    track: {
      type: String,
      enum: CLASS_TRACKS,
      required: true,
      index: true,
    },
    /** مطلوب لمطور؛ null للدورة */
    levelId: {
      type: Schema.Types.ObjectId,
      ref: 'Level',
      default: null,
      index: true,
    },
    /** ربط اختياري بدورة علمية عندما track=courses */
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    subjectName: { type: String, required: true, trim: true, maxlength: 120 },
    subjectIndex: {
      type: Number,
      required: true,
      min: MIN_SUBJECT_INDEX,
      max: MAX_SUBJECT_INDEX,
    },
    mode: {
      type: String,
      enum: ['in_person', 'online'],
      required: true,
      default: 'in_person',
    },
    weekday: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    teacherName: { type: String, required: true, trim: true, maxlength: 120 },
    gradeWeights: { type: gradeWeightsSchema, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

classOfferSchema.index({ centerId: 1, track: 1, levelId: 1 });

export type ClassOfferDocument = InferSchemaType<typeof classOfferSchema> & {
  _id: Types.ObjectId;
};

export const ClassOffer = model('ClassOffer', classOfferSchema);
