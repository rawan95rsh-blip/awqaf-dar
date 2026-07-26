import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const courseSchema = new Schema(
  {
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

courseSchema.index({ centerId: 1, name: 1 });

export type CourseDocument = InferSchemaType<typeof courseSchema> & {
  _id: Types.ObjectId;
};

export const Course = model('Course', courseSchema);
