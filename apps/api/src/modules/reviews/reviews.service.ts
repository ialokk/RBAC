import { OrderStatus } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { OrderModel } from '../orders/order.model';
import { RestaurantModel } from '../restaurants/restaurant.model';
import { ReviewModel } from './review.model';

export interface CreateReviewInput {
  orderId: string;
  rating: number;
  comment?: string;
  deliveryPartnerRating?: number;
}

export const reviewsService = {
  async create(userId: string, input: CreateReviewInput) {
    const order = await OrderModel.findOne({ _id: input.orderId, customerId: userId });
    if (!order) {
      throw new HttpError(404, 'Order not found');
    }
    if (order.status !== OrderStatus.DELIVERED) {
      throw new HttpError(409, 'You can only review a delivered order');
    }

    const existing = await ReviewModel.findOne({ orderId: order.id });
    if (existing) {
      throw new HttpError(409, 'This order has already been reviewed');
    }

    const review = await ReviewModel.create({
      orderId: order.id,
      customerId: userId,
      restaurantId: order.restaurantId,
      rating: input.rating,
      comment: input.comment,
      deliveryPartnerRating: input.deliveryPartnerRating,
    });

    const stats = await ReviewModel.aggregate<{ _id: null; avg: number; count: number }>([
      { $match: { restaurantId: order.restaurantId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    if (stats[0]) {
      await RestaurantModel.updateOne(
        { _id: order.restaurantId },
        { $set: { 'rating.avg': Math.round(stats[0].avg * 10) / 10, 'rating.count': stats[0].count } },
      );
    }

    return review;
  },

  async listForRestaurant(restaurantId: string, page: number, limit: number) {
    const filter = { restaurantId };
    const [items, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ReviewModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },
};
