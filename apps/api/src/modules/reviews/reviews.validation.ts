import { z } from 'zod';

export const createReviewSchema = {
  body: z
    .object({
      orderId: z.string().min(1),
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().max(1000).optional(),
      deliveryPartnerRating: z.coerce.number().int().min(1).max(5).optional(),
    })
    .strict(),
};
