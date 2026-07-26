import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const verificationCodeSchema = new Schema(
  {
    phone: { type: String, required: true, trim: true, index: true },
    code: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}$/, 'كود التحقق يجب أن يكون 4 أرقام'],
    },
    purpose: {
      type: String,
      enum: ['center_registration'],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type VerificationCodeDocument = InferSchemaType<typeof verificationCodeSchema> & {
  _id: Types.ObjectId;
};

export const VerificationCode = model('VerificationCode', verificationCodeSchema);
