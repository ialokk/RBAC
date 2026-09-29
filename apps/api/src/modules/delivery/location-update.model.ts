import { Schema, model } from 'mongoose';

export interface LocationUpdateDocument {
  assignmentId: Schema.Types.ObjectId;
  partnerId: Schema.Types.ObjectId;
  point: { type: 'Point'; coordinates: [number, number] };
  recordedAt: Date;
}

const locationUpdateSchema = new Schema<LocationUpdateDocument>({
  assignmentId: { type: Schema.Types.ObjectId, ref: 'DeliveryAssignment', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'DeliveryPartner', required: true, index: true },
  point: {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true },
  },
  recordedAt: { type: Date, required: true, default: Date.now },
});

locationUpdateSchema.index({ point: '2dsphere' });
// Bounded retention per docs/ERD.md §2.16 (24-48h) — MongoDB TTL index, no external cache.
locationUpdateSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 60 * 60 * 48 });

export const LocationUpdateModel = model<LocationUpdateDocument>('LocationUpdate', locationUpdateSchema);
