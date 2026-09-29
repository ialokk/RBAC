import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { notificationsService } from './notifications.service';

export const notificationsRouter = Router();

notificationsRouter.use(authenticate, requirePermission('notifications:read-own'));

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: Own notifications (foundation — real producers land in Phase 10)
 */
notificationsRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json({ items: await notificationsService.list(req.user.id) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 */
notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await notificationsService.markRead(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

const deviceTokenSchema = {
  body: z.object({ fcmToken: z.string().min(1), platform: z.enum(['WEB', 'ANDROID', 'IOS']) }).strict(),
};

/**
 * @openapi
 * /notifications/device-token:
 *   post:
 *     summary: Register an FCM device token for push notifications
 */
notificationsRouter.post('/device-token', validate(deviceTokenSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.status(201).json(await notificationsService.registerDeviceToken(req.user.id, req.body.fcmToken, req.body.platform));
  } catch (err) {
    next(err);
  }
});
