import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const accountDeletionRequestSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

accountDeletionRequestSchema.index({ centerId: 1, status: 1 });
accountDeletionRequestSchema.index({ studentId: 1, status: 1 });

export type AccountDeletionRequestDocument = InferSchemaType<
  typeof accountDeletionRequestSchema
> & {
  _id: Types.ObjectId;
};

export const AccountDeletionRequest = model(
  'AccountDeletionRequest',
  accountDeletionRequestSchema
);
