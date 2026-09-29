import request from 'supertest';
import type { Express } from 'express';
import { UserRole } from '@rbac/shared-types';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { createTestUser } from '../utils/auth';

describe('Authorization — role/permission gates (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  it('rejects unauthenticated requests to a protected route', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });

  it('rejects a request with no Authorization header on an admin route', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard');
    expect(res.status).toBe(401);
  });

  it.each([UserRole.CUSTOMER, UserRole.RESTAURANT, UserRole.DELIVERY_PARTNER])(
    '%s cannot reach admin-only routes (403)',
    async (role) => {
      const { token } = await createTestUser(role);

      const dashboard = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
      expect(dashboard.status).toBe(403);

      const users = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
      expect(users.status).toBe(403);

      const auditLogs = await request(app).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${token}`);
      expect(auditLogs.status).toBe(403);
    },
  );

  it('lets an ADMIN reach the dashboard, user list, and audit logs', async () => {
    const { token } = await createTestUser(UserRole.ADMIN);

    const dashboard = await request(app).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${token}`);
    expect(dashboard.status).toBe(200);
    expect(dashboard.body).toHaveProperty('customers');

    const users = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${token}`);
    expect(users.status).toBe(200);
    expect(users.body).toHaveProperty('items');

    const auditLogs = await request(app).get('/api/v1/admin/audit-logs').set('Authorization', `Bearer ${token}`);
    expect(auditLogs.status).toBe(200);
  });

  it('rejects a payment refund attempt from a non-ADMIN role', async () => {
    const { token } = await createTestUser(UserRole.CUSTOMER);
    const res = await request(app)
      .post('/api/v1/payments/000000000000000000000000/refund')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'test' });
    expect(res.status).toBe(403);
  });

  it('rejects a suspended account even with a still-valid JWT', async () => {
    const { user, token } = await createTestUser(UserRole.CUSTOMER);
    user.status = 'SUSPENDED';
    await user.save();

    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
