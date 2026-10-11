import { Schema, model, type InferSchemaType, type Types } from 'mongoose';
import { LEVEL_TRACKS } from '../constants/tracks';

const levelSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    /** تمهيدي (١–٦) أو مطور (١–٨) */
    track: { type: String, enum: LEVEL_TRACKS, required: true, default: 'mutor' },
    order: { type: Number, required: true, min: 0 },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
  },
  { timestamps: true }
);

levelSchema.index({ centerId: 1, track: 1, order: 1 }, { unique: true });

export type LevelDocument = InferSchemaType<typeof levelSchema> & {
  _id: Types.ObjectId;
};

export const Level = model('Level', levelSchema);
