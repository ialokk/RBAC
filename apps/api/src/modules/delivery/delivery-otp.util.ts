import crypto from 'crypto';
import { hashOtpCode, verifyOtpCode } from '../auth/otp.util';

// Delivery hand-off OTP — shorter than login OTP (4 digits) since it's read aloud by the customer
// to the delivery partner in person; reuses the same bcrypt hash/verify helpers as login OTP.
export const DELIVERY_OTP_LENGTH = 4;

export function generateDeliveryOtpCode(): string {
  const max = 10 ** DELIVERY_OTP_LENGTH;
  return crypto.randomInt(0, max).toString().padStart(DELIVERY_OTP_LENGTH, '0');
}

export { hashOtpCode as hashDeliveryOtpCode, verifyOtpCode as verifyDeliveryOtpCode };
