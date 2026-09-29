import { Schema, model } from 'mongoose';

export interface ReviewDocument {
  orderId: Schema.Types.ObjectId;
  customerId: Schema.Types.ObjectId;
  restaurantId: Schema.Types.ObjectId;
  rating: number;
  comment?: string;
  deliveryPartnerRating?: number;
}

const reviewSchema = new Schema<ReviewDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    deliveryPartnerRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

export const ReviewModel = model<ReviewDocument>('Review', reviewSchema);
