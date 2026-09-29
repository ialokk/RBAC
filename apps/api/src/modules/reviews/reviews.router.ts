import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { reviewsService } from './reviews.service';
import { createReviewSchema } from './reviews.validation';

export const reviewsRouter = Router();

/**
 * @openapi
 * /reviews:
 *   post:
 *     summary: Review a delivered order (one review per order)
 */
reviewsRouter.post(
  '/',
  authenticate,
  requirePermission('review:create-own-order'),
  validate(createReviewSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.status(201).json(await reviewsService.create(req.user.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

// Mounted separately at /restaurants/:restaurantId/reviews (public) — see app.ts.
export const restaurantReviewsRouter = Router({ mergeParams: true });

const listQuerySchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

/**
 * @openapi
 * /restaurants/{restaurantId}/reviews:
 *   get:
 *     summary: Public reviews for a restaurant
 */
restaurantReviewsRouter.get('/', validate(listQuerySchema), async (req, res, next) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    res.json(await reviewsService.listForRestaurant(restaurantId, page, limit));
  } catch (err) {
    next(err);
  }
});
