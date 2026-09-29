import { Schema, model } from 'mongoose';

export interface CouponDocument {
  code: string;
  discountType: 'PERCENT' | 'FLAT';
  value: number;
  maxDiscount?: number;
  minOrderValue: number;
  validFrom: Date;
  validTo: Date;
  usageLimitPerUser: number;
  totalUsageLimit: number;
  totalUsageCount: number;
  applicableRestaurantIds: Schema.Types.ObjectId[];
  isActive: boolean;
}

const couponSchema = new Schema<CouponDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    minOrderValue: { type: Number, default: 0 },
    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    usageLimitPerUser: { type: Number, default: 1 },
    totalUsageLimit: { type: Number, default: 0 },
    totalUsageCount: { type: Number, default: 0 },
    applicableRestaurantIds: { type: [Schema.Types.ObjectId], ref: 'Restaurant', default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const CouponModel = model<CouponDocument>('Coupon', couponSchema);
