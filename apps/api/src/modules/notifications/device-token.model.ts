import { Schema, model } from 'mongoose';

export interface DeviceTokenDocument {
  userId: Schema.Types.ObjectId;
  fcmToken: string;
  platform: 'WEB' | 'ANDROID' | 'IOS';
  lastSeenAt: Date;
}

const deviceTokenSchema = new Schema<DeviceTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fcmToken: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['WEB', 'ANDROID', 'IOS'], required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const DeviceTokenModel = model<DeviceTokenDocument>('DeviceToken', deviceTokenSchema);
