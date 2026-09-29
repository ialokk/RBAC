import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { UserRole } from '@rbac/shared-types';
import { restaurantsService } from './restaurants.service';
import { setOpenStatusSchema, updateOwnRestaurantSchema } from './restaurants.validation';

export const restaurantsRouter = Router();

const listQuerySchema = {
  query: z.object({
    q: z.string().max(200).optional(),
    cuisine: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

/**
 * @openapi
 * /restaurants:
 *   get:
 *     summary: Search/list approved restaurants (public)
 */
restaurantsRouter.get('/', validate(listQuerySchema), async (req, res, next) => {
  try {
    const query = req.query as unknown as { q?: string; cuisine?: string; page: number; limit: number };
    res.json(await restaurantsService.list(query));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/me:
 *   get:
 *     summary: The current restaurant owner's own restaurant profile
 */
restaurantsRouter.get(
  '/me',
  authenticate,
  requireRole(UserRole.RESTAURANT),
  requirePermission('restaurant:manage-own'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await restaurantsService.getOwnRestaurantOrThrow(req.user.id));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurants/me:
 *   patch:
 *     summary: Update the current restaurant owner's own restaurant profile
 */
restaurantsRouter.patch(
  '/me',
  authenticate,
  requireRole(UserRole.RESTAURANT),
  requirePermission('restaurant:manage-own'),
  validate(updateOwnRestaurantSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await restaurantsService.updateOwn(req.user.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurants/me/open-status:
 *   patch:
 *     summary: Toggle whether the restaurant is currently accepting orders
 */
restaurantsRouter.patch(
  '/me/open-status',
  authenticate,
  requireRole(UserRole.RESTAURANT),
  requirePermission('restaurant:manage-own'),
  validate(setOpenStatusSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await restaurantsService.setOpenStatus(req.user.id, req.body.isOpen));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurants/admin/all:
 *   get:
 *     summary: List restaurants of any status, including SUSPENDED (ADMIN) — post-Phase-13 admin UI addition
 */
restaurantsRouter.get(
  '/admin/all',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('restaurant:manage-own'),
  validate({ query: z.object({ status: z.string().optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as { status?: string; page: number; limit: number };
      res.json(await restaurantsService.listAdmin(query));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurants/{id}:
 *   get:
 *     summary: Restaurant details (public)
 */
restaurantsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await restaurantsService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurants/{id}/suspend:
 *   patch:
 *     summary: Suspend a restaurant (ADMIN)
 */
restaurantsRouter.patch(
  '/:id/suspend',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('restaurant:manage-own'),
  async (req, res, next) => {
    try {
      res.json(await restaurantsService.setSuspended(req.params.id, true));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurants/{id}/activate:
 *   patch:
 *     summary: Reactivate a suspended restaurant (ADMIN)
 */
restaurantsRouter.patch(
  '/:id/activate',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('restaurant:manage-own'),
  async (req, res, next) => {
    try {
      res.json(await restaurantsService.setSuspended(req.params.id, false));
    } catch (err) {
      next(err);
    }
  },
);
