import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { HttpError } from '../common/http-error';
import type { GatewayRefund, PaymentGateway } from './payment-gateway.interface';

const client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });

function timingSafeHexEqual(expectedHex: string, providedHex: string): boolean {
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const provided = Buffer.from(providedHex, 'hex');
    if (expected.length === 0 || expected.length !== provided.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

export const razorpayGateway: PaymentGateway = {
  name: 'RAZORPAY',

  async createOrder({ amount, currency, receipt }) {
    try {
      const order = await client.orders.create({ amount, currency, receipt });
      return { gatewayOrderId: order.id, amount: Number(order.amount), currency: order.currency };
    } catch {
      throw new HttpError(502, 'Failed to create payment order with the payment gateway');
    }
  },

  verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, signature }): boolean {
    const expected = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');
    return timingSafeHexEqual(expected, signature);
  },

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return timingSafeHexEqual(expected, signature);
  },

  async refund({ gatewayPaymentId, amount, reason }): Promise<GatewayRefund> {
    try {
      const refund = await client.payments.refund(gatewayPaymentId, { amount, notes: { reason } });
      return { gatewayRefundId: refund.id, status: refund.status as GatewayRefund['status'] };
    } catch {
      throw new HttpError(502, 'Failed to process refund with the payment gateway');
    }
  },
};
