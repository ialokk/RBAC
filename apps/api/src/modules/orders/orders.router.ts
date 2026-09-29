import { Router } from 'express';
import { UserRole } from '@rbac/shared-types';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { auditLogService } from '../common/audit-log.service';
import { orderCreateLimiter } from '../common/rate-limit';
import { deliveryAssignmentsService } from '../delivery/delivery-assignments.service';
import { LocationUpdateModel } from '../delivery/location-update.model';
import { paymentsService } from '../payments/payments.service';
import { ordersService } from './orders.service';
import {
  cancelOrderSchema,
  createOrderSchema,
  listOrdersQuerySchema,
  rejectOrderSchema,
  setPrepTimeSchema,
} from './orders.validation';

export const ordersRouter = Router();

ordersRouter.use(authenticate);

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Place an order from the current cart
 */
ordersRouter.post('/', orderCreateLimiter, requirePermission('order:create'), validate(createOrderSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const order = await ordersService.createFromCart(req.user.id, req.body);
    if (order.paymentMethod === 'COD') {
      // Composition point: cash is only actually collected at hand-off, so COD still gets a
      // Payment record to reconcile against later (Phase 9 admin "COD reconciliation").
      await paymentsService.recordCodPayment(order.id, order.pricing.grandTotal);
    }
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Own order history (paginated) — customer's own orders, or the caller's own
 *       restaurant's orders when the account role is RESTAURANT
 */
ordersRouter.get('/', requirePermission('order:read-own'), validate(listOrdersQuerySchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const { page, limit, status } = req.query as unknown as { page: number; limit: number; status?: string };
    if (req.user.role === UserRole.ADMIN) {
      res.json(await ordersService.listAll(page, limit, status));
      return;
    }
    if (req.user.role === UserRole.RESTAURANT) {
      res.json(await ordersService.listForRestaurant(req.user.id, page, limit, status));
      return;
    }
    res.json(await ordersService.list(req.user.id, page, limit));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/summary:
 *   get:
 *     summary: Restaurant dashboard summary (today's orders/revenue + counts per status group)
 */
ordersRouter.get(
  '/summary',
  requireRole(UserRole.RESTAURANT),
  requirePermission('order:read-own'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await ordersService.dashboardSummary(req.user.id));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /orders/current:
 *   get:
 *     summary: Current (in-progress) order, if any
 */
ordersRouter.get('/current', requirePermission('order:read-own'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await ordersService.current(req.user.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Order details (own — customer's own order, or the caller's own restaurant's order)
 */
ordersRouter.get('/:id', requirePermission('order:read-own'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    if (req.user.role === UserRole.ADMIN) {
      res.json(await ordersService.getByIdAdmin(req.params.id));
      return;
    }
    if (req.user.role === UserRole.RESTAURANT) {
      res.json(await ordersService.getByIdForRestaurant(req.user.id, req.params.id));
      return;
    }
    res.json(await ordersService.getByIdForCustomer(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/{id}/cancel:
 *   post:
 *     summary: Cancel an order (allowed while pre-preparing)
 */
ordersRouter.post('/:id/cancel', requirePermission('order:cancel-own'), validate(cancelOrderSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    if (req.user.role === UserRole.ADMIN) {
      res.json(await ordersService.cancelByAdmin(req.user.id, req.params.id, req.body.reason));
      return;
    }
    res.json(await ordersService.cancel(req.user.id, req.params.id, req.body.reason));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/{id}/reassign-delivery:
 *   post:
 *     summary: Force a fresh delivery-partner match for an order stuck at DELIVERY_ASSIGNED (ADMIN)
 */
ordersRouter.post(
  '/:id/reassign-delivery',
  requireRole(UserRole.ADMIN),
  requirePermission('order:reassign-delivery'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      const result = await deliveryAssignmentsService.reassign(req.params.id);
      await auditLogService.record({
        actorUserId: req.user.id,
        action: 'ORDER_REASSIGN_DELIVERY',
        targetType: 'order',
        targetId: req.params.id,
        metadata: result,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /orders/{id}/reorder:
 *   post:
 *     summary: Re-add a past order's still-available items to the cart
 */
ordersRouter.post('/:id/reorder', requirePermission('order:create'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await ordersService.reorder(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

const restaurantOrderGuard = [requireRole(UserRole.RESTAURANT), requirePermission('order:accept-reject')];

/**
 * @openapi
 * /orders/{id}/restaurant-accept:
 *   post:
 *     summary: Accept an order (RESTAURANT, own order only)
 */
ordersRouter.post('/:id/restaurant-accept', ...restaurantOrderGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await ordersService.acceptOrder(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/{id}/restaurant-reject:
 *   post:
 *     summary: Reject an order with a reason (RESTAURANT, own order only)
 */
ordersRouter.post(
  '/:id/restaurant-reject',
  ...restaurantOrderGuard,
  validate(rejectOrderSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await ordersService.rejectOrder(req.user.id, req.params.id, req.body.reason));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /orders/{id}/set-prep-time:
 *   post:
 *     summary: Set the preparation time in minutes (RESTAURANT, own order only)
 */
ordersRouter.post(
  '/:id/set-prep-time',
  ...restaurantOrderGuard,
  validate(setPrepTimeSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await ordersService.setPrepTime(req.user.id, req.params.id, req.body.prepTimeMinutes));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /orders/{id}/mark-preparing:
 *   post:
 *     summary: Move an accepted order into preparation (RESTAURANT, own order only)
 */
ordersRouter.post('/:id/mark-preparing', ...restaurantOrderGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await ordersService.markPreparing(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/{id}/mark-ready:
 *   post:
 *     summary: Mark an order ready for pickup (RESTAURANT, own order only)
 */
ordersRouter.post('/:id/mark-ready', ...restaurantOrderGuard, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const order = await ordersService.markReady(req.user.id, req.params.id);
    // Assignment engine (Phase 6): matches the nearest AVAILABLE partners and broadcasts offers.
    // This is assignment round 1; node-cron runs the remaining rounds and auto-cancels the order if
    // every round is exhausted without a partner (docs/ORDER-STATE-MACHINE.md §4-6).
    await deliveryAssignmentsService.runAssignmentRound(order.id);
    res.json(await ordersService.getByIdForRestaurant(req.user.id, req.params.id));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /orders/{id}/tracking:
 *   get:
 *     summary: Status + partner location snapshot for live tracking (order/assignment ids to join Socket.IO rooms)
 */
ordersRouter.get('/:id/tracking', requirePermission('order:read-own'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    const order = await ordersService.getByIdForCustomer(req.user.id, req.params.id);
    const assignmentId = await deliveryAssignmentsService.findCurrentAssignmentIdForOrder(order.id);
    const lastLocation = assignmentId
      ? await LocationUpdateModel.findOne({ assignmentId }).sort({ recordedAt: -1 })
      : null;
    res.json({
      orderId: order.id,
      status: order.status,
      statusHistory: order.statusHistory,
      assignedDeliveryPartnerId: order.assignedDeliveryPartnerId ?? null,
      assignmentId,
      partnerLocation: lastLocation ? { lat: lastLocation.point.coordinates[1], lng: lastLocation.point.coordinates[0] } : null,
    });
  } catch (err) {
    next(err);
  }
});
