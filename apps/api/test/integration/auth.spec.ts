import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { setupTestDb, teardownTestDb, clearTestDb } from '../utils/db';
import { otpSender } from '../../src/modules/auth/otp-sender';
import { UserModel } from '../../src/modules/users/user.model';

describe('Auth — OTP request/verify (integration)', () => {
  let app: Express;

  beforeAll(async () => {
    await setupTestDb();
    app = createApp();
  });
  afterAll(teardownTestDb);
  afterEach(clearTestDb);

  it('issues an OTP, verifies it, creates a new CUSTOMER, and returns tokens', async () => {
    const sendSpy = jest.spyOn(otpSender, 'send');

    const requestRes = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ target: '+919876543210', channel: 'SMS', purpose: 'LOGIN' });
    expect(requestRes.status).toBe(202);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const code = sendSpy.mock.calls[0][2];

    const verifyRes = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ target: '+919876543210', code, deviceId: 'device-1' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.tokens.accessToken).toBeTruthy();
    expect(verifyRes.body.tokens.refreshToken).toBeTruthy();
    expect(verifyRes.body.user.role).toBe('CUSTOMER');

    const created = await UserModel.findOne({ mobile: '+919876543210' });
    expect(created).not.toBeNull();

    sendSpy.mockRestore();
  });

  it('rejects an incorrect OTP code', async () => {
    const sendSpy = jest.spyOn(otpSender, 'send');
    await request(app).post('/api/v1/auth/otp/request').send({ target: '+919876500000', channel: 'SMS', purpose: 'LOGIN' });
    sendSpy.mockRestore();

    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ target: '+919876500000', code: '000000', deviceId: 'device-2' });
    expect(res.status).toBe(400);
  });

  it('rejects verification when no OTP was ever requested for the target', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ target: '+919000000000', code: '123456', deviceId: 'device-3' });
    expect(res.status).toBe(400);
  });

  it('rejects a request body with an extra/unexpected field (strict validation)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ target: '+919876500001', channel: 'SMS', purpose: 'LOGIN', role: 'ADMIN' });
    expect(res.status).toBe(400);
  });
});
