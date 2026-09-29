import { Router } from 'express';
import { UserRole } from '@rbac/shared-types';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { deliveryAssignmentsService } from './delivery-assignments.service';
import { deliveryPartnersService } from './delivery-partners.service';
import {
  applyDeliveryPartnerSchema,
  listApplicationsQuerySchema,
  locationHeartbeatSchema,
  reviewDeliveryApplicationSchema,
  setAvailabilitySchema,
  verifyDeliveryOtpSchema,
} from './delivery.validation';

export const deliveryRouter = Router();

/**
 * @openapi
 * /delivery/applications:
 *   post:
 *     summary: Submit a delivery partner onboarding application (creates a PENDING profile)
 */
deliveryRouter.post(
  '/applications',
  authenticate,
  requirePermission('delivery:apply'),
  validate(applyDeliveryPartnerSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.status(201).json(await deliveryPartnersService.apply(req.user.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/applications/me:
 *   get:
 *     summary: The current user's own delivery partner application (latest)
 */
deliveryRouter.get('/applications/me', authenticate, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryPartnersService.getOwn(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/applications:
 *   get:
 *     summary: List/filter delivery partner applications (ADMIN)
 */
deliveryRouter.get(
  '/applications',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  validate(listApplicationsQuerySchema),
  async (req, res, next) => {
    try {
      const { status, page, limit } = req.query as unknown as { status?: string; page: number; limit: number };
      res.json(await deliveryPartnersService.list(status, page, limit));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/applications/{id}:
 *   get:
 *     summary: Application details (ADMIN, or the owning applicant)
 */
deliveryRouter.get('/applications/:id', authenticate, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const partner = await deliveryPartnersService.getById(req.params.id);
    if (req.user.role !== UserRole.ADMIN && partner.userId.toString() !== req.user.id) {
      throw new HttpError(403, 'Not your application');
    }
    res.json(partner);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/applications/{id}/approve:
 *   patch:
 *     summary: Approve a pending application (ADMIN) — promotes the user to DELIVERY_PARTNER
 */
deliveryRouter.patch(
  '/applications/:id/approve',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await deliveryPartnersService.approve(req.user.id, req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/applications/{id}/reject:
 *   patch:
 *     summary: Reject a pending application (ADMIN)
 */
deliveryRouter.patch(
  '/applications/:id/reject',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  validate(reviewDeliveryApplicationSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await deliveryPartnersService.reject(req.user.id, req.params.id, req.body.reason));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/me/availability:
 *   patch:
 *     summary: Go online/offline/busy (DELIVERY_PARTNER, own)
 */
deliveryRouter.patch(
  '/me/availability',
  authenticate,
  requireRole(UserRole.DELIVERY_PARTNER),
  requirePermission('delivery:manage-own-status'),
  validate(setAvailabilitySchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await deliveryPartnersService.setAvailability(req.user.id, req.body.availability));
    } catch (err) {
      next(err);
    }
  },
);

const assignmentGuard = [
  authenticate,
  requireRole(UserRole.DELIVERY_PARTNER),
  requirePermission('delivery:assignment-accept-decline'),
];

/**
 * @openapi
 * /delivery/assignments/available:
 *   get:
 *     summary: Assignments currently offered to the caller (DELIVERY_PARTNER, own)
 */
deliveryRouter.get('/assignments/available', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json({ items: await deliveryAssignmentsService.listAvailableForPartner(req.user.id) });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/current:
 *   get:
 *     summary: The caller's current active assignment, if any (DELIVERY_PARTNER, own)
 */
deliveryRouter.get('/assignments/current', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.getCurrentForPartner(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/{id}/accept:
 *   post:
 *     summary: Accept an offered assignment (DELIVERY_PARTNER, own)
 */
deliveryRouter.post('/assignments/:id/accept', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.accept(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/{id}/decline:
 *   post:
 *     summary: Decline an offered assignment (DELIVERY_PARTNER, own)
 */
deliveryRouter.post('/assignments/:id/decline', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.decline(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/{id}/arrived-restaurant:
 *   post:
 *     summary: Mark arrived at the restaurant for pickup (DELIVERY_PARTNER, own)
 */
deliveryRouter.post('/assignments/:id/arrived-restaurant', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.arrivedAtRestaurant(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/{id}/picked-up:
 *   post:
 *     summary: Mark the order picked up from the restaurant (DELIVERY_PARTNER, own) — generates the delivery OTP
 */
deliveryRouter.post('/assignments/:id/picked-up', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.pickedUp(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/{id}/arrived-customer:
 *   post:
 *     summary: Mark arrived at the customer's delivery address (DELIVERY_PARTNER, own)
 */
deliveryRouter.post('/assignments/:id/arrived-customer', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.arrivedAtCustomer(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/assignments/{id}/verify-otp:
 *   post:
 *     summary: Verify the customer's hand-off OTP (DELIVERY_PARTNER, own)
 */
deliveryRouter.post(
  '/assignments/:id/verify-otp',
  ...assignmentGuard,
  validate(verifyDeliveryOtpSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await deliveryAssignmentsService.verifyOtp(req.user.id, req.params.id, req.body.code));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/assignments/{id}/mark-delivered:
 *   post:
 *     summary: Mark the order delivered (DELIVERY_PARTNER, own) — requires OTP already verified
 */
deliveryRouter.post('/assignments/:id/mark-delivered', ...assignmentGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await deliveryAssignmentsService.markDelivered(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /delivery/location:
 *   post:
 *     summary: Location heartbeat (DELIVERY_PARTNER, own, active assignment only)
 */
deliveryRouter.post(
  '/location',
  authenticate,
  requireRole(UserRole.DELIVERY_PARTNER),
  requirePermission('delivery:update-own-location'),
  validate(locationHeartbeatSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      await deliveryAssignmentsService.recordLocationHeartbeat(req.user.id, req.body.lat, req.body.lng);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/history:
 *   get:
 *     summary: Completed deliveries (DELIVERY_PARTNER, own)
 */
deliveryRouter.get(
  '/history',
  authenticate,
  requireRole(UserRole.DELIVERY_PARTNER),
  requirePermission('delivery:assignment-accept-decline'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 20);
      res.json(await deliveryAssignmentsService.history(req.user.id, page, limit));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/earnings:
 *   get:
 *     summary: Earnings summary (DELIVERY_PARTNER, own)
 */
deliveryRouter.get(
  '/earnings',
  authenticate,
  requireRole(UserRole.DELIVERY_PARTNER),
  requirePermission('reports:read'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await deliveryAssignmentsService.earnings(req.user.id));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/partners/{id}/suspend:
 *   patch:
 *     summary: Suspend a delivery partner (ADMIN)
 */
deliveryRouter.patch(
  '/partners/:id/suspend',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  async (req, res, next) => {
    try {
      res.json(await deliveryPartnersService.setSuspended(req.params.id, true));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /delivery/partners/{id}/activate:
 *   patch:
 *     summary: Reactivate a suspended delivery partner (ADMIN)
 */
deliveryRouter.patch(
  '/partners/:id/activate',
  authenticate,
  requireRole(UserRole.ADMIN),
  requirePermission('approvals:manage'),
  async (req, res, next) => {
    try {
      res.json(await deliveryPartnersService.setSuspended(req.params.id, false));
    } catch (err) {
      next(err);
    }
  },
);
