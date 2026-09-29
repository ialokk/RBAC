import { Router } from 'express';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { UserRole } from '@rbac/shared-types';
import { restaurantApplicationsService } from './restaurant-applications.service';
import {
  createRestaurantApplicationSchema,
  listApplicationsQuerySchema,
  reviewApplicationSchema,
} from './restaurant-applications.validation';

export const restaurantApplicationsRouter = Router();

/**
 * @openapi
 * /restaurant-applications:
 *   post:
 *     summary: Submit a restaurant onboarding application (creates a PENDING profile)
 */
restaurantApplicationsRouter.post(
  '/',
  authenticate,
  requirePermission('restaurant:apply'),
  validate(createRestaurantApplicationSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      const application = await restaurantApplicationsService.create(req.user.id, req.body);
      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurant-applications/me:
 *   get:
 *     summary: The current user's own restaurant application (latest)
 */
restaurantApplicationsRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await restaurantApplicationsService.getOwn(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurant-applications:
 *   get:
 *     summary: List/filter restaurant applications (ADMIN)
 */
restaurantApplicationsRouter.get(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  validate(listApplicationsQuerySchema),
  async (req, res, next) => {
    try {
      const { status, page, limit } = req.query as unknown as {
        status?: 'PENDING' | 'APPROVED' | 'REJECTED';
        page: number;
        limit: number;
      };
      res.json(await restaurantApplicationsService.list(status, page, limit));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurant-applications/{id}:
 *   get:
 *     summary: Application details (ADMIN, or the owning applicant)
 */
restaurantApplicationsRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const application = await restaurantApplicationsService.getById(req.params.id);
    if (req.user.role !== UserRole.ADMIN && application.applicantUserId.toString() !== req.user.id) {
      throw new HttpError(403, 'Not your application');
    }
    res.json(application);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /restaurant-applications/{id}/approve:
 *   patch:
 *     summary: Approve a pending application (ADMIN) — creates the restaurant and promotes the user to RESTAURANT
 */
restaurantApplicationsRouter.patch(
  '/:id/approve',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await restaurantApplicationsService.approve(req.user.id, req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /restaurant-applications/{id}/reject:
 *   patch:
 *     summary: Reject a pending application (ADMIN)
 */
restaurantApplicationsRouter.patch(
  '/:id/reject',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  validate(reviewApplicationSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await restaurantApplicationsService.reject(req.user.id, req.params.id, req.body.reason));
    } catch (err) {
      next(err);
    }
  },
);
