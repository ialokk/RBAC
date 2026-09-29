import { Schema, model, type HydratedDocument } from 'mongoose';

export interface NotificationDocument {
  userId: Schema.Types.ObjectId;
  channel: 'PUSH' | 'SMS' | 'EMAIL' | 'IN_APP';
  type: string;
  payload: Record<string, unknown>;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  failureReason?: string;
  attempts: number;
  readAt?: Date;
}

export type NotificationHydratedDocument = HydratedDocument<NotificationDocument>;

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    channel: { type: String, enum: ['PUSH', 'SMS', 'EMAIL', 'IN_APP'], required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED'], default: 'QUEUED', index: true },
    failureReason: { type: String },
    attempts: { type: Number, default: 0 },
    readAt: { type: Date },
  },
  { timestamps: true },
);

export const NotificationModel = model<NotificationDocument>('Notification', notificationSchema);
