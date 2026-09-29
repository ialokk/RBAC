import { Schema, model } from 'mongoose';

export interface RestaurantDocument {
  ownerUserId: Schema.Types.ObjectId;
  applicationId?: Schema.Types.ObjectId;
  name: string;
  description?: string;
  cuisines: string[];
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
    geo?: { type: 'Point'; coordinates: [number, number] };
  };
  status: 'APPROVED' | 'SUSPENDED';
  isOpen: boolean;
  avgPrepTimeMinutes: number;
  rating: { avg: number; count: number };
  commissionPercent: number;
}

const restaurantSchema = new Schema<RestaurantDocument>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'RestaurantApplication' },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, maxlength: 2000 },
    cuisines: { type: [String], default: [] },
    address: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      geo: {
        type: { type: String, enum: ['Point'] },
        coordinates: { type: [Number], default: undefined },
      },
    },
    status: { type: String, enum: ['APPROVED', 'SUSPENDED'], default: 'APPROVED' },
    isOpen: { type: Boolean, default: true },
    avgPrepTimeMinutes: { type: Number, default: 30 },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    commissionPercent: { type: Number, default: 15 },
  },
  { timestamps: true },
);

restaurantSchema.index({ name: 'text', cuisines: 'text' });
restaurantSchema.index({ 'address.geo': '2dsphere' });

export const RestaurantModel = model<RestaurantDocument>('Restaurant', restaurantSchema);
