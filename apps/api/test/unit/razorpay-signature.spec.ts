import crypto from 'crypto';
import { razorpayGateway } from '../../src/modules/payments/razorpay.gateway';

describe('razorpayGateway signature verification (unit)', () => {
  it('accepts a correctly-signed payment order/payment id pair', () => {
    const gatewayOrderId = 'order_test123';
    const gatewayPaymentId = 'pay_test456';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${gatewayOrderId}|${gatewayPaymentId}`)
      .digest('hex');

    expect(razorpayGateway.verifyPaymentSignature({ gatewayOrderId, gatewayPaymentId, signature })).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const result = razorpayGateway.verifyPaymentSignature({
      gatewayOrderId: 'order_test123',
      gatewayPaymentId: 'pay_test456',
      signature: 'not-a-real-signature',
    });
    expect(result).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', () => {
    const signature = crypto.createHmac('sha256', 'wrong-secret').update('order_test123|pay_test456').digest('hex');
    expect(
      razorpayGateway.verifyPaymentSignature({ gatewayOrderId: 'order_test123', gatewayPaymentId: 'pay_test456', signature }),
    ).toBe(false);
  });

  it('verifies a webhook body against its HMAC signature', () => {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET as string).update(rawBody).digest('hex');
    expect(razorpayGateway.verifyWebhookSignature(rawBody, signature)).toBe(true);
    expect(razorpayGateway.verifyWebhookSignature(rawBody, 'deadbeef')).toBe(false);
  });
});
