import rateLimit from 'express-rate-limit';

// In-memory, single-instance rate limiting (Version 1 — no Redis). See docs/SECURITY.md §6.
export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many OTP requests, please try again later' },
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many OTP verification attempts, please try again later' },
});

// Applied to every request (docs/SECURITY.md §6: "Global request throttling") — generous enough
// to not affect normal usage, just a backstop against abuse/scraping on a single instance.
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many requests, please try again later' },
});

export const orderCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many orders placed, please try again later' },
});

export const paymentInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Too many payment attempts, please try again later' },
});
