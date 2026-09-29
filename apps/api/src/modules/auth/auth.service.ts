import type { Request } from 'express';
import { UserRole } from '@rbac/shared-types';
import { HttpError } from '../common/http-error';
import { OtpChallengeModel } from './otp-challenge.model';
import { RefreshTokenModel } from './refresh-token.model';
import { UserModel, type UserHydratedDocument } from '../users/user.model';
import { otpSender } from './otp-sender';
import {
  OTP_MAX_ATTEMPTS,
  generateOtpCode,
  hashOtpCode,
  otpExpiry,
  verifyOtpCode,
} from './otp.util';
import { signAccessToken } from './access-token.util';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
} from './refresh-token.util';

export interface RequestOtpInput {
  target: string;
  channel: 'SMS' | 'EMAIL';
  purpose: 'LOGIN' | 'VERIFY_MOBILE' | 'VERIFY_EMAIL';
}

export interface VerifyOtpInput {
  target: string;
  code: string;
  deviceId: string;
  userAgent?: string;
  ip?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

function toPublicUser(user: UserHydratedDocument) {
  return {
    id: user.id as string,
    role: user.role,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    status: user.status,
  };
}

async function issueTokens(
  user: UserHydratedDocument,
  deviceId: string,
  userAgent?: string,
  ip?: string,
): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id as string, role: user.role, permVersion: user.permVersion });
  const refreshToken = generateRefreshToken();

  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashRefreshToken(refreshToken),
    deviceId,
    userAgent,
    ip,
    expiresAt: refreshTokenExpiry(),
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async requestOtp(input: RequestOtpInput): Promise<void> {
    // Drop any outstanding, unconsumed challenge for the same target/purpose before issuing a new one.
    await OtpChallengeModel.deleteMany({ target: input.target, purpose: input.purpose, consumedAt: null });

    const code = generateOtpCode();
    await OtpChallengeModel.create({
      target: input.target,
      channel: input.channel,
      purpose: input.purpose,
      codeHash: await hashOtpCode(code),
      attempts: 0,
      expiresAt: otpExpiry(),
    });

    await otpSender.send(input.target, input.channel, code);
  },

  async verifyOtp(input: VerifyOtpInput): Promise<{ tokens: AuthTokens; user: ReturnType<typeof toPublicUser> }> {
    const challenge = await OtpChallengeModel.findOne({
      target: input.target,
      purpose: 'LOGIN',
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!challenge) {
      throw new HttpError(400, 'OTP was not requested or has expired');
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpError(429, 'Too many attempts — request a new OTP');
    }

    const isValid = await verifyOtpCode(input.code, challenge.codeHash);
    if (!isValid) {
      challenge.attempts += 1;
      await challenge.save();
      throw new HttpError(400, 'Invalid OTP code');
    }

    challenge.consumedAt = new Date();
    await challenge.save();

    const isMobile = challenge.channel === 'SMS';
    let user = await UserModel.findOne(isMobile ? { mobile: input.target } : { email: input.target });

    if (!user) {
      user = await UserModel.create({
        role: UserRole.CUSTOMER,
        mobile: isMobile ? input.target : undefined,
        email: isMobile ? undefined : input.target,
        mobileVerified: isMobile,
        emailVerified: !isMobile,
        status: 'ACTIVE',
        lastLoginAt: new Date(),
      });
    } else {
      if (isMobile) {
        user.mobileVerified = true;
      } else {
        user.emailVerified = true;
      }
      user.lastLoginAt = new Date();
      await user.save();
    }

    if (user.status !== 'ACTIVE') {
      throw new HttpError(403, 'Account is not active');
    }

    const tokens = await issueTokens(user, input.deviceId, input.userAgent, input.ip);
    return { tokens, user: toPublicUser(user) };
  },

  async refresh(rawRefreshToken: string, req: Request): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await RefreshTokenModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!existing) {
      throw new HttpError(401, 'Invalid or expired refresh token');
    }

    const user = await UserModel.findById(existing.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new HttpError(403, 'Account is not active');
    }

    existing.revokedAt = new Date();
    await existing.save();

    return issueTokens(user, existing.deviceId, req.headers['user-agent'] as string | undefined, req.ip);
  },

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const existing = await RefreshTokenModel.findOne({ tokenHash, userId, revokedAt: null });
    if (existing) {
      existing.revokedAt = new Date();
      await existing.save();
    }
  },

  async listSessions(userId: string) {
    const sessions = await RefreshTokenModel.find(
      { userId, revokedAt: null, expiresAt: { $gt: new Date() } },
      { tokenHash: 0 },
    ).sort({ createdAt: -1 });
    return sessions.map((s) => ({
      id: s.id as string,
      deviceId: s.deviceId,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: (s as unknown as { createdAt: Date }).createdAt,
      expiresAt: s.expiresAt,
    }));
  },

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await RefreshTokenModel.findOne({ _id: sessionId, userId });
    if (!session) {
      throw new HttpError(404, 'Session not found');
    }
    session.revokedAt = new Date();
    await session.save();
  },

  async getMe(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    return toPublicUser(user);
  },
};
