import request from 'supertest';
import type { Express } from 'express';
import { OrderStatus, UserRole } from '@rbac/shared-types';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { createTestUser } from '../utils/auth';
import { seedCheckoutFixture } from '../utils/seed';
import { UserModel } from '../../src/modules/users/user.model';
import { DeliveryPartnerModel } from '../../src/modules/delivery/delivery-partner.model';
import { OrderModel } from '../../src/modules/orders/order.model';
import { DeliveryAssignmentModel } from '../../src/modules/delivery/delivery-assignment.model';
import { AuditLogModel } from '../../src/modules/common/audit-log.model';
import { deliveryAssignmentsService } from '../../src/modules/delivery/delivery-assignments.service';
import { env } from '../../src/config/env';

// Deterministic "zero eligible delivery partners" scenario: the restaurant marks the order ready
// but nobody is AVAILABLE, so every assignment round fails and the order must end up cancelled
// rather than stuck at READY_FOR_PICKUP forever.
describe('Delivery assignment failure — retry rounds then auto-cancellation (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  async function placeReadyOrder(): Promise<string> {
    const { user: customer, token: customerToken } = await createTestUser(UserRole.CUSTOMER);
    const { user: restaurantOwner, token: restaurantToken } = await createTestUser(UserRole.RESTAURANT);
    const { restaurant, address } = await seedCheckoutFixture(customer.id, restaurantOwner.id);
    await UserModel.findByIdAndUpdate(restaurantOwner.id, { restaurantId: restaurant._id });

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'COD' });
    const orderId: string = createRes.body._id ?? createRes.body.id;

    await request(app).post(`/api/v1/orders/${orderId}/restaurant-accept`).set('Authorization', `Bearer ${restaurantToken}`);
    await request(app).post(`/api/v1/orders/${orderId}/mark-preparing`).set('Authorization', `Bearer ${restaurantToken}`);
    await request(app).post(`/api/v1/orders/${orderId}/mark-ready`).set('Authorization', `Bearer ${restaurantToken}`);
    return orderId;
  }

  it('keeps retrying without cancelling while attempts remain, then cancels and refunds once exhausted', async () => {
    const orderId = await placeReadyOrder();

    // mark-ready already consumed round 1 and found nobody.
    let order = await OrderModel.findById(orderId);
    expect(order?.status).toBe(OrderStatus.READY_FOR_PICKUP);
    expect(order?.deliveryAssignmentAttempts).toBe(1);
    expect(await DeliveryAssignmentModel.countDocuments({ orderId })).toBe(0);

    // Every round up to (but not including) the last must leave the order alive and retryable.
    for (let attempt = 2; attempt < env.MAX_DELIVERY_REASSIGN_ATTEMPTS; attempt += 1) {
      const result = await deliveryAssignmentsService.runAssignmentRound(orderId);
      expect(result.cancelled).toBe(false);
      expect(result.attemptNumber).toBe(attempt);
      order = await OrderModel.findById(orderId);
      expect(order?.status).toBe(OrderStatus.READY_FOR_PICKUP);
    }

    const finalRound = await deliveryAssignmentsService.runAssignmentRound(orderId);
    expect(finalRound.attemptNumber).toBe(env.MAX_DELIVERY_REASSIGN_ATTEMPTS);
    expect(finalRound.cancelled).toBe(true);

    order = await OrderModel.findById(orderId);
    // DELIVERY_CANCELLED -> REFUND_PENDING, so the order never rests in a delivery-limbo state.
    expect(order?.status).toBe(OrderStatus.REFUND_PENDING);
    const historyStatuses = order?.statusHistory.map((h) => h.status);
    expect(historyStatuses).toContain(OrderStatus.DELIVERY_CANCELLED);
    expect(historyStatuses).toContain(OrderStatus.REFUND_PENDING);
    expect(order?.statusHistory.at(-1)?.actorRole).toBe('SYSTEM');
    expect(order?.cancellation?.reason).toMatch(/no delivery partner/i);

    const audit = await AuditLogModel.findOne({ action: 'ORDER_AUTO_CANCELLED_NO_DELIVERY_PARTNER', targetId: orderId });
    expect(audit).toBeTruthy();
    expect(audit?.metadata).toMatchObject({ deliveryAssignmentAttempts: env.MAX_DELIVERY_REASSIGN_ATTEMPTS });
  });

  it('is idempotent — a later cron round does not re-cancel or re-refund an already cancelled order', async () => {
    const orderId = await placeReadyOrder();
    for (let attempt = 2; attempt <= env.MAX_DELIVERY_REASSIGN_ATTEMPTS; attempt += 1) {
      await deliveryAssignmentsService.runAssignmentRound(orderId);
    }
    const afterCancel = await OrderModel.findById(orderId);
    const historyLength = afterCancel?.statusHistory.length;

    const repeat = await deliveryAssignmentsService.runAssignmentRound(orderId);
    expect(repeat.cancelled).toBe(false);

    const order = await OrderModel.findById(orderId);
    expect(order?.status).toBe(OrderStatus.REFUND_PENDING);
    expect(order?.statusHistory.length).toBe(historyLength);
    expect(await AuditLogModel.countDocuments({ action: 'ORDER_AUTO_CANCELLED_NO_DELIVERY_PARTNER', targetId: orderId })).toBe(1);
  });

  it('counts one round as one attempt even when several partners are offered', async () => {
    const { user: customer, token: customerToken } = await createTestUser(UserRole.CUSTOMER);
    const { user: restaurantOwner, token: restaurantToken } = await createTestUser(UserRole.RESTAURANT);
    const { restaurant, address } = await seedCheckoutFixture(customer.id, restaurantOwner.id);
    await UserModel.findByIdAndUpdate(restaurantOwner.id, { restaurantId: restaurant._id });

    for (let i = 0; i < 3; i += 1) {
      const { user: partnerUser } = await createTestUser(UserRole.DELIVERY_PARTNER, { mobile: `90000001${i}` });
      const partnerDoc = await DeliveryPartnerModel.create({
        userId: partnerUser.id,
        personalDetails: { name: `Partner ${i}`, mobile: `90000001${i}`, address: 'Somewhere' },
        vehicleDetails: { type: 'BIKE', registrationNumber: `TS01AB000${i}` },
        bankDetails: { accountNumber: '123', ifsc: 'TEST0001', accountHolder: `Partner ${i}` },
        status: 'APPROVED',
        availability: 'AVAILABLE',
      });
      await UserModel.findByIdAndUpdate(partnerUser.id, { deliveryPartnerId: partnerDoc._id });
    }

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'COD' });
    const orderId: string = createRes.body._id ?? createRes.body.id;
    await request(app).post(`/api/v1/orders/${orderId}/restaurant-accept`).set('Authorization', `Bearer ${restaurantToken}`);
    await request(app).post(`/api/v1/orders/${orderId}/mark-preparing`).set('Authorization', `Bearer ${restaurantToken}`);
    await request(app).post(`/api/v1/orders/${orderId}/mark-ready`).set('Authorization', `Bearer ${restaurantToken}`);

    // Three offer documents, but only one retry round consumed.
    expect(await DeliveryAssignmentModel.countDocuments({ orderId })).toBe(3);
    const order = await OrderModel.findById(orderId);
    expect(order?.deliveryAssignmentAttempts).toBe(1);
    expect(order?.status).toBe(OrderStatus.DELIVERY_ASSIGNED);
  });
});
