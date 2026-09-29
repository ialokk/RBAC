import crypto from 'crypto';
import { OrderStatus, UserRole } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { auditLogService } from '../common/audit-log.service';
import { ordersService } from '../orders/orders.service';
import { PaymentModel } from './payment.model';
import { razorpayGateway } from './razorpay.gateway';
import type { PaymentGateway } from './payment-gateway.interface';

// Single injection point for the active provider — swapping/adding a gateway (e.g. Cashfree) means
// changing this one binding, never touching the business logic below (docs/SECURITY.md §5).
const paymentGateway: PaymentGateway = razorpayGateway;

const ONLINE_METHODS = ['UPI', 'CARD', 'NETBANKING'] as const;
type OnlineMethod = (typeof ONLINE_METHODS)[number];

// If the order is still awaiting payment when a success signal (verify or webhook) arrives, move
// it forward; if some other signal already did so (race between verify() and the webhook), this is
// a no-op — idempotent by construction, never double-transitions the order.
async function confirmPaymentSuccess(orderId: string): Promise<void> {
  const order = await ordersService.findById(orderId);
  if (order.status === OrderStatus.PAYMENT_PENDING) {
    await ordersService.markPaid(orderId);
  }
}

async function confirmPaymentFailure(orderId: string): Promise<void> {
  const order = await ordersService.findById(orderId);
  if (order.status === OrderStatus.PAYMENT_PENDING) {
    await ordersService.markPaymentFailed(orderId);
  }
}

