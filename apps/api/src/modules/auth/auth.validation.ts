import { z } from 'zod';

const mobileRegex = /^\+?[1-9]\d{7,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A single `target` is validated as either a mobile or an email; `channel` disambiguates intent.
export const requestOtpSchema = {
  body: z
    .object({
      target: z.string().min(3).max(254),
      channel: z.enum(['SMS', 'EMAIL']),
      purpose: z.enum(['LOGIN', 'VERIFY_MOBILE', 'VERIFY_EMAIL']).default('LOGIN'),
    })
    .strict()
    .refine(
      (data) => (data.channel === 'SMS' ? mobileRegex.test(data.target) : emailRegex.test(data.target)),
      { message: 'target does not match the selected channel', path: ['target'] },
    ),
};

export const verifyOtpSchema = {
  body: z
    .object({
      target: z.string().min(3).max(254),
      code: z.string().length(6),
      deviceId: z.string().min(1).max(128),
    })
    .strict(),
};

export const refreshSchema = {
  body: z
    .object({
      refreshToken: z.string().min(1),
    })
    .strict(),
};

export const logoutSchema = {
  body: z
    .object({
      refreshToken: z.string().min(1),
    })
    .strict(),
};
