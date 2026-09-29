import { Router } from 'express';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { UserRole } from '@rbac/shared-types';
import { UserModel } from './user.model';
import { usersService } from './users.service';
import { listUsersQuerySchema, setUserStatusSchema, updateOwnProfileSchema } from './users.validation';

export const usersRouter = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     summary: Search/list users (ADMIN) — customer/restaurant/delivery-partner management
 */
usersRouter.get(
  '/',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('users:manage'),
  validate(listUsersQuerySchema),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as { role?: string; status?: string; q?: string; page: number; limit: number };
      res.json(await usersService.list(query));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /users/me:
 *   get:
 *     summary: Current user's own profile
 *     responses:
 *       200:
 *         description: Own profile
 */
usersRouter.get('/me', authenticate, requirePermission('profile:read-own'), async (req, res, next) => {
  try {
    if (!req.user) {
      throw new HttpError(401, 'Authentication required');
    }
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    res.json({
      id: user.id,
      role: user.role,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      status: user.status,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/me:
 *   patch:
 *     summary: Update own profile fields (name/email) — any authenticated user
 */
usersRouter.patch(
  '/me',
  authenticate,
  requirePermission('profile:update-own'),
  validate(updateOwnProfileSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Authentication required');
      }
      const user = await usersService.updateOwnProfile(req.user.id, req.body);
      res.json({
        id: user.id,
        role: user.role,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        status: user.status,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     summary: User detail (ADMIN)
 */
usersRouter.get('/:id', authenticate, requireRole(UserRole.ADMIN), requirePermission('users:manage'), async (req, res, next) => {
  try {
    res.json(await usersService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /users/{id}/status:
 *   patch:
 *     summary: Activate/deactivate/suspend a user account (ADMIN)
 */
usersRouter.patch(
  '/:id/status',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('users:manage'),
  validate(setUserStatusSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await usersService.setStatus(req.user.id, req.params.id, req.body.status));
    } catch (err) {
      next(err);
    }
  },
);
