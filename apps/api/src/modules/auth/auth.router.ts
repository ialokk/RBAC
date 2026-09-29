import { Router } from 'express';
import { authenticate } from '../common/authenticate.middleware';
import { otpRequestLimiter, otpVerifyLimiter } from '../common/rate-limit';
import { validate } from '../common/validate.middleware';
import { authController } from './auth.controller';
import { logoutSchema, refreshSchema, requestOtpSchema, verifyOtpSchema } from './auth.validation';

export const authRouter = Router();

/**
 * @openapi
 * /auth/otp/request:
 *   post:
 *     summary: Request a mobile or email OTP
 *     responses:
 *       202:
 *         description: OTP queued for delivery
 */
authRouter.post('/otp/request', otpRequestLimiter, validate(requestOtpSchema), authController.requestOtp);

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     summary: Verify an OTP and receive access/refresh tokens
 *     responses:
 *       200:
 *         description: Tokens issued
 */
authRouter.post('/otp/verify', otpVerifyLimiter, validate(verifyOtpSchema), authController.verifyOtp);

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate a refresh token for a new access/refresh token pair
 *     responses:
 *       200:
 *         description: New tokens issued
 */
authRouter.post('/refresh', validate(refreshSchema), authController.refresh);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Revoke the current session's refresh token
 *     responses:
 *       204:
 *         description: Session revoked
 */
authRouter.post('/logout', authenticate, validate(logoutSchema), authController.logout);

/**
 * @openapi
 * /auth/sessions:
 *   get:
 *     summary: List active sessions/devices for the current user
 *     responses:
 *       200:
 *         description: Session list
 */
authRouter.get('/sessions', authenticate, authController.listSessions);

/**
 * @openapi
 * /auth/sessions/{id}:
 *   delete:
 *     summary: Revoke a specific session
 *     responses:
 *       204:
 *         description: Session revoked
 */
authRouter.delete('/sessions/:id', authenticate, authController.revokeSession);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Current user profile, role and status
 *     responses:
 *       200:
 *         description: Current user
 */
authRouter.get('/me', authenticate, authController.getMe);
