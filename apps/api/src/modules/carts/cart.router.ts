import { Router } from 'express';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { cartService } from './cart.service';
import { addCartItemSchema, applyCouponSchema, updateCartItemSchema } from './cart.validation';

export const cartRouter = Router();

cartRouter.use(authenticate, requirePermission('cart:manage-own'));

/**
 * @openapi
 * /cart:
 *   get:
 *     summary: Current customer's active cart
 */
cartRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await cartService.getCart(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /cart/items:
 *   post:
 *     summary: Add an item to the cart (single-restaurant cart)
 */
cartRouter.post('/items', validate(addCartItemSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.status(201).json(await cartService.addItem(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /cart/items/{itemRef}:
 *   patch:
 *     summary: Update a cart item's quantity
 */
cartRouter.patch('/items/:itemRef', validate(updateCartItemSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await cartService.updateItem(req.user.id, req.params.itemRef, req.body.qty));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /cart/items/{itemRef}:
 *   delete:
 *     summary: Remove a cart item
 */
cartRouter.delete('/items/:itemRef', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await cartService.removeItem(req.user.id, req.params.itemRef));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /cart/coupon:
 *   post:
 *     summary: Apply a coupon code to the cart
 */
cartRouter.post('/coupon', validate(applyCouponSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await cartService.applyCoupon(req.user.id, req.body.code));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /cart/coupon:
 *   delete:
 *     summary: Remove the applied coupon
 */
cartRouter.delete('/coupon', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await cartService.removeCoupon(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /cart/checkout-preview:
 *   post:
 *     summary: Charges/taxes/total breakdown for the current cart
 */
cartRouter.post('/checkout-preview', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await cartService.checkoutPreview(req.user.id));
  } catch (err) {
    next(err);
  }
});
