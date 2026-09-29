import crypto from 'crypto';

// Refresh tokens are opaque, high-entropy random values — hashed with SHA-256 (not bcrypt; no need
// for a slow KDF on already-high-entropy secrets) before being persisted. See docs/SECURITY.md §2.
export const REFRESH_TOKEN_TTL_DAYS = 30;

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
