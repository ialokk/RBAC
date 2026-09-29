import crypto from 'crypto';
import request from 'supertest';
import type { Express } from 'express';
import { UserRole, OrderStatus } from '@rbac/shared-types';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { createTestUser } from '../utils/auth';
import { seedCheckoutFixture } from '../utils/seed';
import { PaymentModel } from '../../src/modules/payments/payment.model';
import { OrderModel } from '../../src/modules/orders/order.model';

function signWebhook(rawBody: Buffer): string {
  return crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET as string).update(rawBody).digest('hex');
}

describe('Payment webhook — signature verification + idempotency (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  async function seedOnlineOrder() {
    const { user: customer, token: customerToken } = await createTestUser(UserRole.CUSTOMER);
    const { user: restaurantOwner } = await createTestUser(UserRole.RESTAURANT);
    const { address } = await seedCheckoutFixture(customer.id, restaurantOwner.id);

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'UPI' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('PAYMENT_PENDING');
    const orderId: string = createRes.body._id ?? createRes.body.id;

    // Bypasses the real Razorpay `orders.create` network call (no live credentials in this
    // environment) — simulates the outcome of a successful POST /payments/initiate by writing
    // the Payment record `initiate()` would have produced, so the webhook path under test is
    // exactly what production code executes for an inbound Razorpay delivery.
    const payment = await PaymentModel.create({
      orderId,
      gateway: 'RAZORPAY',
      method: 'UPI',
      gatewayOrderId: 'order_test_1',
      amount: 50000,
      status: 'INITIATED',
    });

    return { orderId, payment };
  }

  it('verifies the signature, marks the payment SUCCESS, and moves the order to PAID', async () => {
    const { orderId } = await seedOnlineOrder();

    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_1', order_id: 'order_test_1' } } },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = signWebhook(rawBody);

    const res = await request(app)
      .post('/api/v1/payments/webhook/razorpay')
      .set('x-razorpay-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.matched).toBe(true);

    const payment = await PaymentModel.findOne({ gatewayOrderId: 'order_test_1' });
    expect(payment?.status).toBe('SUCCESS');

    const order = await OrderModel.findById(orderId);
    // Post-Phase-13 integration fix: markPaid() now chains straight through to RESTAURANT_PENDING,
    // the same way the COD branch of createFromCart does — an online-paid order must become
    // visible to the restaurant immediately, never stall at PAID.
    expect(order?.status).toBe(OrderStatus.RESTAURANT_PENDING);
  });

  it('rejects a webhook with an invalid signature', async () => {
    await seedOnlineOrder();
    const payload = { event: 'payment.captured', payload: { payment: { entity: { id: 'x', order_id: 'order_test_1' } } } };

    const res = await request(app)
      .post('/api/v1/payments/webhook/razorpay')
      .set('x-razorpay-signature', 'deadbeef')
      .send(payload);

    expect(res.status).toBe(400);
    const payment = await PaymentModel.findOne({ gatewayOrderId: 'order_test_1' });
    expect(payment?.status).toBe('INITIATED');
  });

  it('is idempotent — a byte-identical redelivery is a no-op the second time', async () => {
    await seedOnlineOrder();
    const payload = {
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_test_1', order_id: 'order_test_1' } } },
    };
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = signWebhook(rawBody);

    const first = await request(app).post('/api/v1/payments/webhook/razorpay').set('x-razorpay-signature', signature).send(payload);
    expect(first.body.duplicate).toBeFalsy();

    const second = await request(app).post('/api/v1/payments/webhook/razorpay').set('x-razorpay-signature', signature).send(payload);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);

    const payment = await PaymentModel.findOne({ gatewayOrderId: 'order_test_1' });
    expect(payment?.webhookEventIds.length).toBe(1);
  });
});
