import { Schema, model, type InferSchemaType, type Types } from 'mongoose';

const deviceTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    centerId: { type: Schema.Types.ObjectId, ref: 'Center', default: null, index: true },
    expoPushToken: { type: String, required: true, trim: true, unique: true },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web', 'unknown'],
      default: 'unknown',
    },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ userId: 1, expoPushToken: 1 });

export type DeviceTokenDocument = InferSchemaType<typeof deviceTokenSchema> & {
  _id: Types.ObjectId;
};

export const DeviceToken = model('DeviceToken', deviceTokenSchema);
