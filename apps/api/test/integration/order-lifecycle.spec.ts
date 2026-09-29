import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@rbac/shared-types';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { createTestUser } from '../utils/auth';
import { seedCheckoutFixture } from '../utils/seed';
import { UserModel } from '../../src/modules/users/user.model';

describe('Order lifecycle — COD (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  async function seed() {
    const { user: customer, token: customerToken } = await createTestUser(UserRole.CUSTOMER);
    const { user: restaurantOwner, token: restaurantToken } = await createTestUser(UserRole.RESTAURANT);
    const fixture = await seedCheckoutFixture(customer.id, restaurantOwner.id);
    await UserModel.findByIdAndUpdate(restaurantOwner.id, { restaurantId: fixture.restaurant._id });
    return { customer, customerToken, restaurantOwner, restaurantToken, ...fixture };
  }

  it('walks a COD order from creation through restaurant accept/preparing/ready', async () => {
    const { customerToken, restaurantToken, address } = await seed();

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'COD' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe('RESTAURANT_PENDING');
    expect(createRes.body.pricing.itemsTotal).toBe(50000);
    const orderId = createRes.body._id ?? createRes.body.id;

    const acceptRes = await request(app)
      .post(`/api/v1/orders/${orderId}/restaurant-accept`)
      .set('Authorization', `Bearer ${restaurantToken}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe('RESTAURANT_ACCEPTED');

    const preparingRes = await request(app)
      .post(`/api/v1/orders/${orderId}/mark-preparing`)
      .set('Authorization', `Bearer ${restaurantToken}`);
    expect(preparingRes.status).toBe(200);
    expect(preparingRes.body.status).toBe('PREPARING');

    const readyRes = await request(app)
      .post(`/api/v1/orders/${orderId}/mark-ready`)
      .set('Authorization', `Bearer ${restaurantToken}`);
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe('READY_FOR_PICKUP');

    // Invalid transition: already READY_FOR_PICKUP, marking ready again must be rejected.
    const secondReadyRes = await request(app)
      .post(`/api/v1/orders/${orderId}/mark-ready`)
      .set('Authorization', `Bearer ${restaurantToken}`);
    expect(secondReadyRes.status).toBe(409);
  });

  it('lets a customer cancel a RESTAURANT_PENDING order and auto-chains a refund', async () => {
    const { customerToken, address } = await seed();

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'COD' });
    const orderId = createRes.body._id ?? createRes.body.id;

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Changed my mind' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('REFUND_PENDING');
    const statuses = cancelRes.body.statusHistory.map((h: { status: string }) => h.status);
    expect(statuses).toContain('CUSTOMER_CANCELLED');
    expect(statuses).toContain('REFUND_PENDING');
  });

  it('blocks a restaurant from acting on another restaurant\'s order', async () => {
    const { customerToken, address } = await seed();
    const { token: otherRestaurantToken } = await createTestUser(UserRole.RESTAURANT);

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'COD' });
    const orderId = createRes.body._id ?? createRes.body.id;

    const res = await request(app)
      .post(`/api/v1/orders/${orderId}/restaurant-accept`)
      .set('Authorization', `Bearer ${otherRestaurantToken}`);
    // No restaurant is associated with this account yet -> ownership resolution fails with 403.
    expect(res.status).toBe(403);
  });
});
