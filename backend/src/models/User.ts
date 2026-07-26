import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const userSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['center_admin', 'student'],
      required: true,
    },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    isActive: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true },
  },
  { timestamps: true }
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId;
};

export const User = model('User', userSchema);
