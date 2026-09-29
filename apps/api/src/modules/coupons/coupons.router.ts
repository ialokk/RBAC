import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@rbac/shared-types';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { CartModel } from '../carts/cart.model';
import { couponsService } from './coupons.service';
import { createCouponSchema, listCouponsQuerySchema, updateCouponSchema } from './coupons.validation';

export const couponsRouter = Router();

const applicableQuerySchema = { query: z.object({ cartId: z.string().optional() }) };

/**
 * @openapi
 * /coupons/applicable:
 *   get:
 *     summary: List coupons applicable to the current customer's cart
 */
couponsRouter.get(
  '/applicable',
  authenticate,
  requirePermission('coupon:apply'),
  validate(applicableQuerySchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      const cart = await CartModel.findOne({ userId: req.user.id });
      const itemsTotal = cart?.items.reduce((sum, i) => sum + i.price * i.qty, 0) ?? 0;
      const items = await couponsService.listApplicable(cart?.restaurantId?.toString(), itemsTotal);
      res.json({ items });
    } catch (err) {
      next(err);
    }
  },
);

const adminCouponGuard = [authenticate, requireRole(UserRole.ADMIN), requirePermission('coupon:manage')];

/**
 * @openapi
 * /coupons:
 *   get:
 *     summary: List all coupons (ADMIN)
 *   post:
 *     summary: Create a coupon (ADMIN)
 */
couponsRouter.get('/', ...adminCouponGuard, validate(listCouponsQuerySchema), async (req, res, next) => {
  try {
    const { page, limit, isActive } = req.query as unknown as { page: number; limit: number; isActive?: boolean };
    res.json(await couponsService.listAll(page, limit, isActive));
  } catch (err) {
    next(err);
  }
});

couponsRouter.post('/', ...adminCouponGuard, validate(createCouponSchema), async (req, res, next) => {
  try {
    res.status(201).json(await couponsService.create(req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /coupons/{id}:
 *   get:
 *     summary: Coupon detail (ADMIN)
 *   patch:
 *     summary: Update a coupon (ADMIN)
 *   delete:
 *     summary: Delete a coupon (ADMIN)
 */
couponsRouter.get('/:id', ...adminCouponGuard, async (req, res, next) => {
  try {
    res.json(await couponsService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
});

couponsRouter.patch('/:id', ...adminCouponGuard, validate(updateCouponSchema), async (req, res, next) => {
  try {
    res.json(await couponsService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
});

couponsRouter.delete('/:id', ...adminCouponGuard, async (req, res, next) => {
  try {
    await couponsService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