export const paymentsService = {
  // POST /payments/initiate — a separate call from order creation (docs/API-SPEC.md §12): the
  // frontend creates the order first (stays at PAYMENT_PENDING for online methods), then calls this
  // to get a gateway order to open the checkout widget with. Re-usable if a prior gateway order
  // expired; never creates more than one INITIATED/SUCCESS record per order.
  async initiate(userId: string, orderId: string, method: OnlineMethod) {
    const order = await ordersService.getByIdForCustomer(userId, orderId);
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new HttpError(409, `Order is not awaiting payment (status: ${order.status})`);
    }
    if (order.paymentMethod !== method) {
      throw new HttpError(400, 'Payment method does not match the order');
    }

    let payment = await PaymentModel.findOne({ orderId });
    if (payment?.status === 'SUCCESS') {
      throw new HttpError(409, 'Payment has already been completed for this order');
    }

    const gatewayOrder = await paymentGateway.createOrder({
      amount: order.pricing.grandTotal,
      currency: 'INR',
      receipt: orderId,
    });

    if (!payment) {
      payment = new PaymentModel({ orderId, gateway: 'RAZORPAY', method, amount: order.pricing.grandTotal });
    }
    payment.gatewayOrderId = gatewayOrder.gatewayOrderId;
    payment.status = 'INITIATED';
    await payment.save();

    return {
      paymentId: payment.id,
      gateway: payment.gateway,
      gatewayOrderId: gatewayOrder.gatewayOrderId,
      amount: gatewayOrder.amount,
      currency: gatewayOrder.currency,
    };
  },

  // POST /payments/:orderId/verify (Phase 7 addition, docs/API-SPEC.md §12) — the frontend only ever
  // triggers this "check"; the actual proof is the HMAC signature verified below, never the client's
  // say-so (docs/SECURITY.md §5).
  async verify(
    userId: string,
    orderId: string,
    input: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
  ) {
    const order = await ordersService.getByIdForCustomer(userId, orderId);
    const payment = await PaymentModel.findOne({ orderId });
    if (!payment) {
      throw new HttpError(404, 'No payment record found for this order');
    }
    if (payment.gatewayOrderId !== input.razorpayOrderId) {
      throw new HttpError(400, 'Payment reference does not match this order');
    }

    const isValid = paymentGateway.verifyPaymentSignature({
      gatewayOrderId: input.razorpayOrderId,
      gatewayPaymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!isValid) {
      payment.status = 'FAILED';
      payment.failureReason = 'Signature verification failed';
      await payment.save();
      if (order.status === OrderStatus.PAYMENT_PENDING) {
        await ordersService.markPaymentFailed(orderId);
      }
      throw new HttpError(400, 'Payment signature verification failed');
    }

    payment.gatewayPaymentId = input.razorpayPaymentId;
    payment.status = 'SUCCESS';
    payment.verifiedAt = new Date();
    await payment.save();
    await confirmPaymentSuccess(orderId);

    return payment;
  },

  async getStatus(requester: { userId: string; role: UserRole }, orderId: string) {
    if (requester.role === UserRole.ADMIN) {
      await ordersService.getByIdAdmin(orderId);
    } else {
      await ordersService.getByIdForCustomer(requester.userId, orderId);
    }
    const payment = await PaymentModel.findOne({ orderId });
    if (!payment) {
      throw new HttpError(404, 'No payment record found for this order');
    }
    return payment;
  },

  // ADMIN — search/filter for reconciliation (docs/API-SPEC.md §12), incl. `gateway=COD` to find
  // cash-on-delivery payments awaiting collection reconciliation.
  async list(page: number, limit: number, status?: string, gateway?: string) {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (gateway) filter.gateway = gateway;
    const [items, total] = await Promise.all([
      PaymentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PaymentModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  // POST /payments/webhook/:gateway — public but signature-verified; idempotent via
  // `webhookEventIds` (docs/SECURITY.md §5). `rawBody` MUST be the exact bytes Razorpay signed —
  // app.ts's json parser stashes this on req.rawBody before body-parsing.
  async handleWebhook(gatewayName: string, rawBody: Buffer, signature: string | undefined) {
    if (gatewayName !== 'razorpay') {
      throw new HttpError(404, 'Unknown payment gateway');
    }
    if (!signature || !paymentGateway.verifyWebhookSignature(rawBody, signature)) {
      throw new HttpError(400, 'Invalid webhook signature');
    }

    // Idempotency key: hash of the exact payload bytes, so a byte-identical redelivery (Razorpay
    // retries on non-2xx or timeout) is recognized as the same event even without a stable event id.
    const eventId = crypto.createHash('sha256').update(rawBody).digest('hex');
    const event = JSON.parse(rawBody.toString('utf8')) as {
      event?: string;
      payload?: {
        payment?: { entity?: { id?: string; order_id?: string; error_description?: string } };
        refund?: { entity?: { id?: string; payment_id?: string; status?: string } };
      };
    };

    const paymentEntity = event.payload?.payment?.entity;
    const refundEntity = event.payload?.refund?.entity;
    const gatewayOrderId = paymentEntity?.order_id;
    const gatewayPaymentId = paymentEntity?.id ?? refundEntity?.payment_id;

    const payment = await PaymentModel.findOne({
      $or: [{ gatewayOrderId: gatewayOrderId ?? '__none__' }, { gatewayPaymentId: gatewayPaymentId ?? '__none__' }],
    });
    if (!payment) {
      // Unknown/unrelated order (e.g. a different Razorpay account/test event) — ack without error.
      return { received: true, matched: false };
    }
    if (payment.webhookEventIds.includes(eventId)) {
      return { received: true, duplicate: true };
    }
    payment.webhookEventIds.push(eventId);

    switch (event.event) {
      case 'payment.captured':
        payment.gatewayPaymentId = paymentEntity?.id ?? payment.gatewayPaymentId;
        payment.status = 'SUCCESS';
        payment.verifiedAt = new Date();
        await payment.save();
        await confirmPaymentSuccess(payment.orderId.toString());
        break;
      case 'payment.failed':
        payment.gatewayPaymentId = paymentEntity?.id ?? payment.gatewayPaymentId;
        payment.status = 'FAILED';
        payment.failureReason = paymentEntity?.error_description ?? 'Payment failed at gateway';
        await payment.save();
        await confirmPaymentFailure(payment.orderId.toString());
        break;
      case 'refund.processed': {
        const refundEntry = payment.refunds.find((r) => r.gatewayRefundId === refundEntity?.id);
        if (refundEntry) {
          refundEntry.status = 'PROCESSED';
        }
        payment.status = 'REFUNDED';
        await payment.save();
        const order = await ordersService.findById(payment.orderId.toString());
        if (order.status === OrderStatus.REFUND_PENDING) {
          await ordersService.markRefunded(payment.orderId.toString());
        }
        break;
      }
      default:
        // Unhandled event type — still persist the eventId above so a redelivery is a no-op.
        await payment.save();
    }

    return { received: true, matched: true };
  },

  // ADMIN — never customer-triggered directly (docs/SECURITY.md §5: "Refunds only initiated by
  // Admin action or automated refund workflow").
  async refund(adminUserId: string, paymentId: string, amount: number | undefined, reason: string) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw new HttpError(404, 'Payment not found');
    }
    const refundAmount = amount ?? payment.amount;

    if (payment.gateway === 'COD') {
      // No gateway call for cash collected on delivery — this is a manual reconciliation record.
      payment.refunds.push({ amount: refundAmount, reason, status: 'PROCESSED', at: new Date() });
      payment.status = 'REFUNDED';
      await payment.save();
      await ordersService.markRefunded(payment.orderId.toString());
      await auditLogService.record({
        actorUserId: adminUserId,
        action: 'PAYMENT_REFUND_COD',
        targetType: 'payment',
        targetId: paymentId,
        metadata: { amount: refundAmount, reason },
      });
      return payment;
    }

    if (payment.status !== 'SUCCESS' && payment.status !== 'REFUND_PENDING') {
      throw new HttpError(409, `Cannot refund a payment with status ${payment.status}`);
    }
    if (!payment.gatewayPaymentId) {
      throw new HttpError(409, 'No gateway payment id recorded for this payment');
    }

    payment.status = 'REFUND_PENDING';
    await payment.save();

    const result = await paymentGateway.refund({ gatewayPaymentId: payment.gatewayPaymentId, amount: refundAmount, reason });

    payment.refunds.push({ amount: refundAmount, reason, gatewayRefundId: result.gatewayRefundId, status: 'PENDING', at: new Date() });
    if (result.status === 'processed') {
      const refundEntry = payment.refunds[payment.refunds.length - 1];
      refundEntry.status = 'PROCESSED';
      payment.status = 'REFUNDED';
    }
    await payment.save();

    if (payment.status === 'REFUNDED') {
      await ordersService.markRefunded(payment.orderId.toString());
    }

    await auditLogService.record({
      actorUserId: adminUserId,
      action: 'PAYMENT_REFUND',
      targetType: 'payment',
      targetId: paymentId,
      metadata: { amount: refundAmount, reason, gatewayRefundId: result.gatewayRefundId, status: payment.status },
    });

    return payment;
  },

  // Composition point (router calls this right after `ordersService.createFromCart` for COD
  // orders, mirroring the delivery/orders composition pattern) — gives every COD order a payment
  // record to reconcile against, since cash is only actually collected at hand-off, not at
  // placement. Kept idempotent: a second call for the same order just returns the existing record.
  async recordCodPayment(orderId: string, amount: number) {
    const existing = await PaymentModel.findOne({ orderId });
    if (existing) return existing;
    return PaymentModel.create({ orderId, gateway: 'COD', method: 'COD', amount, status: 'INITIATED' });
  },

  // ADMIN — marks cash collected by the delivery partner as reconciled/settled (docs/API-SPEC.md
  // §12/§16: "COD reconciliation"). Distinct from `refund`, which pays money back out.
  async reconcileCod(adminUserId: string, paymentId: string) {
    const payment = await PaymentModel.findById(paymentId);
    if (!payment) {
      throw new HttpError(404, 'Payment not found');
    }
    if (payment.gateway !== 'COD') {
      throw new HttpError(409, 'Only Cash on Delivery payments can be reconciled this way');
    }
    if (payment.status === 'SUCCESS') {
      throw new HttpError(409, 'This payment has already been reconciled');
    }
    payment.status = 'SUCCESS';
    payment.verifiedAt = new Date();
    await payment.save();

    await auditLogService.record({
      actorUserId: adminUserId,
      action: 'PAYMENT_RECONCILE_COD',
      targetType: 'payment',
      targetId: paymentId,
      metadata: { amount: payment.amount },
    });

    return payment;
  },
};
