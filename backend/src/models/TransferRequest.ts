import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

/**
 * طلب نقل طالبة بين مركزين:
 * - pending_source: طلب من الطالبة بانتظار موافقة مركزها الحالي
 * - pending_destination: بانتظار قبول المركز الجديد
 * - approved / rejected / cancelled
 */
export const TRANSFER_STATUSES = [
  'pending_source',
  'pending_destination',
  'approved',
  'rejected',
  'cancelled',
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const OPEN_TRANSFER_STATUSES: TransferStatus[] = ['pending_source', 'pending_destination'];

const transferRequestSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    fromCenterId: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    toCenterId: { type: Schema.Types.ObjectId, ref: 'Center', required: true, index: true },
    initiatedBy: { type: String, enum: ['student', 'center'], required: true },
    requestedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, maxlength: 500, default: '' },
    status: { type: String, enum: TRANSFER_STATUSES, required: true, index: true },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
    sourceReviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    sourceReviewedAt: { type: Date, default: null },
    destinationReviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    destinationReviewedAt: { type: Date, default: null },
    /** المستوى الذي وُضعت فيه الطالبة في المركز الجديد */
    toLevelId: { type: Schema.Types.ObjectId, ref: 'Level', default: null },
  },
  { timestamps: true }
);

export type TransferRequestDocument = InferSchemaType<typeof transferRequestSchema> & {
  _id: Types.ObjectId;
};

export const TransferRequest = model('TransferRequest', transferRequestSchema);
