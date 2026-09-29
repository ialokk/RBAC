import { UserRole } from '@rbac/shared-types';

export interface AuthUser {
  id: string;
  role: UserRole;
  name?: string;
  mobile?: string;
  email?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type OtpChannel = 'SMS' | 'EMAIL';

export interface RequestOtpPayload {
  target: string;
  channel: OtpChannel;
  purpose: 'LOGIN';
}

export interface VerifyOtpPayload {
  target: string;
  code: string;
  deviceId: string;
}

export interface VerifyOtpResponse {
  tokens: AuthTokens;
  user: AuthUser;
}
