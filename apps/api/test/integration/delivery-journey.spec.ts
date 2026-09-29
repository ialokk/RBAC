import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@rbac/shared-types';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { createTestUser } from '../utils/auth';
import { seedCheckoutFixture } from '../utils/seed';
import { UserModel } from '../../src/modules/users/user.model';
import { DeliveryPartnerModel } from '../../src/modules/delivery/delivery-partner.model';
import { notificationDispatchService } from '../../src/modules/notifications/notification-dispatch.service';

describe('Delivery journey — offer through hand-off (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  it('offers a ready order to an available partner, who accepts, picks up, verifies OTP, and delivers', async () => {
    const { user: customer, token: customerToken } = await createTestUser(UserRole.CUSTOMER);
    const { user: restaurantOwner, token: restaurantToken } = await createTestUser(UserRole.RESTAURANT);
    const { user: partnerUser, token: partnerToken } = await createTestUser(UserRole.DELIVERY_PARTNER);
    const { restaurant, address } = await seedCheckoutFixture(customer.id, restaurantOwner.id);
    await UserModel.findByIdAndUpdate(restaurantOwner.id, { restaurantId: restaurant._id });

    const partnerDoc = await DeliveryPartnerModel.create({
      userId: partnerUser.id,
      personalDetails: { name: 'Test Partner', mobile: '9000000001', address: 'Somewhere' },
      vehicleDetails: { type: 'BIKE', registrationNumber: 'TS01AB1234' },
      bankDetails: { accountNumber: '123', ifsc: 'TEST0001', accountHolder: 'Test Partner' },
      status: 'APPROVED',
      availability: 'AVAILABLE',
    });
    await UserModel.findByIdAndUpdate(partnerUser.id, { deliveryPartnerId: partnerDoc._id });

    const createRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ addressId: address.id, paymentMethod: 'COD' });
    const orderId: string = createRes.body._id ?? createRes.body.id;

    await request(app).post(`/api/v1/orders/${orderId}/restaurant-accept`).set('Authorization', `Bearer ${restaurantToken}`);
    await request(app).post(`/api/v1/orders/${orderId}/mark-preparing`).set('Authorization', `Bearer ${restaurantToken}`);
    const readyRes = await request(app)
      .post(`/api/v1/orders/${orderId}/mark-ready`)
      .set('Authorization', `Bearer ${restaurantToken}`);
    expect(readyRes.status).toBe(200);

    const availableRes = await request(app)
      .get('/api/v1/delivery/assignments/available')
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(availableRes.body.items).toHaveLength(1);
    const assignmentId = availableRes.body.items[0].id;

    const acceptRes = await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/accept`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(acceptRes.status).toBe(200);

    await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/arrived-restaurant`)
      .set('Authorization', `Bearer ${partnerToken}`);

    const dispatchSpy = jest.spyOn(notificationDispatchService, 'dispatch');
    const pickedUpRes = await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/picked-up`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(pickedUpRes.status).toBe(200);

    const otpCall = dispatchSpy.mock.calls.find((call) => call[0].type === 'DELIVERY_OTP');
    const otpMatch = otpCall?.[0].body.match(/OTP is (\d{4,6})/);
    expect(otpMatch).toBeTruthy();
    const otpCode = otpMatch?.[1] as string;
    dispatchSpy.mockRestore();

    await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/arrived-customer`)
      .set('Authorization', `Bearer ${partnerToken}`);

    const wrongCode = otpCode === '0000' ? '1111' : '0000';
    const wrongOtpRes = await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/verify-otp`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ code: wrongCode });
    expect(wrongOtpRes.status).toBe(400);

    const verifyRes = await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/verify-otp`)
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ code: otpCode });
    expect(verifyRes.status).toBe(200);

    const deliveredRes = await request(app)
      .post(`/api/v1/delivery/assignments/${assignmentId}/mark-delivered`)
      .set('Authorization', `Bearer ${partnerToken}`);
    expect(deliveredRes.status).toBe(200);
    expect(deliveredRes.body.status).toBe('DELIVERED');

    const finalOrder = await request(app).get(`/api/v1/orders/${orderId}`).set('Authorization', `Bearer ${customerToken}`);
    expect(finalOrder.body.status).toBe('DELIVERED');
  });
});
