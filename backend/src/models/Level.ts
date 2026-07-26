import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const levelSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    order: { type: Number, required: true, min: 0 },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
  },
  { timestamps: true }
);

levelSchema.index({ centerId: 1, order: 1 }, { unique: true });

export type LevelDocument = InferSchemaType<typeof levelSchema> & {
  _id: Types.ObjectId;
};

export const Level = model('Level', levelSchema);
