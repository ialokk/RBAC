import { Router } from 'express';
import { UserRole } from '@rbac/shared-types';
import { authenticate } from '../common/authenticate.middleware';
import { requirePermission } from '../common/require-permission.middleware';
import { requireRole } from '../common/require-role.middleware';
import { validate } from '../common/validate.middleware';
import { HttpError } from '../common/http-error';
import { paymentInitiateLimiter } from '../common/rate-limit';
import { paymentsService } from './payments.service';
import {
  initiatePaymentSchema,
  listPaymentsQuerySchema,
  refundPaymentSchema,
  verifyPaymentSchema,
} from './payments.validation';

export const paymentsRouter = Router();

/**
 * @openapi
 * /payments/webhook/{gateway}:
 *   post:
 *     summary: Provider webhook (public, signature-verified, idempotent) — mounted before auth
 */
paymentsRouter.post('/webhook/:gateway', async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const result = await paymentsService.handleWebhook(
      req.params.gateway,
      rawBody,
      typeof signature === 'string' ? signature : undefined,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

paymentsRouter.use(authenticate);

/**
 * @openapi
 * /payments/initiate:
 *   post:
 *     summary: Create a gateway order for an order awaiting online payment (CUSTOMER, own order)
 */
paymentsRouter.post(
  '/initiate',
  paymentInitiateLimiter,
  requirePermission('payment:initiate'),
  validate(initiatePaymentSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.status(201).json(await paymentsService.initiate(req.user.id, req.body.orderId, req.body.method));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /payments/{orderId}/verify:
 *   post:
 *     summary: Server-side verification of a client-reported gateway payment (CUSTOMER, own order) —
 *       Phase 7 addition, docs/API-SPEC.md §12
 */
paymentsRouter.post(
  '/:orderId/verify',
  requirePermission('payment:initiate'),
  validate(verifyPaymentSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(
        await paymentsService.verify(req.user.id, req.params.orderId, {
          razorpayOrderId: req.body.razorpayOrderId,
          razorpayPaymentId: req.body.razorpayPaymentId,
          razorpaySignature: req.body.razorpaySignature,
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /payments/{orderId}/status:
 *   get:
 *     summary: Payment status for an order (CUSTOMER own, ADMIN any)
 */
paymentsRouter.get('/:orderId/status', requirePermission('order:read-own'), async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, 'Authentication required');
    res.json(await paymentsService.getStatus({ userId: req.user.id, role: req.user.role }, req.params.orderId));
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /payments/{id}/refund:
 *   post:
 *     summary: Refund a payment, full or partial (ADMIN)
 */
paymentsRouter.post(
  '/:id/refund',
  requireRole(UserRole.ADMIN),
  requirePermission('payment:refund'),
  validate(refundPaymentSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await paymentsService.refund(req.user.id, req.params.id, req.body.amount, req.body.reason));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /payments/{id}/reconcile-cod:
 *   post:
 *     summary: Mark a Cash-on-Delivery payment as collected/reconciled (ADMIN)
 */
paymentsRouter.post(
  '/:id/reconcile-cod',
  requireRole(UserRole.ADMIN),
  requirePermission('payment:reconcile-cod'),
  async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'Authentication required');
      res.json(await paymentsService.reconcileCod(req.user.id, req.params.id));
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /payments:
 *   get:
 *     summary: Search/filter payments — failed payments, COD reconciliation (ADMIN)
 */
paymentsRouter.get(
  '/',
  requireRole(UserRole.ADMIN),
  requirePermission('payment:read-all'),
  validate(listPaymentsQuerySchema),
  async (req, res, next) => {
    try {
      const { page, limit, status, gateway } = req.query as unknown as {
        page: number;
        limit: number;
        status?: string;
        gateway?: string;
      };
      res.json(await paymentsService.list(page, limit, status, gateway));
    } catch (err) {
      next(err);
    }
  },
);
